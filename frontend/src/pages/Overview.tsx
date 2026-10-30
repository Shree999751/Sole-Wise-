import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { OverviewData } from '../types';
import { NavItem } from '../components/Sidebar';
import {
  Layers,
  LayoutGrid,
  GitCompare,
  PlusCircle,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface OverviewProps {
  onNavigate: (tab: NavItem) => void;
  onOpenAddMaterial: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  onNavigate,
  onOpenAddMaterial,
}) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  // Determine dynamic greeting based on hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const totalMaterials = data?.metrics?.total_materials ?? 0;
  const totalCategories = data?.categories_breakdown?.length || 0;
  const totalComparisons = data?.metrics?.total_scenarios ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Greeting Title */}
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-[#201E1B] font-serif">
          {greeting}
        </h1>
        <p className="text-sm text-[#736E65] mt-1">
          Your footwear materials and cost overview.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#FBF1F1] border border-[#E9C7C7] rounded-xl text-[#922B2B] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#C13838]" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* 3 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Materials */}
        <div
          onClick={() => onNavigate('materials')}
          className="p-6 bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_2px_8px_rgba(32,30,27,0.03)] hover:border-[#D97757]/60 transition-all cursor-pointer group"
        >
          <div className="text-[#D97757] mb-3">
            <Layers className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="text-3xl font-bold text-[#201E1B] tracking-tight font-serif">
            {totalMaterials}
          </div>
          <div className="text-sm text-[#736E65] font-medium mt-1">
            Materials
          </div>
        </div>

        {/* Card 2: Categories */}
        <div
          onClick={() => onNavigate('materials')}
          className="p-6 bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_2px_8px_rgba(32,30,27,0.03)] hover:border-[#D97757]/60 transition-all cursor-pointer group"
        >
          <div className="text-[#D97757] mb-3">
            <LayoutGrid className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="text-3xl font-bold text-[#201E1B] tracking-tight font-serif">
            {totalCategories}
          </div>
          <div className="text-sm text-[#736E65] font-medium mt-1">
            Categories
          </div>
        </div>

        {/* Card 3: Comparisons */}
        <div
          onClick={() => onNavigate('compare')}
          className="p-6 bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_2px_8px_rgba(32,30,27,0.03)] hover:border-[#D97757]/60 transition-all cursor-pointer group"
        >
          <div className="text-[#D97757] mb-3">
            <GitCompare className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="text-3xl font-bold text-[#201E1B] tracking-tight font-serif">
            {totalComparisons}
          </div>
          <div className="text-sm text-[#736E65] font-medium mt-1">
            Comparisons
          </div>
        </div>
      </div>

      {/* Quick Actions List Group */}
      <div className="bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_2px_8px_rgba(32,30,27,0.03)] p-6 space-y-4">
        <h2 className="text-base font-bold text-[#201E1B] font-serif">Quick actions</h2>

        <div className="space-y-3">
          {/* Action 1: Add material */}
          <div
            onClick={onOpenAddMaterial}
            className="flex items-center justify-between p-4 rounded-xl border border-[#E8E4DC] hover:border-[#D97757] hover:bg-[#FAF8F5] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="text-[#D97757]">
                <PlusCircle className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#201E1B] group-hover:text-[#D97757] transition-colors">
                  Add material
                </h3>
                <p className="text-xs text-[#736E65] mt-0.5">
                  Create a material record & alternative
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C8477] group-hover:text-[#201E1B] group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Action 2: Compare materials */}
          <div
            onClick={() => onNavigate('compare')}
            className="flex items-center justify-between p-4 rounded-xl border border-[#E8E4DC] hover:border-[#D97757] hover:bg-[#FAF8F5] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="text-[#D97757]">
                <GitCompare className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#201E1B] group-hover:text-[#D97757] transition-colors">
                  Compare materials
                </h3>
                <p className="text-xs text-[#736E65] mt-0.5">
                  Find suitable alternatives & analyze savings
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C8477] group-hover:text-[#201E1B] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Subtle footer notice */}
      <div className="text-xs text-[#8C8477] text-left pt-2 font-medium">
        Illustrative dashboard concept · Sample figures only
      </div>
    </div>
  );
};
