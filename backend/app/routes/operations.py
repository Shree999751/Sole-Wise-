from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import ConstructionOperation
from ..schemas import OperationCreate, OperationUpdate, OperationOut
from ..calculations import calculate_operation_cost

router = APIRouter(prefix="/operations", tags=["Operations"])

@router.get("", response_model=List[OperationOut])
def get_operations(product_id: Optional[int] = None, scenario: str = "Baseline", db: Session = Depends(get_db)):
    query = db.query(ConstructionOperation)
    if product_id is not None:
        query = query.filter(ConstructionOperation.product_id == product_id)
    if scenario:
        query = query.filter(ConstructionOperation.scenario == scenario)
    
    return query.order_by(ConstructionOperation.sequence_number).all()


@router.post("", response_model=OperationOut)
def create_operation(data: OperationCreate, db: Session = Depends(get_db)):
    cost_calc = calculate_operation_cost(
        data.operation_time_sam,
        data.labour_rate_per_hour,
        data.machine_rate_per_hour
    )

    op = ConstructionOperation(
        product_id=data.product_id,
        sequence_number=data.sequence_number,
        department=data.department,
        operation_title=data.operation_title,
        grade=data.grade,
        machine=data.machine,
        operation_time_sam=data.operation_time_sam,
        labour_rate_per_hour=data.labour_rate_per_hour,
        machine_rate_per_hour=data.machine_rate_per_hour,
        calculated_labour_cost=cost_calc["labour_cost"],
        calculated_machine_cost=cost_calc["machine_cost"],
        calculated_cost=cost_calc["total_cost"],
        scenario=data.scenario or "Baseline"
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return OperationOut.model_validate(op)


@router.put("/{id}", response_model=OperationOut)
def update_operation(id: int, data: OperationUpdate, db: Session = Depends(get_db)):
    op = db.query(ConstructionOperation).filter(ConstructionOperation.id == id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(op, k, v)

    # Recalculate costs
    cost_calc = calculate_operation_cost(
        op.operation_time_sam,
        op.labour_rate_per_hour,
        op.machine_rate_per_hour
    )
    op.calculated_labour_cost = cost_calc["labour_cost"]
    op.calculated_machine_cost = cost_calc["machine_cost"]
    op.calculated_cost = cost_calc["total_cost"]

    db.commit()
    db.refresh(op)
    return OperationOut.model_validate(op)


@router.delete("/{id}")
def delete_operation(id: int, db: Session = Depends(get_db)):
    op = db.query(ConstructionOperation).filter(ConstructionOperation.id == id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    pid = op.product_id
    seq = op.sequence_number
    db.delete(op)
    
    # Re-normalize remaining sequence numbers
    remaining = db.query(ConstructionOperation).filter(
        ConstructionOperation.product_id == pid,
        ConstructionOperation.sequence_number > seq
    ).all()
    for item in remaining:
        item.sequence_number -= 1

    db.commit()
    return {"status": "success", "message": "Operation deleted"}


@router.post("/{id}/duplicate", response_model=OperationOut)
def duplicate_operation(id: int, db: Session = Depends(get_db)):
    orig = db.query(ConstructionOperation).filter(ConstructionOperation.id == id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Operation not found")

    # Shift higher sequences up by 1
    db.query(ConstructionOperation).filter(
        ConstructionOperation.product_id == orig.product_id,
        ConstructionOperation.sequence_number > orig.sequence_number
    ).update({ConstructionOperation.sequence_number: ConstructionOperation.sequence_number + 1})

    cloned = ConstructionOperation(
        product_id=orig.product_id,
        sequence_number=orig.sequence_number + 1,
        department=orig.department,
        operation_title=f"{orig.operation_title} (Copy)",
        grade=orig.grade,
        machine=orig.machine,
        operation_time_sam=orig.operation_time_sam,
        labour_rate_per_hour=orig.labour_rate_per_hour,
        machine_rate_per_hour=orig.machine_rate_per_hour,
        calculated_labour_cost=orig.calculated_labour_cost,
        calculated_machine_cost=orig.calculated_machine_cost,
        calculated_cost=orig.calculated_cost,
        scenario=orig.scenario
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return OperationOut.model_validate(cloned)


@router.post("/reorder")
def reorder_operations(items: List[dict], db: Session = Depends(get_db)):
    """
    Expects list of { id: int, sequence_number: int }
    """
    for itm in items:
        op = db.query(ConstructionOperation).filter(ConstructionOperation.id == itm["id"]).first()
        if op:
            op.sequence_number = itm["sequence_number"]
    db.commit()
    return {"status": "success"}
