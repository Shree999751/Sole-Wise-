import {
  Material, Supplier, Product, ProductMaterial, ConstructionOperation,
  OverviewData, ComparisonItem, RecommendationCandidate, CostSheet
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: options.body instanceof FormData ? undefined : headers
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (errJson.detail) {
            errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
          }
        } catch {
          if (text.includes('ECONNREFUSED') || text.includes('proxy error')) {
            errorMsg = 'Backend server is not running on port 8000. Run: python run_server.py';
          } else if (text.length > 0 && text.length < 200) {
            errorMsg = text;
          }
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('ECONNREFUSED')) {
      throw new Error('Cannot connect to backend server on port 8000. Start with: python run_server.py (or double-click start_dev.bat)');
    }
    throw err;
  }
}

export const api = {
  // Overview
  getOverview: () => request<OverviewData>('/overview'),

  // Materials
  getMaterials: (params: {
    search?: string;
    category?: string;
    supplier_id?: number;
    validation_status?: string;
    include_archived?: boolean;
    sort_by?: string;
    sort_order?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.supplier_id) query.append('supplier_id', String(params.supplier_id));
    if (params.validation_status) query.append('validation_status', params.validation_status);
    if (params.include_archived) query.append('include_archived', 'true');
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    return request<Material[]>(`/materials?${query.toString()}`);
  },

  getCategories: () => request<{ categories: string[]; counts: Record<string, number> }>('/materials/categories'),

  getMaterial: (id: number) => request<Material>(`/materials/${id}`),

  createMaterial: (data: Partial<Material> & { changed_by?: string; change_reason?: string }) =>
    request<Material>('/materials', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateMaterial: (id: number, data: Partial<Material> & { changed_by?: string; change_reason?: string }) =>
    request<Material>(`/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteMaterial: (id: number) =>
    request<{ status: string; message: string }>(`/materials/${id}`, {
      method: 'DELETE'
    }),

  toggleArchiveMaterial: (id: number) =>
    request<{ status: string; is_archived: boolean }>(`/materials/${id}/archive`, {
      method: 'POST'
    }),

  importMaterialsCSV: (formData: FormData, commit: boolean = false) => {
    return request<any>(`/materials/import/csv?commit=${commit}`, {
      method: 'POST',
      body: formData
    });
  },

  // Comparison
  compareMaterials: (payload: { material_ids: number[]; consumption_per_pair?: number; batch_size?: number }) =>
    request<{
      baseline_material: { id: number; name: string; category: string; unit: string; price: number };
      simulation_parameters: { consumption_per_pair: number; batch_size: number };
      comparison_matrix: ComparisonItem[];
    }>('/compare', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Recommendation Engine
  getRecommendations: (payload: {
    base_material_id: number;
    max_budget?: number;
    min_tensile_strength_mpa?: number;
    min_bally_flex_cycles?: number;
    required_water_resistance?: string;
    priority?: string;
  }) =>
    request<{
      base_material: any;
      constraints_applied: any;
      total_evaluated: number;
      qualifying_alternatives_count: number;
      excluded_alternatives_count: number;
      recommendations: RecommendationCandidate[];
      excluded: RecommendationCandidate[];
    }>('/recommendations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Products & BOM
  getProducts: () => request<Product[]>('/products'),

  getProduct: (id: number) => request<Product>(`/products/${id}`),

  createProduct: (data: Partial<Product>) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateProduct: (id: number, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteProduct: (id: number) =>
    request<{ status: string; message: string }>(`/products/${id}`, {
      method: 'DELETE'
    }),

  addBOMItem: (productId: number, data: Partial<ProductMaterial>) =>
    request<ProductMaterial>(`/products/${productId}/bom`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateBOMItem: (productId: number, bomId: number, data: Partial<ProductMaterial>) =>
    request<ProductMaterial>(`/products/${productId}/bom/${bomId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteBOMItem: (productId: number, bomId: number) =>
    request<{ status: string; message: string }>(`/products/${productId}/bom/${bomId}`, {
      method: 'DELETE'
    }),

  saveScenario: (productId: number, scenarioData: any) =>
    request<any>(`/products/${productId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(scenarioData)
    }),

  // Construction Operations
  getOperations: (productId?: number, scenario: string = 'Baseline') => {
    const q = new URLSearchParams();
    if (productId) q.append('product_id', String(productId));
    if (scenario) q.append('scenario', scenario);
    return request<ConstructionOperation[]>(`/operations?${q.toString()}`);
  },

  createOperation: (data: Partial<ConstructionOperation>) =>
    request<ConstructionOperation>('/operations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateOperation: (id: number, data: Partial<ConstructionOperation>) =>
    request<ConstructionOperation>(`/operations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteOperation: (id: number) =>
    request<{ status: string; message: string }>(`/operations/${id}`, {
      method: 'DELETE'
    }),

  duplicateOperation: (id: number) =>
    request<ConstructionOperation>(`/operations/${id}/duplicate`, {
      method: 'POST'
    }),

  reorderOperations: (items: { id: number; sequence_number: number }[]) =>
    request<{ status: string }>('/operations/reorder', {
      method: 'POST',
      body: JSON.stringify(items)
    }),

  // Suppliers
  getSuppliers: (params?: { search?: string; country?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.country) q.append('country', params.country);
    return request<Supplier[]>(`/suppliers?${q.toString()}`);
  },

  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateSupplier: (id: number, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteSupplier: (id: number) =>
    request<{ status: string; message: string }>(`/suppliers/${id}`, {
      method: 'DELETE'
    }),

  // Cost Optimizer Breakdown
  getProductCostBreakdown: (productId: number, params?: {
    scenario?: string;
    overhead_pct?: number;
    tooling_cost?: number;
    packaging_cost?: number;
    qc_cost?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.scenario) q.append('scenario', params.scenario);
    if (params?.overhead_pct !== undefined) q.append('overhead_pct', String(params.overhead_pct));
    if (params?.tooling_cost !== undefined) q.append('tooling_cost', String(params.tooling_cost));
    if (params?.packaging_cost !== undefined) q.append('packaging_cost', String(params.packaging_cost));
    if (params?.qc_cost !== undefined) q.append('qc_cost', String(params.qc_cost));
    return request<{
      product: any;
      scenario: string;
      cost_sheet: CostSheet;
      variance_analysis: any;
      bom_items: any[];
      operations: any[];
      parameters: any;
    }>(`/cost-optimizer/${productId}?${q.toString()}`);
  },

  simulateCostScenario: (payload: any) =>
    request<any>('/cost-optimizer/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Settings
  getSettings: () => request<Record<string, string>>('/settings'),

  updateSettings: (data: Record<string, string>) =>
    request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};
