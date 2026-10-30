import pytest
from backend.app.calculations import (
    calculate_component_cost,
    calculate_operation_cost,
    calculate_footwear_cost_sheet,
    normalize_material_units,
    score_material_alternative
)

def test_calculate_component_cost():
    # 2.5 sq.ft consumption, 18% leather cutting loss, $5.00/sq.ft unit price
    # Effective consumption = 2.5 * 1.18 = 2.95 sq.ft
    # Extended cost = 2.95 * 5.00 = 14.75
    cost = calculate_component_cost(2.5, 18.0, 5.00, 1.0)
    assert cost == 14.75

def test_calculate_component_cost_with_conversion():
    # 1.5 sq.m converted with factor 1.0, 10% wastage, $20.00
    # 1.5 * 1.10 * 20.00 = 33.00
    cost = calculate_component_cost(1.5, 10.0, 20.00, 1.0)
    assert cost == 33.00

def test_calculate_operation_cost():
    # 1.2 SAM (minutes), labour rate $18.00/hr, machine rate $6.00/hr
    # Labour cost = (1.2 / 60) * 18.00 = 0.02 * 18.00 = 0.36
    # Machine cost = (1.2 / 60) * 6.00 = 0.02 * 6.00 = 0.12
    # Total cost = 0.48
    res = calculate_operation_cost(1.2, 18.00, 6.00)
    assert res["labour_cost"] == 0.36
    assert res["machine_cost"] == 0.12
    assert res["total_cost"] == 0.48

def test_calculate_footwear_cost_sheet():
    material_components = [
        {"consumption_per_pair": 2.0, "wastage_percentage": 10.0, "unit_price": 5.0, "category": "Upper"}, # 2 * 1.1 * 5 = 11.0
        {"consumption_per_pair": 1.0, "wastage_percentage": 0.0, "unit_price": 4.0, "category": "Outsole"} # 1 * 4 = 4.0
    ]
    operations = [
        {"operation_time_sam": 3.0, "labour_rate_per_hour": 20.0, "machine_rate_per_hour": 10.0, "department": "Stitching"} # 3/60 * 20 = 1.0, 3/60 * 10 = 0.5 -> 1.5
    ]
    sheet = calculate_footwear_cost_sheet(
        material_components=material_components,
        operations=operations,
        overhead_percentage=10.0, # 10% of prime cost (11 + 4 + 1.0 + 0.5 = 16.5) -> 1.65
        tooling_cost_per_pair=1.00,
        packaging_cost_per_pair=1.00,
        qc_cost_per_pair=0.50,
        batch_size=1000
    )

    assert sheet["total_material_cost"] == 15.0
    assert sheet["total_labour_cost"] == 1.0
    assert sheet["total_machine_cost"] == 0.5
    assert sheet["prime_cost"] == 16.5
    assert sheet["overhead_cost"] == 1.65
    assert sheet["total_cost_per_pair"] == round(16.5 + 1.65 + 1.00 + 1.00 + 0.50, 4)
    assert sheet["total_batch_cost"] == round(sheet["total_cost_per_pair"] * 1000, 2)

def test_normalize_material_units():
    # 1 m2 = 10.7639 sq.ft
    # If a material is $10.7639 / m2, in sq.ft it should be approx $1.00
    converted = normalize_material_units(10.7639, "m2", "sq.ft")
    assert round(converted, 2) == 1.00

def test_score_material_alternative_mandatory_rejection():
    base = {
        "id": 1,
        "name": "Leather",
        "category": "Upper materials",
        "price_per_unit": 6.00,
        "purchase_unit": "sq.ft",
        "tensile_strength_mpa": 20.0,
        "bally_flex_cycles": 100000
    }
    candidate_weak = {
        "id": 2,
        "name": "Weak Fabric",
        "category": "Upper materials",
        "price_per_unit": 4.00,
        "purchase_unit": "sq.ft",
        "tensile_strength_mpa": 12.0, # Below constraint of 15.0
        "bally_flex_cycles": 80000
    }
    constraints = {
        "max_budget": 5.00,
        "min_tensile_strength_mpa": 15.0
    }
    res = score_material_alternative(base, candidate_weak, constraints)
    assert res["passed_mandatory"] is False
    assert any("Tensile strength" in r for r in res["failure_reasons"])
    assert res["compatibility_score"] == 0.0

def test_score_material_alternative_success():
    base = {
        "id": 1,
        "name": "Leather",
        "category": "Upper materials",
        "price_per_unit": 6.00,
        "purchase_unit": "sq.ft",
        "tensile_strength_mpa": 20.0,
        "bally_flex_cycles": 100000
    }
    candidate_good = {
        "id": 3,
        "name": "Microfiber",
        "category": "Upper materials",
        "price_per_unit": 3.50,
        "purchase_unit": "sq.ft",
        "tensile_strength_mpa": 22.0,
        "bally_flex_cycles": 120000,
        "validation_status": "Verified Lab Test"
    }
    constraints = {
        "max_budget": 5.00,
        "min_tensile_strength_mpa": 18.0
    }
    res = score_material_alternative(base, candidate_good, constraints)
    assert res["passed_mandatory"] is True
    assert res["compatibility_score"] > 60.0
    assert res["cost_difference"] == 2.50
    assert res["cost_saving_pct"] > 40.0
