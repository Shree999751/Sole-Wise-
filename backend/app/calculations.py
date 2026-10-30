from typing import Dict, Any, List, Optional
import math

def calculate_component_cost(
    consumption: float,
    wastage_pct: float,
    unit_price: float,
    conversion_factor: float = 1.0
) -> float:
    """
    Computes extended material cost per pair:
    extended_cost = consumption * (1 + wastage_pct/100) * unit_price * conversion_factor
    """
    if consumption < 0 or wastage_pct < 0 or unit_price < 0 or conversion_factor <= 0:
        return 0.0
    effective_consumption = consumption * (1.0 + (wastage_pct / 100.0))
    cost = effective_consumption * unit_price * conversion_factor
    return round(cost, 4)


def calculate_operation_cost(
    operation_time_sam: float,
    labour_rate_per_hour: float,
    machine_rate_per_hour: float
) -> Dict[str, float]:
    """
    Calculates direct labor cost and machine cost based on Standard Allowed Minutes (SAM):
    labour_cost = (SAM / 60) * labour_rate_per_hour
    machine_cost = (SAM / 60) * machine_rate_per_hour
    total_cost = labour_cost + machine_cost
    """
    if operation_time_sam < 0:
        operation_time_sam = 0.0
    
    hours = operation_time_sam / 60.0
    labour_cost = round(hours * max(0.0, labour_rate_per_hour), 4)
    machine_cost = round(hours * max(0.0, machine_rate_per_hour), 4)
    total_cost = round(labour_cost + machine_cost, 4)

    return {
        "labour_cost": labour_cost,
        "machine_cost": machine_cost,
        "total_cost": total_cost
    }


