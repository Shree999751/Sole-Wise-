from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Supplier, SupplierQuotation, Material
from ..schemas import (
    SupplierCreate, SupplierUpdate, SupplierOut,
    SupplierQuotationCreate, SupplierQuotationOut
)

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierOut])
def get_suppliers(search: Optional[str] = None, country: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Supplier)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Supplier.name.ilike(search_filter) | Supplier.contact_person.ilike(search_filter))
    if country and country != "All":
        query = query.filter(Supplier.country == country)
    
    return query.order_by(Supplier.name).all()


@router.get("/{id}", response_model=SupplierOut)
def get_supplier(id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return SupplierOut.model_validate(supplier)


@router.post("", response_model=SupplierOut)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return SupplierOut.model_validate(supplier)


@router.put("/{id}", response_model=SupplierOut)
def update_supplier(id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(supplier, k, v)

    db.commit()
    db.refresh(supplier)
    return SupplierOut.model_validate(supplier)


@router.delete("/{id}")
def delete_supplier(id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # If has linked materials, unlink them
    for m in supplier.materials:
        m.supplier_id = None

    db.delete(supplier)
    db.commit()
    return {"status": "success", "message": f"Supplier '{supplier.name}' deleted"}


@router.post("/{id}/quotations", response_model=SupplierQuotationOut)
def add_quotation(id: int, data: SupplierQuotationCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    material = db.query(Material).filter(Material.id == data.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    quote = SupplierQuotation(**data.model_dump())
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return SupplierQuotationOut.model_validate(quote)
