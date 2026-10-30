import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from datetime import datetime

from ..database import get_db
from ..models import Material, PriceHistory, Supplier
from ..schemas import MaterialCreate, MaterialUpdate, MaterialOut

router = APIRouter(prefix="/materials", tags=["Materials"])

@router.get("", response_model=List[MaterialOut])
def get_materials(
    search: Optional[str] = None,
    category: Optional[str] = None,
    supplier_id: Optional[int] = None,
    validation_status: Optional[str] = None,
    include_archived: bool = False,
    sort_by: str = "name",
    sort_order: str = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(Material)

    if not include_archived:
        query = query.filter(Material.is_archived == False)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Material.name.ilike(search_filter),
                Material.material_type.ilike(search_filter),
                Material.grade.ilike(search_filter),
                Material.color.ilike(search_filter)
            )
        )

    if category and category != "All":
        query = query.filter(Material.category == category)

    if supplier_id:
        query = query.filter(Material.supplier_id == supplier_id)

    if validation_status and validation_status != "All":
        query = query.filter(Material.validation_status == validation_status)

    # Sort
    sort_column = getattr(Material, sort_by, Material.name)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    materials = query.all()
    results = []
    for m in materials:
        m_dict = MaterialOut.model_validate(m)
        if m.supplier:
            m_dict.supplier_name = m.supplier.name
        results.append(m_dict)

    return results


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = [
        "Upper - Natural",
        "Upper - Synthetic",
        "Lining - Textile",
        "Lining - Leather",
        "Insole - Board / Foam",
        "Outsole - Rubber / TPU",
        "Midsole - EVA / PU",
        "Adhesives & Accessories"
    ]
    counts = {}
    for cat in categories:
        cnt = db.query(Material).filter(Material.category == cat, Material.is_archived == False).count()
        counts[cat] = cnt
    return {"categories": categories, "counts": counts}


