from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# ----------------- SUPPLIERS -----------------

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: str = "Vietnam"
    city: Optional[str] = None
    rating: float = 4.5
    is_approved: bool = True
    certifications: Optional[str] = "ISO 9001, LWG Gold"
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    rating: Optional[float] = None
    is_approved: Optional[bool] = None
    certifications: Optional[str] = None
    notes: Optional[str] = None

class SupplierQuotationBase(BaseModel):
    material_id: int
    quoted_price: float
    currency: str = "USD"
    moq: float = 500.0
    lead_time_days: int = 21
    quotation_date: str
    expiration_date: Optional[str] = None
    price_basis: str = "FOB"
    is_active: bool = True

class SupplierQuotationCreate(SupplierQuotationBase):
    supplier_id: int

class SupplierQuotationOut(SupplierQuotationBase):
    id: int
    supplier_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    quotations: List[SupplierQuotationOut] = []
    model_config = ConfigDict(from_attributes=True)


# ----------------- PRICE HISTORY -----------------

class PriceHistoryOut(BaseModel):
    id: int
    material_id: int
    price_per_unit: float
    currency: str
    price_basis: str
    effective_date: str
    changed_by: str
    reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- MATERIALS -----------------

class MaterialBase(BaseModel):
    name: str
    category: str
    supplier_id: Optional[int] = None
    material_type: str
    grade: str = "Standard"
    
    thickness_mm: Optional[float] = None
    density_g_cm3: Optional[float] = None
    hardness_shore: Optional[str] = None
    weight_gsm: Optional[float] = None
    flexibility_rating: Optional[str] = None
    durability_rating: Optional[str] = None
    
    bally_flex_cycles: Optional[int] = None
    tensile_strength_mpa: Optional[float] = None
    tear_strength_n: Optional[float] = None
    breathability_mg_cm2_h: Optional[float] = None
    water_absorption_pct: Optional[float] = None
    water_resistance_grade: Optional[str] = None
    slip_resistance_dry_cof: Optional[float] = None
    slip_resistance_wet_cof: Optional[float] = None
    abrasion_resistance_din_mm3: Optional[float] = None
    rebound_resilience_pct: Optional[float] = None
    
    solid_content_pct: Optional[float] = None
    viscosity_mpa_s: Optional[float] = None
    open_time_min: Optional[float] = None
    bonding_strength_n_mm: Optional[float] = None

    appearance_finish: Optional[str] = None
    color: Optional[str] = None
    purchase_unit: str = "sq.ft"
    costing_unit: str = "sq.ft"
    price_per_unit: float
    currency: str = "INR"
    price_basis: str = "Ex-Factory"
    effective_date: Optional[str] = None
    moq: float = 100.0
    lead_time_days: int = 14

    technical_datasheet_url: Optional[str] = None
    test_report_summary: Optional[str] = None
    source_reference: Optional[str] = None
    validation_status: str = "Verified Lab Test"
    notes: Optional[str] = None

    alternative_name: Optional[str] = None
    alternative_price: Optional[float] = None
    alternative_properties: Optional[str] = None
    alternative_thickness_mm: Optional[float] = None
    alternative_id: Optional[int] = None

class MaterialCreate(MaterialBase):
    changed_by: Optional[str] = "User"
    change_reason: Optional[str] = "Initial Entry"

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    supplier_id: Optional[int] = None
    material_type: Optional[str] = None
    grade: Optional[str] = None
    thickness_mm: Optional[float] = None
    density_g_cm3: Optional[float] = None
    hardness_shore: Optional[str] = None
    weight_gsm: Optional[float] = None
    flexibility_rating: Optional[str] = None
    durability_rating: Optional[str] = None
    bally_flex_cycles: Optional[int] = None
    tensile_strength_mpa: Optional[float] = None
    tear_strength_n: Optional[float] = None
    breathability_mg_cm2_h: Optional[float] = None
    water_absorption_pct: Optional[float] = None
    water_resistance_grade: Optional[str] = None
    slip_resistance_dry_cof: Optional[float] = None
    slip_resistance_wet_cof: Optional[float] = None
    abrasion_resistance_din_mm3: Optional[float] = None
    rebound_resilience_pct: Optional[float] = None
    solid_content_pct: Optional[float] = None
    viscosity_mpa_s: Optional[float] = None
    open_time_min: Optional[float] = None
    bonding_strength_n_mm: Optional[float] = None
    appearance_finish: Optional[str] = None
    color: Optional[str] = None
    purchase_unit: Optional[str] = None
    costing_unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    currency: Optional[str] = None
    price_basis: Optional[str] = None
    effective_date: Optional[str] = None
    moq: Optional[float] = None
    lead_time_days: Optional[int] = None
    technical_datasheet_url: Optional[str] = None
    test_report_summary: Optional[str] = None
    source_reference: Optional[str] = None
    validation_status: Optional[str] = None
    is_archived: Optional[bool] = None
    notes: Optional[str] = None
    alternative_name: Optional[str] = None
    alternative_price: Optional[float] = None
    alternative_properties: Optional[str] = None
    alternative_thickness_mm: Optional[float] = None
    alternative_id: Optional[int] = None
    changed_by: Optional[str] = "User"
    change_reason: Optional[str] = "Updated properties"

