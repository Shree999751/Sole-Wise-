export interface Material {
  id: number;
  name: string;
  category: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  material_type: string;
  grade: string;

  // Physical & Mechanical
  thickness_mm?: number | null;
  density_g_cm3?: number | null;
  hardness_shore?: string | null;
  weight_gsm?: number | null;
  flexibility_rating?: string | null;
  durability_rating?: string | null;

  // Footwear Specs
  bally_flex_cycles?: number | null;
  tensile_strength_mpa?: number | null;
  tear_strength_n?: number | null;
  breathability_mg_cm2_h?: number | null;
  water_absorption_pct?: number | null;
  water_resistance_grade?: string | null;
  slip_resistance_dry_cof?: number | null;
  slip_resistance_wet_cof?: number | null;
  abrasion_resistance_din_mm3?: number | null;
  rebound_resilience_pct?: number | null;

  // Adhesive specific
  solid_content_pct?: number | null;
  viscosity_mpa_s?: number | null;
  open_time_min?: number | null;
  bonding_strength_n_mm?: number | null;

  // Commercial
  appearance_finish?: string | null;
  color?: string | null;
  purchase_unit: string;
  costing_unit: string;
  price_per_unit: number;
  currency: string;
  price_basis: string;
  effective_date: string;
  moq: number;
  lead_time_days: number;

  // Alternative Material
  alternative_name?: string | null;
  alternative_price?: number | null;
  alternative_properties?: string | null;
  alternative_thickness_mm?: number | null;
  alternative_id?: number | null;

  // Documents & validation
  technical_datasheet_url?: string | null;
  test_report_summary?: string | null;
  source_reference?: string | null;
  validation_status: 'Verified Lab Test' | 'Supplier Declared' | 'User Entered' | string;
  is_archived: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  price_history?: PriceHistory[];
}

export interface PriceHistory {
  id: number;
  material_id: number;
  price_per_unit: number;
  currency: string;
  price_basis: string;
  effective_date: string;
  changed_by: string;
  reason?: string | null;
  created_at: string;
}

export interface SupplierQuotation {
  id: number;
  supplier_id: number;
  material_id: number;
  quoted_price: number;
  currency: string;
  moq: number;
  lead_time_days: number;
  quotation_date: string;
  expiration_date?: string | null;
  price_basis: string;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  country: string;
  city?: string | null;
  rating: number;
  is_approved: boolean;
  certifications?: string | null;
  notes?: string | null;
  created_at: string;
  quotations?: SupplierQuotation[];
}

export interface ProductMaterial {
  id: number;
  product_id: number;
  material_id?: number | null;
  material_name?: string | null;
  component_name: string;
  category: string;
  consumption_per_pair: number;
  purchase_unit: string;
  costing_unit: string;
  conversion_factor: number;
  wastage_percentage: number;
  unit_price: number;
  extended_cost: number;
  scenario: string;
  notes?: string | null;
}

export interface ConstructionOperation {
  id: number;
  product_id?: number | null;
  sequence_number: number;
  department: string;
  operation_title: string;
  grade: string;
  machine: string;
  operation_time_sam: number;
  labour_rate_per_hour: number;
  machine_rate_per_hour: number;
  calculated_labour_cost: number;
  calculated_machine_cost: number;
  calculated_cost: number;
  scenario: string;
}

export interface CostingScenario {
  id: number;
  product_id: number;
  name: string;
  description?: string | null;
  material_cost_per_pair: number;
  labour_cost_per_pair: number;
  machine_cost_per_pair: number;
  overhead_cost_per_pair: number;
  total_cost_per_pair: number;
  baseline_cost_per_pair: number;
  savings_per_pair: number;
  savings_percentage: number;
  batch_savings: number;
  created_at: string;
}

export interface Product {
  id: number;
  style_number: string;
  name: string;
  category: string;
  target_customer: string;
  size_range: string;
  currency: string;
  target_cost: number;
  batch_size: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  materials: ProductMaterial[];
  operations: ConstructionOperation[];
  scenarios: CostingScenario[];
}

export interface CostSheet {
  total_material_cost: number;
  total_labour_cost: number;
  total_machine_cost: number;
  prime_cost: number;
  overhead_cost: number;
  tooling_cost_per_pair: number;
  packaging_cost_per_pair: number;
  qc_cost_per_pair: number;
  total_cost_per_pair: number;
  total_batch_cost: number;
  total_sam_minutes: number;
  batch_size: number;
  category_material_costs: Record<string, number>;
  department_operation_costs: Record<string, number>;
}

export interface ComparisonItem {
  id: number;
  name: string;
  category: string;
  material_type: string;
  grade: string;
  supplier_name: string;
  supplier_country: string;
  purchase_unit: string;
  costing_unit: string;
  price_per_unit: number;
  currency: string;
  price_basis: string;
  effective_date: string;
  moq: number;
  lead_time_days: number;

  // Alternative Material
  alternative_name?: string | null;
  alternative_price?: number | null;
  alternative_properties?: string | null;
  alternative_thickness_mm?: number | null;
  alternative_id?: number | null;

  thickness_mm?: number | null;
  density_g_cm3?: number | null;
  hardness_shore?: string | null;
  weight_gsm?: number | null;
  flexibility_rating?: string | null;
  durability_rating?: string | null;
  bally_flex_cycles?: number | null;
  tensile_strength_mpa?: number | null;
  tear_strength_n?: number | null;
  breathability_mg_cm2_h?: number | null;
  water_absorption_pct?: number | null;
  water_resistance_grade?: string | null;
  slip_resistance_dry_cof?: number | null;
  slip_resistance_wet_cof?: number | null;
  abrasion_resistance_din_mm3?: number | null;
  rebound_resilience_pct?: number | null;

  validation_status: string;
  test_report_summary?: string | null;
  missing_fields: string[];
  notes?: string | null;

  consumption_per_pair: number;
  cost_per_pair: number;
  batch_cost: number;
  diff_unit_price: number;
  diff_pct: number;
  savings_per_pair: number;
  savings_batch: number;
  is_baseline: boolean;
}

export interface RecommendationCandidate {
  candidate_id: number;
  candidate_name: string;
  candidate_type: string;
  candidate_supplier: string;
  supplier_country: string;
  candidate_price: number;
  candidate_unit: string;
  passed_mandatory: boolean;
  failure_reasons: string[];
  missing_data_warnings: string[];
  compatibility_score: number;
  cost_difference: number;
  cost_saving_pct: number;
  lab_validation_required: boolean;
  validation_status: string;
  recommendation_reasons: string[];
  thickness_mm?: number | null;
  lead_time_days: number;
  moq: number;
}

export interface OverviewData {
  metrics: {
    total_materials: number;
    total_suppliers: number;
    total_products: number;
    total_scenarios: number;
    total_potential_savings: number;
  };
  categories_breakdown: { category: string; count: number }[];
  validation_breakdown: { status: string; count: number }[];
  recent_price_changes: {
    id: number;
    material_id: number;
    material_name: string;
    price_per_unit: number;
    currency: string;
    effective_date: string;
    changed_by: string;
    reason?: string | null;
  }[];
  active_scenarios: {
    id: number;
    product_id: number;
    product_name: string;
    name: string;
    savings_per_pair: number;
    savings_percentage: number;
    batch_savings: number;
  }[];
}