@router.get("/{id}", response_model=MaterialOut)
def get_material(id: int, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    out = MaterialOut.model_validate(material)
    if material.supplier:
        out.supplier_name = material.supplier.name
    return out


@router.post("", response_model=MaterialOut)
def create_material(data: MaterialCreate, db: Session = Depends(get_db)):
    mat_dict = data.model_dump(exclude={"changed_by", "change_reason"})
    if not mat_dict.get("effective_date"):
        mat_dict["effective_date"] = datetime.now().strftime("%Y-%m-%d")
    if not mat_dict.get("material_type"):
        mat_dict["material_type"] = "Standard"

    material = Material(**mat_dict)
    db.add(material)
    db.flush()

    # If best alternative is provided, also create the alternative material record and link both
    if data.alternative_name and not data.alternative_id:
        alt_category = data.category
        if "Upper - Natural" in data.category:
            alt_category = "Upper - Synthetic"
        elif "Lining - Leather" in data.category:
            alt_category = "Lining - Textile"

        alt_price = data.alternative_price if data.alternative_price is not None else round(data.price_per_unit * 0.65, 2)
        alt_notes = data.alternative_properties or f"Alternative specification for {data.name}"
        alt_thickness = data.alternative_thickness_mm if data.alternative_thickness_mm is not None else data.thickness_mm
        alt_mat = Material(
            name=data.alternative_name,
            category=alt_category,
            material_type=f"Alternative Specification for {data.name}",
            grade=data.grade or "Standard",
            thickness_mm=alt_thickness,
            purchase_unit=data.purchase_unit,
            costing_unit=data.costing_unit,
            price_per_unit=alt_price,
            currency=data.currency or "INR",
            price_basis=data.price_basis or "Ex-Factory",
            effective_date=mat_dict["effective_date"],
            notes=alt_notes,
            alternative_name=data.name,
            alternative_price=data.price_per_unit,
            alternative_properties=data.notes,
            alternative_thickness_mm=data.thickness_mm,
            alternative_id=material.id,
            moq=data.moq,
            lead_time_days=data.lead_time_days,
            validation_status="User Entered"
        )
        db.add(alt_mat)
        db.flush()
        material.alternative_id = alt_mat.id

    # Add initial price history
    history = PriceHistory(
        material_id=material.id,
        price_per_unit=material.price_per_unit,
        currency=material.currency,
        price_basis=material.price_basis,
        effective_date=material.effective_date,
        changed_by=data.changed_by or "User Entry",
        reason=data.change_reason or "Initial Record Creation"
    )
    db.add(history)
    db.commit()
    db.refresh(material)

    out = MaterialOut.model_validate(material)
    if material.supplier:
        out.supplier_name = material.supplier.name
    return out


@router.put("/{id}", response_model=MaterialOut)
def update_material(id: int, data: MaterialUpdate, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    old_price = material.price_per_unit
    update_data = data.model_dump(exclude_unset=True, exclude={"changed_by", "change_reason"})

    for key, value in update_data.items():
        setattr(material, key, value)

    # Check if price changed to record audit history
    if "price_per_unit" in update_data and update_data["price_per_unit"] != old_price:
        history = PriceHistory(
            material_id=material.id,
            price_per_unit=material.price_per_unit,
            currency=material.currency,
            price_basis=material.price_basis,
            effective_date=material.effective_date or datetime.utcnow().strftime("%Y-%m-%d"),
            changed_by=data.changed_by or "System User",
            reason=data.change_reason or f"Price updated from ${old_price:.2f} to ${material.price_per_unit:.2f}"
        )
        db.add(history)

    db.commit()
    db.refresh(material)
    out = MaterialOut.model_validate(material)
    if material.supplier:
        out.supplier_name = material.supplier.name
    return out


@router.delete("/{id}")
def delete_material(id: int, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check if used in active BOM
    if material.product_materials and len(material.product_materials) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: Material is actively assigned to {len(material.product_materials)} product Bill of Materials components. Archive it instead or remove from products first."
        )

    db.delete(material)
    db.commit()
    return {"status": "success", "message": f"Material '{material.name}' deleted successfully"}


@router.post("/{id}/archive")
def toggle_archive(id: int, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    material.is_archived = not material.is_archived
    db.commit()
    return {"status": "success", "is_archived": material.is_archived}


@router.get("/export/csv")
def export_materials_csv(db: Session = Depends(get_db)):
    materials = db.query(Material).filter(Material.is_archived == False).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    headers = [
        "ID", "Name", "Category", "Material Type", "Grade", "Supplier",
        "Thickness (mm)", "Tensile Strength (MPa)", "Bally Flex Cycles",
        "Purchase Unit", "Price Per Unit", "Currency", "Price Basis",
        "Effective Date", "MOQ", "Lead Time (days)", "Validation Status"
    ]
    writer.writerow(headers)

    for m in materials:
        writer.writerow([
            m.id,
            m.name,
            m.category,
            m.material_type,
            m.grade,
            m.supplier.name if m.supplier else "N/A",
            m.thickness_mm or "",
            m.tensile_strength_mpa or "",
            m.bally_flex_cycles or "",
            m.purchase_unit,
            m.price_per_unit,
            m.currency,
            m.price_basis,
            m.effective_date,
            m.moq,
            m.lead_time_days,
            m.validation_status
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=materials_catalogue.csv"}
    )


@router.post("/import/csv")
async def import_materials_csv(file: UploadFile = File(...), commit: bool = Query(False), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except Exception:
        decoded = content.decode("latin-1")
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    valid_rows = []
    errors = []
    row_idx = 1

    for row in reader:
        row_idx += 1
        name = row.get("Name") or row.get("name")
        category = row.get("Category") or row.get("category")
        mat_type = row.get("Material Type") or row.get("material_type") or "Standard"
        price_str = row.get("Price Per Unit") or row.get("price_per_unit") or "0"
        unit = row.get("Purchase Unit") or row.get("purchase_unit") or "sq.ft"

        if not name:
            errors.append(f"Row {row_idx}: 'Name' is missing")
            continue
        if not category:
            errors.append(f"Row {row_idx}: 'Category' is missing for '{name}'")
            continue

        try:
            price = float(price_str)
            if price <= 0:
                errors.append(f"Row {row_idx}: Price must be positive for '{name}'")
                continue
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid price format '{price_str}' for '{name}'")
            continue

        mat_obj = {
            "name": name.strip(),
            "category": category.strip(),
            "material_type": mat_type.strip(),
            "grade": row.get("Grade", "Standard").strip(),
            "purchase_unit": unit.strip(),
            "costing_unit": unit.strip(),
            "price_per_unit": price,
            "currency": row.get("Currency", "USD").strip(),
            "price_basis": row.get("Price Basis", "FOB").strip(),
            "effective_date": row.get("Effective Date", datetime.utcnow().strftime("%Y-%m-%d")).strip(),
            "validation_status": row.get("Validation Status", "User Entered").strip()
        }

        # Optional numbers
        for num_key, target_key in [
            ("Thickness (mm)", "thickness_mm"),
            ("Tensile Strength (MPa)", "tensile_strength_mpa"),
            ("Bally Flex Cycles", "bally_flex_cycles"),
            ("MOQ", "moq"),
            ("Lead Time (days)", "lead_time_days")
        ]:
            val = row.get(num_key)
            if val and val.strip():
                try:
                    mat_obj[target_key] = float(val.strip()) if target_key != "bally_flex_cycles" and target_key != "lead_time_days" else int(float(val.strip()))
                except ValueError:
                    pass

        valid_rows.append(mat_obj)

    if commit and len(errors) == 0:
        created_count = 0
        for item in valid_rows:
            m = Material(**item)
            db.add(m)
            created_count += 1
        db.commit()
        return {
            "status": "committed",
            "imported_count": created_count,
            "errors": []
        }

    return {
        "status": "validated",
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "errors": errors,
        "sample_preview": valid_rows[:5]
    }
