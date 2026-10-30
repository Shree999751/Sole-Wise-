import React, { useState } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { MaterialLibrary } from './pages/MaterialLibrary';
import { MaterialDetail } from './pages/MaterialDetail';
import { CompareMaterials } from './pages/CompareMaterials';
import { Material } from './types';
import { Menu, Bell, User } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Deep view states
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  // Navigation handlers
  const handleSelectMaterial = (m: Material) => {
    setSelectedMaterial(m);
    setCurrentTab('materials');
  };

  const handleCompareWith = (materialId: number) => {
    setCompareIds([materialId]);
    setCurrentTab('compare');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col md:flex-row text-[#201E1B] font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'materials') {
            setSelectedMaterial(null);
          }
          setCurrentTab(tab);
        }}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        {/* Clean Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 md:px-8 bg-[#FAF9F5]/95 backdrop-blur-xs border-b border-[#E6E0D6]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-xl text-[#736E65] hover:text-[#201E1B] hover:bg-[#EAE4DC] md:hidden transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold tracking-tight text-[#201E1B] text-base font-serif md:hidden">
              SOLEWISE
            </span>
          </div>

          {/* Right Header: Notification Bell & User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              title="Notifications"
              className="p-2 text-[#736E65] hover:text-[#201E1B] hover:bg-[#EAE4DC]/60 rounded-full transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              title="User Account"
              className="w-8 h-8 rounded-full bg-[#EAE4DC] border border-[#DCD5C9] flex items-center justify-center text-[#5C574F] hover:bg-[#DFD8CC] transition-colors"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto overflow-x-hidden">
          {currentTab === 'overview' && (
            <Overview
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenAddMaterial={() => setCurrentTab('materials')}
            />
          )}

          {currentTab === 'materials' && (
            selectedMaterial ? (
              <MaterialDetail
                materialId={selectedMaterial.id}
                onBack={() => setSelectedMaterial(null)}
                onCompareWith={handleCompareWith}
                onFindAlternatives={handleCompareWith}
              />
            ) : (
              <MaterialLibrary
                onSelectMaterial={handleSelectMaterial}
                onOpenCompareWith={handleCompareWith}
              />
            )
          )}

          {currentTab === 'compare' && (
            <CompareMaterials
              preselectedIds={compareIds}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
