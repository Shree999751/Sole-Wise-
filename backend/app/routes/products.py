from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, ProductMaterial, Material, ConstructionOperation, CostingScenario
from ..schemas import (
    ProductCreate, ProductUpdate, ProductOut,
    ProductMaterialCreate, ProductMaterialUpdate, ProductMaterialOut,
    CostingScenarioOut
)
from ..calculations import calculate_component_cost, calculate_footwear_cost_sheet

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.name).all()
    results = []
    for p in products:
        p_dict = ProductOut.model_validate(p)
        # enrich material names
        for m_item in p_dict.materials:
            if m_item.material_id:
                mat = db.query(Material).filter(Material.id == m_item.material_id).first()
                if mat:
                    m_item.material_name = mat.name
        results.append(p_dict)
    return results


@router.get("/{id}", response_model=ProductOut)
def get_product(id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    out = ProductOut.model_validate(product)
    for m_item in out.materials:
        if m_item.material_id:
            mat = db.query(Material).filter(Material.id == m_item.material_id).first()
            if mat:
                m_item.material_name = mat.name
    return out


@router.post("", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    # Check style number uniqueness
    existing = db.query(Product).filter(Product.style_number == data.style_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product style number '{data.style_number}' already exists.")

    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)


@router.put("/{id}", response_model=ProductOut)
def update_product(id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_dict = data.model_dump(exclude_unset=True)
    if "style_number" in update_dict and update_dict["style_number"] != product.style_number:
        existing = db.query(Product).filter(Product.style_number == update_dict["style_number"]).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Style number '{update_dict['style_number']}' already in use.")

    for k, v in update_dict.items():
        setattr(product, k, v)

    db.commit()
    db.refresh(product)
    return get_product(id, db)


@router.delete("/{id}")
def delete_product(id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"status": "success", "message": f"Product '{product.name}' deleted"}


# ----------------- BOM ITEMS -----------------

@router.post("/{id}/bom", response_model=ProductMaterialOut)
def add_bom_item(id: int, data: ProductMaterialCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ext_cost = calculate_component_cost(
        data.consumption_per_pair,
        data.wastage_percentage,
        data.unit_price,
        data.conversion_factor
    )

    bom_item = ProductMaterial(
        product_id=id,
        component_name=data.component_name,
        category=data.category,
        material_id=data.material_id,
        consumption_per_pair=data.consumption_per_pair,
        purchase_unit=data.purchase_unit,
        costing_unit=data.costing_unit,
        conversion_factor=data.conversion_factor,
        wastage_percentage=data.wastage_percentage,
        unit_price=data.unit_price,
        extended_cost=ext_cost,
        scenario=data.scenario or "Baseline",
        notes=data.notes
    )
    db.add(bom_item)
    db.commit()
    db.refresh(bom_item)

    out = ProductMaterialOut.model_validate(bom_item)
    if bom_item.material:
        out.material_name = bom_item.material.name
    return out


@router.put("/{id}/bom/{bom_id}", response_model=ProductMaterialOut)
def update_bom_item(id: int, bom_id: int, data: ProductMaterialUpdate, db: Session = Depends(get_db)):
    bom_item = db.query(ProductMaterial).filter(
        ProductMaterial.id == bom_id,
        ProductMaterial.product_id == id
    ).first()
    if not bom_item:
        raise HTTPException(status_code=404, detail="BOM item not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(bom_item, k, v)

    # Recalculate extended cost
    bom_item.extended_cost = calculate_component_cost(
        bom_item.consumption_per_pair,
        bom_item.wastage_percentage,
        bom_item.unit_price,
        bom_item.conversion_factor
    )

    db.commit()
    db.refresh(bom_item)

    out = ProductMaterialOut.model_validate(bom_item)
    if bom_item.material:
        out.material_name = bom_item.material.name
    return out


@router.delete("/{id}/bom/{bom_id}")
def delete_bom_item(id: int, bom_id: int, db: Session = Depends(get_db)):
    bom_item = db.query(ProductMaterial).filter(
        ProductMaterial.id == bom_id,
        ProductMaterial.product_id == id
    ).first()
    if not bom_item:
        raise HTTPException(status_code=404, detail="BOM item not found")

    db.delete(bom_item)
    db.commit()
    return {"status": "success", "message": "BOM component removed"}


# ----------------- SCENARIOS -----------------

@router.post("/{id}/scenarios", response_model=CostingScenarioOut)
def save_costing_scenario(id: int, scenario_data: dict, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    name = scenario_data.get("name", "Optimized Scenario")
    description = scenario_data.get("description", "")
    mat_cost = float(scenario_data.get("material_cost_per_pair", 0.0))
    lab_cost = float(scenario_data.get("labour_cost_per_pair", 0.0))
    mac_cost = float(scenario_data.get("machine_cost_per_pair", 0.0))
    overhead_cost = float(scenario_data.get("overhead_cost_per_pair", 0.0))
    total_cost = float(scenario_data.get("total_cost_per_pair", 0.0))
    baseline_cost = float(scenario_data.get("baseline_cost_per_pair", 0.0))
    savings_per_pair = round(baseline_cost - total_cost, 4)
    savings_pct = round(((savings_per_pair / baseline_cost) * 100.0) if baseline_cost > 0 else 0.0, 2)
    batch_savings = round(savings_per_pair * product.batch_size, 2)

    scenario = CostingScenario(
        product_id=id,
        name=name,
        description=description,
        material_cost_per_pair=mat_cost,
        labour_cost_per_pair=lab_cost,
        machine_cost_per_pair=mac_cost,
        overhead_cost_per_pair=overhead_cost,
        total_cost_per_pair=total_cost,
        baseline_cost_per_pair=baseline_cost,
        savings_per_pair=savings_per_pair,
        savings_percentage=savings_pct,
        batch_savings=batch_savings
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return CostingScenarioOut.model_validate(scenario)
