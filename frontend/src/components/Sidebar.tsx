import React from 'react';
import {
  LayoutGrid,
  Layers,
  GitCompare,
  Footprints,
  Bell,
  User,
  X
} from 'lucide-react';

export type NavItem =
  | 'overview'
  | 'materials'
  | 'compare';

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const navLinks: { id: NavItem; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'materials', label: 'Materials', icon: Layers },
  { id: 'compare', label: 'Compare', icon: GitCompare },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 max-w-[80vw] md:w-60 bg-[#F3EFEA] border-r border-[#E6E0D6] text-[#201E1B] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-[#E6E0D6] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#D97757] text-white shadow-xs">
              <Footprints className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-[#201E1B] text-base font-serif block">
                SOLEWISE
              </span>
              <p className="text-[11px] text-[#736E65] font-medium">
                Footwear Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-[#8C8477] hover:text-[#201E1B] md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-3 text-[11px] font-bold tracking-wider text-[#8C8477] uppercase">
            Workspace
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#EAE4DC] text-[#201E1B] font-semibold shadow-2xs'
                    : 'text-[#5C574F] hover:bg-[#EAE4DC]/60 hover:text-[#201E1B]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#D97757]' : 'text-[#8C8477]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Minimal Footer */}
        <div className="p-4 border-t border-[#E6E0D6] bg-[#FAF8F5] text-[11px] text-[#736E65] flex items-center justify-between">
          <span className="font-medium text-[#736E65]">Solewise Platform</span>
          <span className="flex items-center gap-1.5 text-[#2E6B34] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B34]" />
            Online
          </span>
        </div>
      </aside>
    </>
  );
};
