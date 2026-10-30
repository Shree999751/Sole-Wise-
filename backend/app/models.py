from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    country = Column(String(100), nullable=False, default="Vietnam")
    city = Column(String(100), nullable=True)
    rating = Column(Float, default=4.5)
    is_approved = Column(Boolean, default=True)
    certifications = Column(String(255), nullable=True, default="ISO 9001, LWG Gold")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    materials = relationship("Material", back_populates="supplier")
    quotations = relationship("SupplierQuotation", back_populates="supplier", cascade="all, delete-orphan")


class SupplierQuotation(Base):
    __tablename__ = "supplier_quotations"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    quoted_price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    moq = Column(Float, default=500.0)
    lead_time_days = Column(Integer, default=21)
    quotation_date = Column(String(20), nullable=False)
    expiration_date = Column(String(20), nullable=True)
    price_basis = Column(String(100), default="FOB")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="quotations")
    material = relationship("Material", back_populates="quotations")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    material_type = Column(String(150), nullable=False)
    grade = Column(String(100), default="Standard")
    
    # Physical and Mechanical specs
    thickness_mm = Column(Float, nullable=True)
    density_g_cm3 = Column(Float, nullable=True)
    hardness_shore = Column(String(50), nullable=True)
    weight_gsm = Column(Float, nullable=True)
    flexibility_rating = Column(String(50), nullable=True)
    durability_rating = Column(String(50), nullable=True)
    
    # Footwear-specific technical properties
    bally_flex_cycles = Column(Integer, nullable=True) # e.g. 50,000 to 150,000 cycles
    tensile_strength_mpa = Column(Float, nullable=True) # in MPa or N/mm2
    tear_strength_n = Column(Float, nullable=True) # in N
    breathability_mg_cm2_h = Column(Float, nullable=True) # water vapor permeability
    water_absorption_pct = Column(Float, nullable=True)
    water_resistance_grade = Column(String(50), nullable=True)
    slip_resistance_dry_cof = Column(Float, nullable=True) # Coefficient of Friction
    slip_resistance_wet_cof = Column(Float, nullable=True)
    abrasion_resistance_din_mm3 = Column(Float, nullable=True) # lower is better (DIN volume loss)
    rebound_resilience_pct = Column(Float, nullable=True) # midsole energy return
    
    # Chemical / Adhesive specific
    solid_content_pct = Column(Float, nullable=True)
    viscosity_mpa_s = Column(Float, nullable=True)
    open_time_min = Column(Float, nullable=True)
    bonding_strength_n_mm = Column(Float, nullable=True)

    # Aesthetics & Commerce
    appearance_finish = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    purchase_unit = Column(String(50), nullable=False, default="sq.ft")
    costing_unit = Column(String(50), nullable=False, default="sq.ft")
    price_per_unit = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    price_basis = Column(String(100), default="FOB Port")
    effective_date = Column(String(20), nullable=False)
    moq = Column(Float, default=500.0)
    lead_time_days = Column(Integer, default=21)

    # Compliance & Validation
    technical_datasheet_url = Column(String(255), nullable=True)
    test_report_summary = Column(Text, nullable=True)
    source_reference = Column(String(255), nullable=True)
    validation_status = Column(String(50), default="Verified Lab Test") # 'Verified Lab Test', 'Supplier Declared', 'User Entered'
    is_archived = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Best Alternative Material Linkage
    alternative_name = Column(String(255), nullable=True)
    alternative_price = Column(Float, nullable=True)
    alternative_properties = Column(Text, nullable=True)
    alternative_thickness_mm = Column(Float, nullable=True)
    alternative_id = Column(Integer, ForeignKey("materials.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="materials")
    price_history = relationship("PriceHistory", back_populates="material", cascade="all, delete-orphan")
    quotations = relationship("SupplierQuotation", back_populates="material", cascade="all, delete-orphan")
    product_materials = relationship("ProductMaterial", back_populates="material")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    price_per_unit = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    price_basis = Column(String(100), default="FOB")
    effective_date = Column(String(20), nullable=False)
    changed_by = Column(String(100), default="System Import")
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="price_history")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    style_number = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    target_customer = Column(String(100), default="General Adult")
    size_range = Column(String(50), default="US 7-12 / EU 40-46")
    currency = Column(String(10), default="USD")
    target_cost = Column(Float, default=35.00)
    batch_size = Column(Integer, default=1000)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    materials = relationship("ProductMaterial", back_populates="product", cascade="all, delete-orphan")
    operations = relationship("ConstructionOperation", back_populates="product", cascade="all, delete-orphan")
    scenarios = relationship("CostingScenario", back_populates="product", cascade="all, delete-orphan")


class ProductMaterial(Base):
    """Component of a footwear Bill of Materials (BOM)"""
    __tablename__ = "product_materials"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="SET NULL"), nullable=True)
    component_name = Column(String(150), nullable=False) # e.g. Vamp, Quarter, Lining, Insole, Sole
    category = Column(String(100), nullable=False)
    scenario = Column(String(100), default="Baseline")
    
    consumption_per_pair = Column(Float, nullable=False) # e.g., 2.5
    purchase_unit = Column(String(50), default="sq.ft")
    costing_unit = Column(String(50), default="sq.ft")
    conversion_factor = Column(Float, default=1.0) # conversion between purchase and costing
    wastage_percentage = Column(Float, default=15.0) # 15% cutting loss
    unit_price = Column(Float, nullable=False)
    extended_cost = Column(Float, nullable=False) # consumption * (1 + wastage/100) * unit_price
    notes = Column(String(255), nullable=True)

    product = relationship("Product", back_populates="materials")
    material = relationship("Material", back_populates="product_materials")


class ConstructionOperation(Base):
    """Manufacturing sequence step for costing operations"""
    __tablename__ = "construction_operations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True)
    sequence_number = Column(Integer, nullable=False)
    department = Column(String(100), nullable=False) # Cutting, Closing, Lasting, Assembly, Finishing
    operation_title = Column(String(200), nullable=False)
    grade = Column(String(100), default="Grade B (Skilled)")
    machine = Column(String(150), default="Travelling Head Clicker")
    operation_time_sam = Column(Float, nullable=False) # Standard Allowed Minutes
    labour_rate_per_hour = Column(Float, nullable=False, default=15.00)
    machine_rate_per_hour = Column(Float, nullable=False, default=5.00)
    calculated_labour_cost = Column(Float, nullable=False)
    calculated_machine_cost = Column(Float, nullable=False)
    calculated_cost = Column(Float, nullable=False) # labour + machine
    scenario = Column(String(100), default="Baseline")

    product = relationship("Product", back_populates="operations")


class CostingScenario(Base):
    """Saved optimization scenario comparing against baseline"""
    __tablename__ = "costing_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    material_cost_per_pair = Column(Float, nullable=False)
    labour_cost_per_pair = Column(Float, nullable=False)
    machine_cost_per_pair = Column(Float, nullable=False)
    overhead_cost_per_pair = Column(Float, nullable=False)
    total_cost_per_pair = Column(Float, nullable=False)
    baseline_cost_per_pair = Column(Float, nullable=False)
    savings_per_pair = Column(Float, nullable=False)
    savings_percentage = Column(Float, nullable=False)
    batch_savings = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="scenarios")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