class MaterialOut(MaterialBase):
    id: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    supplier_name: Optional[str] = None
    price_history: List[PriceHistoryOut] = []
    model_config = ConfigDict(from_attributes=True)


# ----------------- PRODUCT & BOM -----------------

class ProductMaterialBase(BaseModel):
    component_name: str
    category: str
    material_id: Optional[int] = None
    consumption_per_pair: float
    purchase_unit: str = "sq.ft"
    costing_unit: str = "sq.ft"
    conversion_factor: float = 1.0
    wastage_percentage: float = 15.0
    unit_price: float
    scenario: str = "Baseline"
    notes: Optional[str] = None

class ProductMaterialCreate(ProductMaterialBase):
    pass

class ProductMaterialUpdate(BaseModel):
    component_name: Optional[str] = None
    category: Optional[str] = None
    material_id: Optional[int] = None
    consumption_per_pair: Optional[float] = None
    purchase_unit: Optional[str] = None
    costing_unit: Optional[str] = None
    conversion_factor: Optional[float] = None
    wastage_percentage: Optional[float] = None
    unit_price: Optional[float] = None
    scenario: Optional[str] = None
    notes: Optional[str] = None

class ProductMaterialOut(ProductMaterialBase):
    id: int
    product_id: int
    extended_cost: float
    material_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- OPERATIONS -----------------

class OperationBase(BaseModel):
    sequence_number: int
    department: str
    operation_title: str
    grade: str = "Grade B (Skilled)"
    machine: str = "Travelling Head Clicker"
    operation_time_sam: float
    labour_rate_per_hour: float = 15.0
    machine_rate_per_hour: float = 5.0
    scenario: str = "Baseline"

class OperationCreate(OperationBase):
    product_id: Optional[int] = None

class OperationUpdate(BaseModel):
    sequence_number: Optional[int] = None
    department: Optional[str] = None
    operation_title: Optional[str] = None
    grade: Optional[str] = None
    machine: Optional[str] = None
    operation_time_sam: Optional[float] = None
    labour_rate_per_hour: Optional[float] = None
    machine_rate_per_hour: Optional[float] = None
    scenario: Optional[str] = None

class OperationOut(OperationBase):
    id: int
    product_id: Optional[int]
    calculated_labour_cost: float
    calculated_machine_cost: float
    calculated_cost: float
    model_config = ConfigDict(from_attributes=True)


# ----------------- PRODUCTS -----------------

class ProductBase(BaseModel):
    style_number: str
    name: str
    category: str
    target_customer: str = "General Adult"
    size_range: str = "US 7-12 / EU 40-46"
    currency: str = "USD"
    target_cost: float = 35.00
    batch_size: int = 1000
    notes: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    style_number: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    target_customer: Optional[str] = None
    size_range: Optional[str] = None
    currency: Optional[str] = None
    target_cost: Optional[float] = None
    batch_size: Optional[int] = None
    notes: Optional[str] = None

class CostingScenarioOut(BaseModel):
    id: int
    product_id: int
    name: str
    description: Optional[str] = None
    material_cost_per_pair: float
    labour_cost_per_pair: float
    machine_cost_per_pair: float
    overhead_cost_per_pair: float
    total_cost_per_pair: float
    baseline_cost_per_pair: float
    savings_per_pair: float
    savings_percentage: float
    batch_savings: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    materials: List[ProductMaterialOut] = []
    operations: List[OperationOut] = []
    scenarios: List[CostingScenarioOut] = []
    model_config = ConfigDict(from_attributes=True)


# ----------------- COMPARISON & RECOMMENDATION -----------------

class CompareRequest(BaseModel):
    material_ids: List[int]
    consumption_per_pair: Optional[float] = 2.0
    batch_size: Optional[int] = 1000

class RecommendationRequest(BaseModel):
    base_material_id: int
    max_budget: Optional[float] = None
    min_tensile_strength_mpa: Optional[float] = None
    min_bally_flex_cycles: Optional[int] = None
    required_water_resistance: Optional[str] = None
    priority: Optional[str] = "balanced"
