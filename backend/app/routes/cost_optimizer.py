from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, ProductMaterial, ConstructionOperation, AppSetting
from ..calculations import calculate_footwear_cost_sheet, calculate_component_cost

router = APIRouter(prefix="/cost-optimizer", tags=["Cost Optimizer"])

@router.get("/{product_id}")
def get_product_cost_breakdown(
    product_id: int,
    scenario: str = "Baseline",
    overhead_pct: Optional[float] = None,
    tooling_cost: Optional[float] = None,
    packaging_cost: Optional[float] = None,
    qc_cost: Optional[float] = None,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get settings defaults if not overridden
    def_overhead = 10.0
    def_tooling = 1.50
    def_packaging = 1.20
    def_qc = 0.60

    st_overhead = db.query(AppSetting).filter(AppSetting.key == "factory_overhead_rate_pct").first()
    if st_overhead: def_overhead = float(st_overhead.value)

    st_tooling = db.query(AppSetting).filter(AppSetting.key == "default_tooling_amortization").first()
    if st_tooling: def_tooling = float(st_tooling.value)

    st_packaging = db.query(AppSetting).filter(AppSetting.key == "default_packaging_cost").first()
    if st_packaging: def_packaging = float(st_packaging.value)

    st_qc = db.query(AppSetting).filter(AppSetting.key == "default_qc_inspection_cost").first()
    if st_qc: def_qc = float(st_qc.value)

    ov_pct = overhead_pct if overhead_pct is not None else def_overhead
    t_cost = tooling_cost if tooling_cost is not None else def_tooling
    p_cost = packaging_cost if packaging_cost is not None else def_packaging
    q_cost = qc_cost if qc_cost is not None else def_qc

    # Load BOM components
    bom_items = db.query(ProductMaterial).filter(
        ProductMaterial.product_id == product_id,
        ProductMaterial.scenario == scenario
    ).all()

    # Load Operations
    ops = db.query(ConstructionOperation).filter(
        ConstructionOperation.product_id == product_id,
        ConstructionOperation.scenario == scenario
    ).order_by(ConstructionOperation.sequence_number).all()

    bom_dicts = [{
        "component_name": b.component_name,
        "category": b.category,
        "consumption_per_pair": b.consumption_per_pair,
        "purchase_unit": b.purchase_unit,
        "unit_price": b.unit_price,
        "wastage_percentage": b.wastage_percentage,
        "extended_cost": b.extended_cost,
        "material_name": b.material.name if b.material else None
    } for b in bom_items]

    op_dicts = [{
        "operation_title": o.operation_title,
        "department": o.department,
        "grade": o.grade,
        "machine": o.machine,
        "operation_time_sam": o.operation_time_sam,
        "labour_rate_per_hour": o.labour_rate_per_hour,
        "machine_rate_per_hour": o.machine_rate_per_hour,
        "calculated_labour_cost": o.calculated_labour_cost,
        "calculated_machine_cost": o.calculated_machine_cost,
        "calculated_cost": o.calculated_cost
    } for o in ops]

    sheet = calculate_footwear_cost_sheet(
        material_components=bom_dicts,
        operations=op_dicts,
        overhead_percentage=ov_pct,
        tooling_cost_per_pair=t_cost,
        packaging_cost_per_pair=p_cost,
        qc_cost_per_pair=q_cost,
        batch_size=product.batch_size
    )

    # Variance against target cost
    target_cost = product.target_cost
    variance_per_pair = round(target_cost - sheet["total_cost_per_pair"], 4)
    variance_status = "Under Budget" if variance_per_pair >= 0 else "Over Budget"
    batch_variance = round(variance_per_pair * product.batch_size, 2)

    return {
        "product": {
            "id": product.id,
            "style_number": product.style_number,
            "name": product.name,
            "category": product.category,
            "target_cost": target_cost,
            "batch_size": product.batch_size,
            "currency": product.currency
        },
        "scenario": scenario,
        "cost_sheet": sheet,
        "variance_analysis": {
            "target_cost": target_cost,
            "actual_calculated_cost": sheet["total_cost_per_pair"],
            "variance_per_pair": variance_per_pair,
            "batch_variance": batch_variance,
            "variance_status": variance_status,
            "variance_percentage": round((abs(variance_per_pair) / target_cost * 100.0) if target_cost > 0 else 0.0, 1)
        },
        "bom_items": bom_dicts,
        "operations": op_dicts,
        "parameters": {
            "overhead_percentage": ov_pct,
            "tooling_cost_per_pair": t_cost,
            "packaging_cost_per_pair": p_cost,
            "qc_cost_per_pair": q_cost
        }
    }


@router.post("/simulate")
def simulate_cost_scenario(sim_data: dict, db: Session = Depends(get_db)):
    """
    On-the-fly 'what-if' simulation without altering saved records.
    Receives material components list and operations list with adjusted wastage or rates.
    """
    materials = sim_data.get("materials", [])
    operations = sim_data.get("operations", [])
    overhead_pct = float(sim_data.get("overhead_percentage", 10.0))
    tooling = float(sim_data.get("tooling_cost_per_pair", 1.50))
    packaging = float(sim_data.get("packaging_cost_per_pair", 1.20))
    qc = float(sim_data.get("qc_cost_per_pair", 0.60))
    batch_size = int(sim_data.get("batch_size", 1000))
    baseline_cost = float(sim_data.get("baseline_cost_per_pair", 0.0))

    sheet = calculate_footwear_cost_sheet(
        material_components=materials,
        operations=operations,
        overhead_percentage=overhead_pct,
        tooling_cost_per_pair=tooling,
        packaging_cost_per_pair=packaging,
        qc_cost_per_pair=qc,
        batch_size=batch_size
    )

    diff = round(baseline_cost - sheet["total_cost_per_pair"], 4) if baseline_cost > 0 else 0.0
    pct = round(((diff / baseline_cost) * 100.0) if baseline_cost > 0 else 0.0, 2)
    batch_savings = round(diff * batch_size, 2)

    return {
        "simulation_result": sheet,
        "comparison_with_baseline": {
            "baseline_cost_per_pair": baseline_cost,
            "simulated_cost_per_pair": sheet["total_cost_per_pair"],
            "savings_per_pair": diff,
            "savings_percentage": pct,
            "batch_savings": batch_savings
        }
    }
