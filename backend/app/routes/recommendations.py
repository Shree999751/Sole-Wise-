from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Material
from ..schemas import RecommendationRequest
from ..calculations import score_material_alternative

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("")
def get_recommendations(req: RecommendationRequest, db: Session = Depends(get_db)):
    base_material = db.query(Material).filter(Material.id == req.base_material_id).first()
    if not base_material:
        raise HTTPException(status_code=404, detail="Base material not found")

    # Find candidates in the same category, excluding the base material itself and archived
    candidates = db.query(Material).filter(
        Material.category == base_material.category,
        Material.id != base_material.id,
        Material.is_archived == False
    ).all()

    base_mat_dict = {
        "id": base_material.id,
        "name": base_material.name,
        "category": base_material.category,
        "material_type": base_material.material_type,
        "price_per_unit": base_material.price_per_unit,
        "purchase_unit": base_material.purchase_unit,
        "tensile_strength_mpa": base_material.tensile_strength_mpa,
        "bally_flex_cycles": base_material.bally_flex_cycles,
        "water_resistance_grade": base_material.water_resistance_grade,
        "validation_status": base_material.validation_status
    }

    constraints = {
        "max_budget": req.max_budget,
        "min_tensile_strength_mpa": req.min_tensile_strength_mpa,
        "min_bally_flex_cycles": req.min_bally_flex_cycles,
        "required_water_resistance": req.required_water_resistance
    }

    scored_candidates = []
    excluded_candidates = []

    for c in candidates:
        c_dict = {
            "id": c.id,
            "name": c.name,
            "category": c.category,
            "material_type": c.material_type,
            "supplier_name": c.supplier.name if c.supplier else "N/A",
            "price_per_unit": c.price_per_unit,
            "purchase_unit": c.purchase_unit,
            "tensile_strength_mpa": c.tensile_strength_mpa,
            "bally_flex_cycles": c.bally_flex_cycles,
            "water_resistance_grade": c.water_resistance_grade,
            "validation_status": c.validation_status
        }
        res = score_material_alternative(base_mat_dict, c_dict, constraints)
        
        # Enrich with extra details
        res["thickness_mm"] = c.thickness_mm
        res["lead_time_days"] = c.lead_time_days
        res["moq"] = c.moq
        res["supplier_country"] = c.supplier.country if c.supplier else "N/A"

        if res["passed_mandatory"]:
            scored_candidates.append(res)
        else:
            excluded_candidates.append(res)

    # Sort scored candidates by compatibility score descending
    scored_candidates.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return {
        "base_material": base_mat_dict,
        "constraints_applied": constraints,
        "total_evaluated": len(candidates),
        "qualifying_alternatives_count": len(scored_candidates),
        "excluded_alternatives_count": len(excluded_candidates),
        "recommendations": scored_candidates,
        "excluded": excluded_candidates
    }
