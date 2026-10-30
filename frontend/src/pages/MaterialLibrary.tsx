import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Material } from '../types';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  GitCompare,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  TrendingDown,
  Tag
} from 'lucide-react';

interface MaterialLibraryProps {
  onSelectMaterial: (material: Material) => void;
  onOpenCompareWith?: (materialId: number) => void;
}

const CATEGORIES = [
  'All',
  'Upper - Natural',
  'Upper - Synthetic',
  'Lining - Textile',
  'Lining - Leather',
  'Insole - Board / Foam',
  'Outsole - Rubber / TPU',
  'Midsole - EVA / PU',
  'Adhesives & Accessories'
];

const UNITS = [
  'per sq. ft.',
  'per pair',
  'per meter',
  'per kg',
  'per sheet'
];

export const MaterialLibrary: React.FC<MaterialLibraryProps> = ({
  onSelectMaterial,
  onOpenCompareWith
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Form matching light UI and dual properties specification
  const [formData, setFormData] = useState({
    name: '',
    category: 'Upper - Natural',
    price_per_unit: 140,
    purchase_unit: 'per sq. ft.',
    thickness_mm: 1.3,
    notes: 'High durability, matte finish, water repellent',

    // Alternative Material
    alternative_name: '',
    alternative_price: 55,
    alternative_thickness_mm: 1.2,
    alternative_properties: 'High tensile tear strength, lightweight non-woven PU backing, uniform cut yield'
  });

  useEffect(() => {
    loadMaterials();
  }, [selectedCategory, sortBy, sortOrder]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const res = await api.getMaterials(params);
      setMaterials(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load footwear materials');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormData({
      name: '',
      category: selectedCategory !== 'All' ? selectedCategory : 'Upper - Natural',
      price_per_unit: 140,
      purchase_unit: 'per sq. ft.',
      thickness_mm: 1.3,
      notes: 'High durability, matte finish, water repellent',
      alternative_name: '',
      alternative_price: 55,
      alternative_thickness_mm: 1.2,
      alternative_properties: 'High tensile tear strength, lightweight non-woven PU backing, uniform cut yield'
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (material: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      price_per_unit: material.price_per_unit,
      purchase_unit: material.purchase_unit.startsWith('per ') ? material.purchase_unit : `per ${material.purchase_unit}`,
      thickness_mm: material.thickness_mm ?? 1.2,
      notes: material.notes || '',
      alternative_name: material.alternative_name || '',
      alternative_price: material.alternative_price ?? Math.round(material.price_per_unit * 0.6),
      alternative_thickness_mm: material.alternative_thickness_mm ?? (material.thickness_mm ?? 1.2),
      alternative_properties: material.alternative_properties || ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleDelete = async (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteMaterial(id);
      loadMaterials();
    } catch (err: any) {
      alert(err.message || 'Failed to delete material');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Material name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.price_per_unit === undefined || isNaN(formData.price_per_unit) || formData.price_per_unit < 0) {
      errors.price_per_unit = 'Valid price in INR (₹) is required';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const cleanUnit = formData.purchase_unit.replace(/^per\s+/i, '').trim();

      const payload: any = {
        name: formData.name.trim(),
        category: formData.category,
        material_type: formData.category,
        grade: 'Standard',
        purchase_unit: cleanUnit,
        costing_unit: cleanUnit,
        price_per_unit: Number(formData.price_per_unit),
        thickness_mm: formData.thickness_mm ? Number(formData.thickness_mm) : undefined,
        currency: 'INR',
        price_basis: 'Ex-Factory',
        notes: formData.notes?.trim() || undefined,

        // Best Alternative
        alternative_name: formData.alternative_name?.trim() || undefined,
        alternative_price: formData.alternative_price ? Number(formData.alternative_price) : undefined,
        alternative_thickness_mm: formData.alternative_thickness_mm ? Number(formData.alternative_thickness_mm) : undefined,
        alternative_properties: formData.alternative_properties?.trim() || undefined,

        moq: 100,
        lead_time_days: 14
      };

      if (editingMaterial) {
        await api.updateMaterial(editingMaterial.id, payload);
      } else {
        await api.createMaterial(payload);
      }
      setIsAddEditOpen(false);
      await loadMaterials();
    } catch (err: any) {
      alert(err.message || 'Failed to save material and alternative');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    if (materials.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];

    const aoa: any[][] = [
      ['FOOTWEAR MATERIALS & ALTERNATIVES CATALOGUE'],
      [`Export Date: ${dateStr}`, `Total Materials: ${materials.length}`],
      [],
      [
        'ID',
        'Material Name',
        'Category',
        'Price (INR)',
        'Unit',
        'Thickness (mm)',
        'Physical Properties & Specs',
        'Best Alternative Name',
        'Alt Price (INR)',
        'Alt Thickness (mm)',
        'Alternative Properties & Specs',
        'Savings (INR)',
        'Savings %'
      ]
    ];

    materials.forEach((m) => {
      const altPrice = m.alternative_price ?? 0;
      const diff = altPrice > 0 ? Number((m.price_per_unit - altPrice).toFixed(2)) : 0;
      const pct = m.price_per_unit > 0 && altPrice > 0 ? `${(((m.price_per_unit - altPrice) / m.price_per_unit) * 100).toFixed(1)}%` : '0.0%';

      aoa.push([
        m.id,
        m.name,
        m.category,
        Number(m.price_per_unit.toFixed(2)),
        m.purchase_unit,
        m.thickness_mm ? Number(m.thickness_mm) : 'N/A',
        m.notes || '',
        m.alternative_name || 'N/A',
        altPrice > 0 ? Number(altPrice.toFixed(2)) : 'N/A',
        m.alternative_thickness_mm ? Number(m.alternative_thickness_mm) : 'N/A',
        m.alternative_properties || '',
        diff,
        pct
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 8 },  // ID
      { wch: 28 }, // Material Name
      { wch: 20 }, // Category
      { wch: 14 }, // Price (INR)
      { wch: 14 }, // Unit
      { wch: 16 }, // Thickness (mm)
      { wch: 38 }, // Physical Properties
      { wch: 28 }, // Best Alternative Name
      { wch: 16 }, // Alt Price (INR)
      { wch: 18 }, // Alt Thickness (mm)
      { wch: 40 }, // Alternative Properties
      { wch: 16 }, // Savings (INR)
      { wch: 14 }  // Savings %
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Materials & Alternatives');
    XLSX.writeFile(wb, `materials_and_alternatives_${dateStr}.xlsx`);
  };

  // Live savings calculation for modal
  const modalDiff = formData.price_per_unit && formData.alternative_price
    ? formData.price_per_unit - formData.alternative_price
    : 0;
  const modalSavingsPct = formData.price_per_unit > 0 && modalDiff > 0
    ? ((modalDiff / formData.price_per_unit) * 100).toFixed(1)
    : null;

  // Filtered by search
  const filteredMaterials = materials.filter(m => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.alternative_name && m.alternative_name.toLowerCase().includes(query)) ||
      (m.notes && m.notes.toLowerCase().includes(query)) ||
      (m.alternative_properties && m.alternative_properties.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-[#E8E4DC]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#201E1B] font-serif">
            Footwear Materials & Alternatives
          </h1>
          <p className="text-xs sm:text-sm text-[#736E65] mt-0.5">
            Manage your footwear materials and their cost-saving technical alternatives with dual physical specifications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {materials.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-[#2E6B34] text-white hover:bg-[#235328] transition-all shadow-2xs active:scale-98"
              title="Export materials to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel (.xlsx)
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-[#D97757] text-white hover:bg-[#C96442] transition-all shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Material & Alternative
          </button>
        </div>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8477]" />
          <input
            type="text"
            placeholder="Search material, category, alternative or properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4DC] rounded-xl text-xs font-medium text-[#201E1B] placeholder:text-[#8C8477] focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#201E1B] text-[#FAF9F5] shadow-2xs font-semibold'
                  : 'bg-white text-[#736E65] border border-[#E8E4DC] hover:border-[#D8D2C7] hover:text-[#201E1B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadMaterials} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E8E4DC] p-16 text-center shadow-2xs">
          <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#736E65]">Loading materials & alternatives...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#E8E4DC] p-14 text-center shadow-2xs max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF3EF] text-[#D97757] flex items-center justify-center mx-auto mb-4 border border-[#F0D9CE]">
            <Layers className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-[#201E1B] font-serif">
            {search ? 'No matching materials found' : 'No materials added yet'}
          </h3>
          <p className="text-xs text-[#736E65] max-w-sm mx-auto mt-1.5 leading-relaxed">
            {search
              ? 'Try modifying your search or picking another category filter.'
              : 'Add your baseline footwear materials along with their best alternatives to analyze unit costs, thickness, and properties.'}
          </p>
          <div className="mt-5">
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#E8E4DC] text-[#736E65] hover:bg-[#F3EFEA]"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#D97757] text-white hover:bg-[#C96442] shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Add Your First Material & Alternative
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Materials & Alternatives Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((m) => {
            const hasAlt = Boolean(m.alternative_name);
            const altPrice = m.alternative_price ?? 0;
            const diff = m.price_per_unit - altPrice;
            const savingsPct = m.price_per_unit > 0 && diff > 0 ? ((diff / m.price_per_unit) * 100).toFixed(1) : null;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMaterial(m)}
                className="bg-white rounded-2xl border border-[#E8E4DC] p-5 shadow-2xs hover:border-[#D8D2C7] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                {/* Top Section: Primary Material Details */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F3EFEA] text-[#736E65] uppercase tracking-wider border border-[#E8E4DC]">
                          {m.category}
                        </span>
                        {m.thickness_mm && (
                          <span className="text-[11px] font-semibold text-[#8C8477]">
                            {m.thickness_mm} mm
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-[#201E1B] font-serif group-hover:text-[#D97757] transition-colors">
                        {m.name}
                      </h2>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-[#201E1B] font-sans">
                        ₹{m.price_per_unit.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#8C8477] font-medium">
                        {m.purchase_unit.startsWith('per') ? m.purchase_unit : `per ${m.purchase_unit}`}
                      </div>
                    </div>
                  </div>

                  {/* Primary Physical Properties & Specs */}
                  {m.notes && (
                    <div className="text-xs text-[#5C574F] mt-2.5 bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E8E4DC] flex items-start gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#8C8477] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#201E1B]">Properties & Specs: </span>
                        <span>{m.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Middle Section: Best Alternative Box with its own Properties & Specs */}
                {hasAlt && (
                  <div className="p-3.5 bg-[#FAF3EF] rounded-xl border border-[#F0D9CE] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C96442]">
                        <Sparkles className="w-3.5 h-3.5 text-[#D97757] shrink-0" />
                        Best Alternative Material
                      </div>

                      {diff > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3EA] text-[#2E6B34] border border-[#CDE5CD]">
                          Saves {savingsPct}% (-₹{diff.toFixed(2)}/unit)
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xs font-bold text-[#201E1B] truncate">
                        {m.alternative_name}
                        {m.alternative_thickness_mm && (
                          <span className="font-normal text-[#736E65] ml-1.5 text-[11px]">
                            ({m.alternative_thickness_mm} mm)
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#201E1B] shrink-0">
                        ₹{altPrice.toFixed(2)} <span className="text-[10px] text-[#736E65] font-normal">{m.purchase_unit.startsWith('per') ? m.purchase_unit : `per ${m.purchase_unit}`}</span>
                      </div>
                    </div>

                    {/* Alternative Properties & Specs */}
                    {m.alternative_properties && (
                      <div className="text-[11px] text-[#736E65] bg-white/80 p-2 rounded-lg border border-[#F0D9CE]/60 flex items-start gap-1.5">
                        <span className="font-semibold text-[#201E1B] shrink-0">Alt Specs:</span>
                        <span>{m.alternative_properties}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div
                  className="flex items-center justify-between pt-3 border-t border-[#E8E4DC] text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {onOpenCompareWith && (
                      <button
                        onClick={() => onOpenCompareWith(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3EFEA] text-[#201E1B] hover:bg-[#EAE4DC] border border-[#E8E4DC] font-semibold transition-colors text-xs"
                      >
                        <GitCompare className="w-3.5 h-3.5 text-[#D97757]" />
                        Compare Both
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEdit(m, e)}
                      title="Edit material & alternative"
                      className="p-1.5 rounded-lg text-[#8C8477] hover:text-[#201E1B] hover:bg-[#F3EFEA] transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(m.id, m.name, e)}
                      title="Delete material"
                      className="p-1.5 rounded-lg text-[#8C8477] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Material & Alternative Modal (Claude Light UI) */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#201E1B]/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-2xl bg-white border border-[#E8E4DC] shadow-2xl rounded-2xl p-4 sm:p-6 md:p-7 text-[#201E1B] space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FAF3EF] text-[#D97757] border border-[#F0D9CE] flex items-center justify-center font-bold text-base shadow-2xs">
                  +
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#201E1B] tracking-tight font-serif">
                    {editingMaterial ? 'Edit Material & Alternative' : 'Add New Material & Alternative'}
                  </h2>
                  <p className="text-xs text-[#736E65] mt-0.5">
                    Configure specifications, prices and properties for both baseline and alternative.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 rounded-xl text-[#8C8477] hover:text-[#201E1B] hover:bg-[#F3EFEA] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="space-y-5 text-xs font-sans">
              {/* Section 1: Baseline Material */}
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E4DC] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#201E1B] text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#D97757]" />
                    1. Baseline Footwear Material
                  </div>
                  <span className="text-[11px] text-[#736E65] font-medium">Primary specification</span>
                </div>

                {/* Row 1: Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nubuck Leather"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-[#201E1B] placeholder-[#8C8477] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all ${
                        formErrors.name ? 'border-rose-400' : 'border-[#E8E4DC]'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-rose-600 text-[10px] mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Price in INR, Unit & Thickness */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Price in INR (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8477] font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="140"
                        value={formData.price_per_unit || ''}
                        onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                        className={`w-full pl-7 pr-3 py-2.5 bg-white border rounded-xl text-[#201E1B] font-bold focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all ${
                          formErrors.price_per_unit ? 'border-rose-400' : 'border-[#E8E4DC]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Unit *
                    </label>
                    <select
                      value={formData.purchase_unit}
                      onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g. 1.3"
                      value={formData.thickness_mm || ''}
                      onChange={(e) => setFormData({ ...formData, thickness_mm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Physical Properties & Specs for Primary Material */}
                <div>
                  <label className="block text-[#5C574F] font-semibold mb-1">
                    Physical Properties & Specs (Primary) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High durability, matte finish, water repellent, breathable grain"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] placeholder-[#8C8477] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                  />
                </div>
              </div>

              {/* Section 2: Best Alternative Material */}
              <div className="p-4 rounded-xl bg-[#FAF3EF] border border-[#F0D9CE] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#C96442] text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
                    2. Best Alternative Material
                  </div>
                  <span className="text-[11px] text-[#736E65] font-medium">Cost optimization substitute</span>
                </div>

                {/* Row 1: Alternative Name, Price & Thickness */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Alternative Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Microfiber Leather"
                      value={formData.alternative_name}
                      onChange={(e) => setFormData({ ...formData, alternative_name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] placeholder-[#8C8477] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Alternative Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8477] font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="55"
                        value={formData.alternative_price || ''}
                        onChange={(e) => setFormData({ ...formData, alternative_price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] font-bold focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5C574F] font-semibold mb-1">
                      Alt Thickness (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g. 1.2"
                      value={formData.alternative_thickness_mm || ''}
                      onChange={(e) => setFormData({ ...formData, alternative_thickness_mm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Physical Properties & Specs for Alternative Material */}
                <div>
                  <label className="block text-[#5C574F] font-semibold mb-1">
                    Alternative Physical Properties & Specs *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. High tensile tear strength, lightweight non-woven PU backing, uniform cut yield"
                    value={formData.alternative_properties}
                    onChange={(e) => setFormData({ ...formData, alternative_properties: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DC] rounded-xl text-[#201E1B] placeholder-[#8C8477] font-medium focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                  />
                </div>
              </div>

              {/* Live Savings Callout Banner */}
              {modalDiff > 0 && (
                <div className="p-3 bg-[#EAF3EA] rounded-xl border border-[#CDE5CD] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E6B34] shrink-0" />
                    <span className="text-xs font-semibold text-[#2E6B34]">
                      Potential Unit Savings:
                    </span>
                    <span className="text-xs font-bold text-[#1E5224]">
                      ₹{modalDiff.toFixed(2)} / unit ({modalSavingsPct}% reduction)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#2E6B34] tracking-wider">
                    Instant Benefit
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E4DC] text-[#736E65] hover:bg-[#F3EFEA] hover:text-[#201E1B] font-semibold transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#D97757] hover:bg-[#C96442] text-white font-semibold transition-all shadow-xs active:scale-98 disabled:opacity-50 text-center"
                >
                  {submitting ? 'Saving...' : 'Save Material & Alternative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
