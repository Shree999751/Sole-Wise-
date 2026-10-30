import time
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.app.database import Base, get_db
from backend.app.main import app

# Create isolated in-memory test database so tests never pollute shoes_wise.db
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_initial_dashboard_overview():
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "total_materials" in data["metrics"]

def test_create_and_get_materials():
    # User adds first material
    mat1 = {
        "name": f"Full Grain Bovine Leather {time.time()}",
        "category": "Upper materials",
        "material_type": "Aniline Cowhide",
        "grade": "Grade A",
        "purchase_unit": "sq.ft",
        "costing_unit": "sq.ft",
        "price_per_unit": 450.0,
        "currency": "INR",
        "thickness_mm": 1.3,
        "moq": 100,
        "lead_time_days": 14
    }
    create_res1 = client.post("/api/materials", json=mat1)
    assert create_res1.status_code == 200
    m1_data = create_res1.json()
    assert m1_data["price_per_unit"] == 450.0

    # User adds second material for comparison
    mat2 = {
        "name": f"Microfiber Suede Synthetic {time.time()}",
        "category": "Upper materials",
        "material_type": "Non-Woven PU",
        "grade": "Standard",
        "purchase_unit": "sq.ft",
        "costing_unit": "sq.ft",
        "price_per_unit": 280.0,
        "currency": "INR",
        "thickness_mm": 1.2,
        "moq": 50,
        "lead_time_days": 7
    }
    create_res2 = client.post("/api/materials", json=mat2)
    assert create_res2.status_code == 200

    # Fetch materials
    res = client.get("/api/materials")
    assert res.status_code == 200
    materials = res.json()
    assert len(materials) >= 2

def test_compare_materials():
    materials_res = client.get("/api/materials")
    materials = materials_res.json()
    assert len(materials) >= 2
    mat_ids = [materials[0]["id"], materials[1]["id"]]
    
    payload = {
        "material_ids": mat_ids,
        "consumption_per_pair": 2.0,
        "batch_size": 1000
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "comparison_matrix" in data
    assert len(data["comparison_matrix"]) == 2
    assert "cost_per_pair" in data["comparison_matrix"][0]

def test_create_product_and_costing():
    # User creates a product
    unique_style = f"DS-{int(time.time() * 1000)}"
    prod_payload = {
        "name": "Classic Derby Shoe",
        "style_number": unique_style,
        "category": "Dress & Formal",
        "target_customer": "Men",
        "size_range": "EU 40-45",
        "currency": "INR",
        "target_cost": 2400.0,
        "batch_size": 1000
    }
    prod_res = client.post("/api/products", json=prod_payload)
    assert prod_res.status_code == 200
    product = prod_res.json()
    p_id = product["id"]

    # User adds BOM component
    bom_payload = {
        "component_name": "Upper Vamp",
        "category": "Upper materials",
        "consumption_per_pair": 1.8,
        "purchase_unit": "sq.ft",
        "costing_unit": "sq.ft",
        "wastage_percentage": 15.0,
        "unit_price": 450.0
    }
    bom_res = client.post(f"/api/products/{p_id}/bom", json=bom_payload)
    assert bom_res.status_code == 200

    # Fetch cost breakdown
    breakdown_res = client.get(f"/api/cost-optimizer/{p_id}")
    assert breakdown_res.status_code == 200
    data = breakdown_res.json()
    assert "cost_sheet" in data
    assert data["cost_sheet"]["total_material_cost"] > 0
    assert "variance_analysis" in data

def test_create_operations_sequence():
    op_payload = {
        "sequence_number": 1,
        "department": "Cutting / Clicking",
        "operation_title": "Die cut leather vamp & quarter",
        "grade": "Grade A",
        "machine": "Hydraulic Clicker Press",
        "operation_time_sam": 1.5,
        "labour_rate_per_hour": 180.0,
        "machine_rate_per_hour": 55.0
    }
    op_res = client.post("/api/operations", json=op_payload)
    assert op_res.status_code == 200
    created_op = op_res.json()
    assert created_op["calculated_cost"] > 0
    assert created_op["operation_title"] == op_payload["operation_title"]
