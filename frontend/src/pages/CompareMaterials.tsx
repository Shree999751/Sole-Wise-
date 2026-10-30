import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Material, ComparisonItem } from '../types';
import * as XLSX from 'xlsx';
import {
  GitCompare,
  Download,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface CompareMaterialsProps {
  preselectedIds?: number[];
}

export const CompareMaterials: React.FC<CompareMaterialsProps> = ({
  preselectedIds = []
}) => {
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(preselectedIds.length > 0 ? preselectedIds : []);
  const [consumption, setConsumption] = useState<number>(1.0);
  const [batchSize, setBatchSize] = useState<number>(1000);

  const [compareData, setCompareData] = useState<{
    baseline_material: any;
    simulation_parameters: any;
    comparison_matrix: ComparisonItem[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllMaterials();
  }, []);

  const loadAllMaterials = async () => {
    try {
      const res = await api.getMaterials();
      setAllMaterials(res);

      if (preselectedIds.length > 0) {
        const base = res.find(m => m.id === preselectedIds[0]);
        if (base) {
          const ids = [base.id];
          if (base.alternative_id && res.some(m => m.id === base.alternative_id)) {
            ids.push(base.alternative_id);
          } else {
            const alt = res.find(m => m.name.toLowerCase() === base.alternative_name?.toLowerCase());
            if (alt) {
              ids.push(alt.id);
            } else if (res.length >= 2) {
              const other = res.find(m => m.id !== base.id);
              if (other) ids.push(other.id);
            }
          }
          setSelectedIds(ids);
          return;
        }
      }

      if (selectedIds.length === 0 && res.length >= 2) {
        setSelectedIds([res[0].id, res[1].id]);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (selectedIds.length >= 2) {
      runComparison();
    } else {
      setCompareData(null);
    }
  }, [selectedIds, consumption, batchSize]);

  const runComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareMaterials({
        material_ids: selectedIds,
        consumption_per_pair: consumption,
        batch_size: batchSize
      });
      setCompareData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare materials');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = (id: number) => {
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemoveMaterial = (id: number) => {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const handleSetBaseline = (id: number) => {
    const without = selectedIds.filter((item) => item !== id);
    setSelectedIds([id, ...without]);
  };

  // Export as Standard Tabular CSV (Proper record-by-record format without truncated columns or ######)
  const handleExportCSV = () => {
    if (!compareData) return;
    const matrix = compareData.comparison_matrix;
    const dateStr = new Date().toISOString().split('T')[0];

    const headers = [
      '"Material Name"',
      '"Role"',
      '"Category"',
      '"Type & Grade"',
      '"Price Per Unit (INR)"',
      '"Purchase Unit"',
      '"Price Diff vs Baseline (INR)"',
      '"Diff %"',
      `"Cost Per Pair (${consumption} ${matrix[0].purchase_unit}/pr) (INR)"`,
      '"Savings Per Pair (INR)"',
      `"Batch Total Cost (${batchSize.toLocaleString()} pairs) (INR)"`,
      '"Batch Savings (INR)"',
      '"Thickness (mm)"',
      '"Supplier"'
    ];

    const dataRows = matrix.map((m) => {
      const role = m.is_baseline ? 'Baseline Benchmark' : 'Candidate Alternative';
      const typeGrade = `${m.material_type || 'Standard'} (Grade: ${m.grade || 'Standard'})`;
      const diffPrice = m.is_baseline ? 0 : Number(m.diff_unit_price || 0);
      const diffPct = m.is_baseline ? '0.0%' : `${m.diff_pct}%`;
      const savingsPair = m.is_baseline ? 0 : Number(m.savings_per_pair || 0);
      const savingsBatch = m.is_baseline ? 0 : Number(m.savings_batch || 0);

      return [
        `"${m.name.replace(/"/g, '""')}"`,
        `"${role}"`,
        `"${m.category.replace(/"/g, '""')}"`,
        `"${typeGrade.replace(/"/g, '""')}"`,
        m.price_per_unit.toFixed(2),
        `"${m.purchase_unit.replace(/"/g, '""')}"`,
        diffPrice.toFixed(2),
        `"${diffPct}"`,
        m.cost_per_pair.toFixed(2),
        savingsPair.toFixed(2),
        m.batch_cost.toFixed(2),
        savingsBatch.toFixed(2),
        m.thickness_mm ? m.thickness_mm.toString() : '""',
        `"${(m.supplier_name || 'In-House / Unassigned').replace(/"/g, '""')}"`
      ].join(',');
    });

    // Summary metadata rows at the bottom
    const summaryRows = [
      '',
      '"--- SIMULATION PARAMETERS ---"',
      `"Consumption Per Pair",${consumption},"${matrix[0].purchase_unit}/pair"`,
      `"Batch Size",${batchSize},"pairs"`,
      `"Export Date","${dateStr}"`
    ];

    // Prefix with UTF-8 BOM (\uFEFF) so Excel opens UTF-8 without garbled characters
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows, ...summaryRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `material_comparison_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as Native Excel (.xlsx) with auto-formatted column widths and cell types
  const handleExportExcel = () => {
    if (!compareData) return;
    const matrix = compareData.comparison_matrix;
    const dateStr = new Date().toISOString().split('T')[0];

    const aoa: any[][] = [
      ['FOOTWEAR MATERIAL TECHNICAL & COST COMPARISON REPORT'],
      [`Generated: ${dateStr}`, `Consumption: ${consumption} ${matrix[0].purchase_unit}/pair`, `Batch Size: ${batchSize.toLocaleString()} pairs`],
      [],
      [
        'Material Name',
        'Role',
        'Category',
        'Type & Grade',
        'Price / Unit (INR)',
        'Purchase Unit',
        'Price Diff vs Baseline (INR)',
        'Diff %',
        `Cost / Pair (${consumption} ${matrix[0].purchase_unit}/pr) (INR)`,
        'Savings / Pair (INR)',
        `Batch Total Cost (${batchSize.toLocaleString()} pairs) (INR)`,
        'Batch Savings vs Baseline (INR)',
        'Thickness (mm)',
        'Supplier'
      ]
    ];

    matrix.forEach((m) => {
      const role = m.is_baseline ? 'Baseline Benchmark' : 'Candidate Alternative';
      const typeGrade = `${m.material_type || 'Standard'} (Grade: ${m.grade || 'Standard'})`;
      const diffPrice = m.is_baseline ? 0 : Number(m.diff_unit_price || 0);
      const diffPct = m.is_baseline ? '0.0%' : `${m.diff_pct}%`;
      const savingsPair = m.is_baseline ? 0 : Number(m.savings_per_pair || 0);
      const savingsBatch = m.is_baseline ? 0 : Number(m.savings_batch || 0);

      aoa.push([
        m.name,
        role,
        m.category,
        typeGrade,
        Number(m.price_per_unit.toFixed(2)),
        m.purchase_unit,
        Number(diffPrice.toFixed(2)),
        diffPct,
        Number(m.cost_per_pair.toFixed(2)),
        Number(savingsPair.toFixed(2)),
        Number(m.batch_cost.toFixed(2)),
        Number(savingsBatch.toFixed(2)),
        m.thickness_mm ? Number(m.thickness_mm) : 'N/A',
        m.supplier_name || 'In-House / Unassigned'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set generous column widths so nothing is truncated or clipped in Excel
    ws['!cols'] = [
      { wch: 30 }, // Material Name
      { wch: 22 }, // Role
      { wch: 18 }, // Category
      { wch: 26 }, // Type & Grade
      { wch: 18 }, // Price Per Unit
      { wch: 14 }, // Unit
      { wch: 22 }, // Price Diff
      { wch: 12 }, // Diff %
      { wch: 24 }, // Cost per pair
      { wch: 20 }, // Savings per pair
      { wch: 24 }, // Batch Total
      { wch: 24 }, // Batch Savings
      { wch: 14 }, // Thickness
      { wch: 28 }  // Supplier
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Material Comparison');
    XLSX.writeFile(wb, `material_comparison_${dateStr}.xlsx`);
  };

  if (allMaterials.length < 2) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-3 border-b border-[#E8E4DC]">
          <h1 className="text-2xl font-bold tracking-tight text-[#201E1B] font-serif">
            Compare Materials
          </h1>
          <p className="text-sm text-[#736E65] mt-0.5">
            Side-by-side technical evaluation, unit price differential, and batch cost simulation.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4DC] p-14 text-center shadow-2xs max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF3EF] text-[#D97757] flex items-center justify-center mx-auto mb-4 border border-[#F0D9CE]">
            <GitCompare className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-[#201E1B] font-serif">
            At least 2 materials required
          </h3>
          <p className="text-xs text-[#736E65] max-w-sm mx-auto mt-1.5 leading-relaxed">
            You currently have {allMaterials.length} material in your library. Add at least two footwear materials in the Materials tab to compare their properties and calculate cost savings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-[#E8E4DC]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#201E1B] font-serif">
            Compare Materials
          </h1>
          <p className="text-xs sm:text-sm text-[#736E65] mt-0.5">
            Side-by-side technical evaluation, unit price differential, and batch cost simulation.
          </p>
        </div>

        {compareData && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-[#2E6B34] text-white hover:bg-[#235328] shadow-2xs transition-all active:scale-98 w-full sm:w-auto"
              title="Download formatted Excel workbook with auto-fitted columns"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel (.xlsx)
            </button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4DC] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Material Selection Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-[#736E65] whitespace-nowrap">Add Candidate:</span>
          <select
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val) handleAddMaterial(val);
              e.target.value = '';
            }}
            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-[#FAF9F5] border border-[#E8E4DC] rounded-xl text-xs font-medium text-[#201E1B] focus:outline-hidden focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-all"
          >
            <option value="">-- Choose material to compare --</option>
            {allMaterials
              .filter((m) => !selectedIds.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (₹{m.price_per_unit}/{m.purchase_unit}) - {m.category}
                </option>
              ))}
          </select>
        </div>

        {/* Consumption simulation parameters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E8E4DC]">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#736E65]">Consumption / Pair:</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={consumption}
              onChange={(e) => setConsumption(parseFloat(e.target.value) || 1.0)}
              className="w-20 px-2.5 py-1.5 sm:py-1 text-xs border border-[#E8E4DC] bg-[#FAF9F5] rounded-lg font-bold text-[#201E1B] focus:outline-hidden focus:border-[#D97757]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#736E65]">Batch Size (Pairs):</label>
            <input
              type="number"
              step="100"
              min="100"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 1000)}
              className="w-24 px-2.5 py-1.5 sm:py-1 text-xs border border-[#E8E4DC] bg-[#FAF9F5] rounded-lg font-bold text-[#201E1B] focus:outline-hidden focus:border-[#D97757]"
            />
          </div>
        </div>
      </div>

      {selectedIds.length < 2 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E4DC] text-[#8C8477]">
          <GitCompare className="w-8 h-8 mx-auto mb-2 text-[#D97757]" />
          <p className="text-sm font-semibold text-[#201E1B]">Select at least 2 materials to compare</p>
          <p className="text-xs text-[#736E65] mt-1">Use the dropdown above to add candidate materials.</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Matrix Table */}
      {compareData && (
        <div className="bg-white rounded-2xl border border-[#E8E4DC] shadow-2xs overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FAF9F5]">
                <th className="py-3 px-4 w-52 font-semibold text-[#736E65] uppercase text-[11px] tracking-wider">
                  Specification / Metric
                </th>
                {compareData.comparison_matrix.map((item) => (
                  <th key={item.id} className="py-3 px-4 min-w-[220px] align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {item.is_baseline ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF3EF] text-[#D97757] border border-[#F0D9CE] uppercase tracking-wider block w-max mb-1">
                            Baseline Benchmark
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetBaseline(item.id)}
                            className="text-[10px] text-[#D97757] hover:underline font-semibold block mb-1"
                          >
                            Set as Baseline
                          </button>
                        )}
                        <h3 className="font-bold text-[#201E1B] text-sm font-serif">{item.name}</h3>
                        <p className="text-[11px] text-[#8C8477] font-normal">
                          {item.supplier_name || 'In-House / Unassigned'}
                        </p>
                      </div>

                      {compareData.comparison_matrix.length > 2 && (
                        <button
                          onClick={() => handleRemoveMaterial(item.id)}
                          className="text-[#8C8477] hover:text-rose-600 p-1"
                          title="Remove from comparison"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8E4DC]">
              {/* Row: Category & Type */}
              <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-[#5C574F]">Category & Grade</td>
                {compareData.comparison_matrix.map((item) => (
                  <td key={item.id} className="py-3 px-4">
                    <div className="font-medium text-[#201E1B]">{item.category}</div>
                    <div className="text-[11px] text-[#8C8477]">{item.material_type || 'Standard'} (Grade: {item.grade || 'Standard'})</div>
                  </td>
                ))}
              </tr>

              {/* Row: Unit Price */}
              <tr className="bg-[#FAF9F5]/40">
                <td className="py-3 px-4 font-semibold text-[#5C574F]">Unit Price & Difference</td>
                {compareData.comparison_matrix.map((item) => (
                  <td key={item.id} className="py-3 px-4">
                    <div className="text-base font-bold text-[#201E1B]">
                      ₹{item.price_per_unit.toFixed(2)}
                      <span className="text-xs font-normal text-[#736E65] ml-1">/ {item.purchase_unit}</span>
                    </div>
                    {!item.is_baseline && (
                      <div className={`text-[11px] font-semibold mt-0.5 ${item.diff_unit_price < 0 ? 'text-[#2E6B34]' : 'text-rose-600'}`}>
                        {item.diff_unit_price < 0 ? `-₹${Math.abs(item.diff_unit_price).toFixed(2)} (${item.diff_pct}%)` : `+₹${item.diff_unit_price.toFixed(2)} (+${item.diff_pct}%)`}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: Simulated Consumption Cost */}
              <tr className="bg-[#EAF3EA]/30">
                <td className="py-3 px-4 font-bold text-[#201E1B]">
                  <div>Cost / Pair</div>
                  <span className="text-[10px] text-[#736E65] font-normal">at {consumption} {compareData.comparison_matrix[0].purchase_unit}/pr</span>
                </td>
                {compareData.comparison_matrix.map((item) => (
                  <td key={item.id} className="py-3 px-4">
                    <div className="text-sm font-bold text-[#201E1B]">
                      ₹{item.cost_per_pair.toFixed(2)} / pair
                    </div>
                    {!item.is_baseline && item.savings_per_pair !== 0 && (
                      <div className={`text-xs font-bold mt-0.5 ${item.savings_per_pair > 0 ? 'text-[#2E6B34]' : 'text-rose-600'}`}>
                        {item.savings_per_pair > 0 ? `Saves ₹${item.savings_per_pair.toFixed(2)} / pr` : `Costs +₹${Math.abs(item.savings_per_pair).toFixed(2)} / pr`}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: Batch Total Savings */}
              <tr className="bg-[#EAF3EA]/50">
                <td className="py-3 px-4 font-bold text-[#1E5224]">
                  <div>Batch Total Impact</div>
                  <span className="text-[10px] text-[#2E6B34] font-normal">for {batchSize.toLocaleString()} pairs</span>
                </td>
                {compareData.comparison_matrix.map((item) => (
                  <td key={item.id} className="py-3 px-4">
                    <div className="text-sm font-bold text-[#201E1B]">
                      ₹{item.batch_cost.toLocaleString()}
                    </div>
                    {!item.is_baseline && item.savings_batch !== 0 && (
                      <div className={`text-xs font-extrabold mt-0.5 ${item.savings_batch > 0 ? 'text-[#1E5224]' : 'text-rose-700'}`}>
                        {item.savings_batch > 0 ? `Save ₹${item.savings_batch.toLocaleString()}` : `Cost +₹${Math.abs(item.savings_batch).toLocaleString()}`}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Thickness */}
              <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-[#5C574F]">Thickness</td>
                {compareData.comparison_matrix.map((item) => (
                  <td key={item.id} className="py-3 px-4 text-[#201E1B]">
                    {item.thickness_mm ? `${item.thickness_mm} mm` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
