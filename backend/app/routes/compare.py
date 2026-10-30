from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Material
from ..schemas import CompareRequest
from ..calculations import normalize_material_units

router = APIRouter(prefix="/compare", tags=["Compare"])

@router.post("")
def compare_materials(req: CompareRequest, db: Session = Depends(get_db)):
    if len(req.material_ids) < 2:
        raise HTTPException(status_code=400, detail="Please select at least 2 materials to compare.")

    materials = db.query(Material).filter(Material.id.in_(req.material_ids)).all()
    if len(materials) < len(req.material_ids):
        raise HTTPException(status_code=404, detail="One or more selected materials were not found.")

    # Sort in order requested
    mat_map = {m.id: m for m in materials}
    ordered_materials = [mat_map[mid] for mid in req.material_ids]

    baseline = ordered_materials[0]
    consumption = req.consumption_per_pair or 1.0
    batch_size = req.batch_size or 1000

    items_data = []
    for idx, m in enumerate(ordered_materials):
        supplier_name = m.supplier.name if m.supplier else "Direct / Unspecified"
        
        # Extended cost calculation
        cost_per_pair = round(m.price_per_unit * consumption, 4)
        batch_cost = round(cost_per_pair * batch_size, 2)

        # Baseline comparison
        diff_unit_price = round(m.price_per_unit - baseline.price_per_unit, 4)
        diff_pct = round(((diff_unit_price / baseline.price_per_unit) * 100.0) if baseline.price_per_unit > 0 else 0.0, 1)
        savings_per_pair = round((baseline.price_per_unit - m.price_per_unit) * consumption, 4)
        savings_batch = round(savings_per_pair * batch_size, 2)

        # Check missing specifications
        missing_fields = []
        if m.thickness_mm is None: missing_fields.append("Thickness")
        if m.tensile_strength_mpa is None: missing_fields.append("Tensile strength")
        if m.bally_flex_cycles is None: missing_fields.append("Bally flex cycles")
        if m.validation_status != "Verified Lab Test": missing_fields.append("Unverified laboratory test")

        items_data.append({
            "id": m.id,
            "name": m.name,
            "category": m.category,
            "material_type": m.material_type,
            "grade": m.grade,
            "supplier_name": supplier_name,
            "supplier_country": m.supplier.country if m.supplier else "N/A",
            "purchase_unit": m.purchase_unit,
            "costing_unit": m.costing_unit,
            "price_per_unit": m.price_per_unit,
            "currency": m.currency,
            "price_basis": m.price_basis,
            "effective_date": m.effective_date,
            "moq": m.moq,
            "lead_time_days": m.lead_time_days,
            
            # Technical metrics
            "thickness_mm": m.thickness_mm,
            "notes": m.notes,
            "alternative_name": m.alternative_name,
            "alternative_price": m.alternative_price,
            "alternative_properties": m.alternative_properties,
            "alternative_thickness_mm": m.alternative_thickness_mm,
            "density_g_cm3": m.density_g_cm3,
            "hardness_shore": m.hardness_shore,
            "weight_gsm": m.weight_gsm,
            "flexibility_rating": m.flexibility_rating,
            "durability_rating": m.durability_rating,
            "bally_flex_cycles": m.bally_flex_cycles,
            "tensile_strength_mpa": m.tensile_strength_mpa,
            "tear_strength_n": m.tear_strength_n,
            "breathability_mg_cm2_h": m.breathability_mg_cm2_h,
            "water_absorption_pct": m.water_absorption_pct,
            "water_resistance_grade": m.water_resistance_grade,
            "slip_resistance_dry_cof": m.slip_resistance_dry_cof,
            "slip_resistance_wet_cof": m.slip_resistance_wet_cof,
            "abrasion_resistance_din_mm3": m.abrasion_resistance_din_mm3,
            "rebound_resilience_pct": m.rebound_resilience_pct,
            
            # Compliance
            "validation_status": m.validation_status,
            "test_report_summary": m.test_report_summary,
            "missing_fields": missing_fields,

            # Financial simulations
            "consumption_per_pair": consumption,
            "cost_per_pair": cost_per_pair,
            "batch_cost": batch_cost,
            "diff_unit_price": diff_unit_price,
            "diff_pct": diff_pct,
            "savings_per_pair": savings_per_pair,
            "savings_batch": savings_batch,
            "is_baseline": (idx == 0)
        })

    return {
        "baseline_material": {
            "id": baseline.id,
            "name": baseline.name,
            "category": baseline.category,
            "unit": baseline.purchase_unit,
            "price": baseline.price_per_unit
        },
        "simulation_parameters": {
            "consumption_per_pair": consumption,
            "batch_size": batch_size
        },
        "comparison_matrix": items_data
    }
