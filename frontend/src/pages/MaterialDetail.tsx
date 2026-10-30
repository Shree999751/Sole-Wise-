import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Material, PriceHistory } from '../types';
import { ValidationBadge } from '../components/Badge';
import {
  ArrowLeft,
  Calendar,
  Building2,
  DollarSign,
  FileCheck2,
  Sparkles,
  GitCompare,
  Clock,
  ShieldCheck,
  Download,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface MaterialDetailProps {
  materialId: number;
  onBack: () => void;
  onCompareWith: (materialId: number) => void;
  onFindAlternatives: (materialId: number) => void;
}

export const MaterialDetail: React.FC<MaterialDetailProps> = ({
  materialId,
  onBack,
  onCompareWith,
  onFindAlternatives
}) => {
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
  }, [materialId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getMaterial(materialId);
      setMaterial(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load material details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-[#736E65]">Loading technical datasheet & price history...</p>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="p-6 bg-[#FAF5F0] border border-[#E8C4B8] rounded-xl text-[#B93815]">
        <p className="font-semibold">Error loading material</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={onBack} className="mt-3 text-xs underline font-medium">Return to library</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back navigation & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6E0D6]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C574F] hover:text-[#201E1B] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Material Library
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={() => onCompareWith(material.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#DCD5C9] text-[#201E1B] hover:bg-[#F3EFEA] transition shadow-xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-[#736E65]" />
            Compare This Material
          </button>
          <button
            onClick={() => onFindAlternatives(material.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#D97757] text-white hover:bg-[#C26344] transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Find Alternatives
          </button>
        </div>
      </div>

      {/* Main Material Overview Card */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E6E0D6] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#F3EFEA] text-[#5C574F]">
                {material.category}
              </span>
              <ValidationBadge status={material.validation_status} />
              {material.is_archived && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FAF0EC] text-[#B93815]">
                  Archived
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#201E1B] mt-2">{material.name}</h1>
            <p className="text-xs text-[#736E65] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Type: <strong className="text-[#201E1B]">{material.material_type}</strong></span>
              <span>• Grade: <strong className="text-[#201E1B]">{material.grade}</strong></span>
              {material.color && <span>• Color: <strong className="text-[#201E1B]">{material.color}</strong></span>}
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E6E0D6] sm:text-right min-w-[180px]">
            <p className="text-[11px] font-medium text-[#736E65] uppercase tracking-wider">Current Quotation</p>
            <p className="text-2xl font-serif font-bold text-[#201E1B] mt-0.5">
              ₹{material.price_per_unit.toFixed(2)}
              <span className="text-xs font-normal text-[#736E65] ml-1">/ {material.purchase_unit}</span>
            </p>
            <p className="text-[11px] text-[#736E65] mt-1">{material.price_basis} • MOQ: {material.moq}</p>
          </div>
        </div>

        {/* Note / Description */}
        {material.notes && (
          <div className="mt-4 p-3 bg-[#FAF9F5] border border-[#E6E0D6] rounded-lg text-xs text-[#5C574F]">
            <strong className="font-semibold text-[#201E1B]">Engineering Notes:</strong> {material.notes}
          </div>
        )}
      </div>

      {/* Grid: Technical Specifications & Supplier/Commerce */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Specification Matrix */}
        <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-xl border border-[#E6E0D6] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
            <h2 className="text-sm font-serif font-bold text-[#201E1B] flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#D97757]" />
              Technical Properties & Laboratory Metrics
            </h2>
            <span className="text-[11px] text-[#736E65]">SATRA / ISO Standard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Thickness</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.thickness_mm ? `${material.thickness_mm} mm` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Bally Flex Resistance</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.bally_flex_cycles ? `${material.bally_flex_cycles.toLocaleString()} cycles` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Tensile Strength</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.tensile_strength_mpa ? `${material.tensile_strength_mpa} MPa` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Tear Strength</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.tear_strength_n ? `${material.tear_strength_n} N` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Breathability / Vapour Permeability</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.breathability_mg_cm2_h ? `${material.breathability_mg_cm2_h} mg/cm²·h` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Water Resistance Rating</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.water_resistance_grade || 'Standard'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Wet Slip Resistance (CoF)</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.slip_resistance_wet_cof ? `${material.slip_resistance_wet_cof}` : '—'}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#F0ECE1]">
              <span className="text-[#736E65] text-[11px] block">Energy Rebound Resilience</span>
              <span className="font-bold text-[#201E1B] text-sm">
                {material.rebound_resilience_pct ? `${material.rebound_resilience_pct}%` : '—'}
              </span>
            </div>
          </div>

          {/* Test report summary */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-[#736E65] uppercase tracking-wider block mb-1">
              Test Report Summary & Standards
            </span>
            <p className="text-xs text-[#5C574F] bg-[#FAF9F5] p-3 rounded-lg border border-[#F0ECE1] leading-relaxed">
              {material.test_report_summary || 'Standard manufacturer technical documentation.'}
            </p>
          </div>

          {material.source_reference && (
            <div className="text-[11px] text-[#736E65]">
              Source reference: {material.source_reference}
            </div>
          )}
        </div>

        {/* Commercial Specifications & Supplier Card */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-xl border border-[#E6E0D6] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
              <h2 className="text-sm font-serif font-bold text-[#201E1B] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#D97757]" />
                Supplier & Procurement Details
              </h2>
              <span className="text-[11px] font-medium text-[#2E6B4F] bg-[#EBF5EE] px-2 py-0.5 rounded">
                Active Contract
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                <span className="text-[#736E65]">Supplier Name:</span>
                <span className="font-semibold text-[#201E1B]">{material.supplier_name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                <span className="text-[#736E65]">Incoterms Price Basis:</span>
                <span className="font-medium text-[#201E1B]">{material.price_basis}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                <span className="text-[#736E65]">Minimum Order Quantity (MOQ):</span>
                <span className="font-medium text-[#201E1B]">{material.moq} {material.purchase_unit}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                <span className="text-[#736E65]">Manufacturing Lead Time:</span>
                <span className="font-medium text-[#201E1B]">{material.lead_time_days} days</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#736E65]">Costing Unit Conversion:</span>
                <span className="font-medium text-[#201E1B]">1 {material.purchase_unit} = 1 {material.costing_unit}</span>
              </div>
            </div>
          </div>

          {/* Price History Timeline */}
          <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-xl border border-[#E6E0D6] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1] mb-3">
              <h2 className="text-sm font-serif font-bold text-[#201E1B] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D97757]" />
                Audited Price Change History
              </h2>
              <span className="text-[11px] text-[#736E65]">Who & When</span>
            </div>

            {material.price_history && material.price_history.length > 0 ? (
              <div className="space-y-2.5">
                {material.price_history.map((h, i) => (
                  <div key={h.id || i} className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-[#FAF9F5] border border-[#F0ECE1]">
                    <div>
                      <div className="font-semibold text-[#201E1B]">
                        ₹{h.price_per_unit.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-[#736E65] mt-0.5">
                        {h.reason || 'Price adjustment'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#736E65]">
                      <div>{h.effective_date}</div>
                      <div className="text-[#201E1B] font-medium">{h.changed_by}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#736E65] py-3 text-center">Initial price entry recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