def calculate_footwear_cost_sheet(
    material_components: List[Dict[str, Any]],
    operations: List[Dict[str, Any]],
    overhead_percentage: float = 10.0,
    tooling_cost_per_pair: float = 1.50,
    packaging_cost_per_pair: float = 1.20,
    qc_cost_per_pair: float = 0.60,
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    Full footwear cost sheet aggregation.
    """
    total_material_cost = 0.0
    category_material_costs: Dict[str, float] = {}

    for comp in material_components:
        ext_cost = comp.get("extended_cost")
        if ext_cost is None:
            c = comp.get("consumption_per_pair", 0.0)
            w = comp.get("wastage_percentage", 0.0)
            p = comp.get("unit_price", 0.0)
            f = comp.get("conversion_factor", 1.0)
            ext_cost = calculate_component_cost(c, w, p, f)
        
        total_material_cost += ext_cost
        cat = comp.get("category", "Other")
        category_material_costs[cat] = round(category_material_costs.get(cat, 0.0) + ext_cost, 4)

    total_labour_cost = 0.0
    total_machine_cost = 0.0
    total_sam_minutes = 0.0
    department_operation_costs: Dict[str, float] = {}

    for op in operations:
        time_sam = op.get("operation_time_sam", 0.0)
        total_sam_minutes += time_sam
        
        lab_cost = op.get("calculated_labour_cost")
        mac_cost = op.get("calculated_machine_cost")
        
        if lab_cost is None or mac_cost is None:
            calc = calculate_operation_cost(
                time_sam,
                op.get("labour_rate_per_hour", 0.0),
                op.get("machine_rate_per_hour", 0.0)
            )
            lab_cost = calc["labour_cost"]
            mac_cost = calc["machine_cost"]

        total_labour_cost += lab_cost
        total_machine_cost += mac_cost
        
        dept = op.get("department", "General")
        dept_sum = lab_cost + mac_cost
        department_operation_costs[dept] = round(department_operation_costs.get(dept, 0.0) + dept_sum, 4)

    prime_cost = total_material_cost + total_labour_cost + total_machine_cost
    overhead_cost = round(prime_cost * (max(0.0, overhead_percentage) / 100.0), 4)
    
    total_cost_per_pair = round(
        prime_cost + overhead_cost + tooling_cost_per_pair + packaging_cost_per_pair + qc_cost_per_pair,
        4
    )
    total_batch_cost = round(total_cost_per_pair * max(1, batch_size), 2)

    return {
        "total_material_cost": round(total_material_cost, 4),
        "total_labour_cost": round(total_labour_cost, 4),
        "total_machine_cost": round(total_machine_cost, 4),
        "prime_cost": round(prime_cost, 4),
        "overhead_cost": overhead_cost,
        "tooling_cost_per_pair": round(tooling_cost_per_pair, 4),
        "packaging_cost_per_pair": round(packaging_cost_per_pair, 4),
        "qc_cost_per_pair": round(qc_cost_per_pair, 4),
        "total_cost_per_pair": total_cost_per_pair,
        "total_batch_cost": total_batch_cost,
        "total_sam_minutes": round(total_sam_minutes, 2),
        "batch_size": batch_size,
        "category_material_costs": category_material_costs,
        "department_operation_costs": department_operation_costs
    }


def normalize_material_units(price: float, unit: str, target_unit: str = "sq.ft") -> Optional[float]:
    """
    Normalizes material prices to standard footwear reference units.
    Standard conversions:
    1 sq. meter (m2) ≈ 10.7639 sq. ft
    """
    u_src = unit.lower().strip()
    u_dst = target_unit.lower().strip()

    if u_src == u_dst:
        return price

    # Area conversions
    if u_src in ["m2", "m²", "sq.m", "sqm"] and u_dst in ["sq.ft", "sqft", "ft2"]:
        return round(price / 10.7639, 4)
    if u_src in ["sq.ft", "sqft", "ft2"] and u_dst in ["m2", "m²", "sq.m", "sqm"]:
        return round(price * 10.7639, 4)

    # Length conversions
    if u_src in ["yard", "yd"] and u_dst in ["meter", "m"]:
        return round(price / 0.9144, 4)
    if u_src in ["meter", "m"] and u_dst in ["yard", "yd"]:
        return round(price * 0.9144, 4)

    # Incompatible unit types return None (flagged as non-convertible)
    return None


def score_material_alternative(
    base_material: Dict[str, Any],
    candidate: Dict[str, Any],
    constraints: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates alternative candidate against base material with strict constraints and multi-criteria scoring.
    """
    passed_mandatory = True
    failure_reasons = []
    missing_data_warnings = []

    # Check category match
    if base_material.get("category") != candidate.get("category"):
        passed_mandatory = False
        failure_reasons.append(f"Category mismatch: {candidate.get('category')} vs {base_material.get('category')}")

    # Maximum price constraint
    max_budget = constraints.get("max_budget")
    cand_price = candidate.get("price_per_unit", 0.0)
    if max_budget is not None and cand_price > max_budget:
        passed_mandatory = False
        failure_reasons.append(f"Price ${cand_price} exceeds max budget ${max_budget}")

    # Minimum tensile strength constraint
    min_tensile = constraints.get("min_tensile_strength_mpa")
    cand_tensile = candidate.get("tensile_strength_mpa")
    if min_tensile is not None:
        if cand_tensile is None:
            missing_data_warnings.append("Tensile strength test data missing")
        elif cand_tensile < min_tensile:
            passed_mandatory = False
            failure_reasons.append(f"Tensile strength {cand_tensile} MPa below required {min_tensile} MPa")

    # Minimum Bally flex cycles constraint
    min_flex = constraints.get("min_bally_flex_cycles")
    cand_flex = candidate.get("bally_flex_cycles")
    if min_flex is not None:
        if cand_flex is None:
            missing_data_warnings.append("Bally flex cycle test data missing")
        elif cand_flex < min_flex:
            passed_mandatory = False
            failure_reasons.append(f"Bally flex {cand_flex} cycles below target {min_flex} cycles")

    # Required water resistance
    req_water = constraints.get("required_water_resistance")
    cand_water = candidate.get("water_resistance_grade")
    if req_water and req_water != "Any":
        if not cand_water or cand_water.lower() == "none":
            passed_mandatory = False
            failure_reasons.append(f"Lacks required water resistance '{req_water}'")

    # Calculate Cost Savings relative to base material
    base_price = base_material.get("price_per_unit", 0.0)
    cost_diff = round(base_price - cand_price, 4)
    cost_saving_pct = round((cost_diff / base_price * 100.0) if base_price > 0 else 0.0, 1)

    # Multi-criteria scoring (0 to 100)
    score = 50.0 # base score

    # Cost score weight (up to +30 points or -30 points)
    cost_component = max(-30.0, min(30.0, cost_saving_pct * 0.6))
    score += cost_component

    # Technical property parity
    tech_score = 0.0
    # Compare tensile
    base_tensile = base_material.get("tensile_strength_mpa")
    if base_tensile and cand_tensile:
        ratio = cand_tensile / base_tensile
        tech_score += 10.0 if ratio >= 1.0 else max(-10.0, (ratio - 1.0) * 20.0)
    
    # Compare bally flex
    base_flex = base_material.get("bally_flex_cycles")
    if base_flex and cand_flex:
        ratio = cand_flex / base_flex
        tech_score += 10.0 if ratio >= 1.0 else max(-10.0, (ratio - 1.0) * 20.0)

    score = max(5.0, min(99.0, round(score + tech_score, 1)))

    # Determine validation caveat
    lab_validation_required = False
    validation_status = candidate.get("validation_status", "User Entered")
    if validation_status != "Verified Lab Test" or len(missing_data_warnings) > 0:
        lab_validation_required = True

    recommendation_notes = []
    if cost_diff > 0:
        recommendation_notes.append(f"Offers ${cost_diff:.2f} ({cost_saving_pct:.1f}%) cost reduction per {candidate.get('purchase_unit')}.")
    elif cost_diff < 0:
        recommendation_notes.append(f"Higher unit cost by ${abs(cost_diff):.2f}, but may offer superior technical specifications.")
    else:
        recommendation_notes.append("Parity unit cost with alternative supplier availability.")

    if cand_flex and base_flex and cand_flex > base_flex:
        recommendation_notes.append(f"Superior Bally flex resistance (+{cand_flex - base_flex:,} cycles).")

    return {
        "candidate_id": candidate.get("id"),
        "candidate_name": candidate.get("name"),
        "candidate_type": candidate.get("material_type"),
        "candidate_supplier": candidate.get("supplier_name", "Unknown"),
        "candidate_price": cand_price,
        "candidate_unit": candidate.get("purchase_unit"),
        "passed_mandatory": passed_mandatory,
        "failure_reasons": failure_reasons,
        "missing_data_warnings": missing_data_warnings,
        "compatibility_score": score if passed_mandatory else 0.0,
        "cost_difference": cost_diff,
        "cost_saving_pct": cost_saving_pct,
        "lab_validation_required": lab_validation_required,
        "validation_status": validation_status,
        "recommendation_reasons": recommendation_notes
    }
