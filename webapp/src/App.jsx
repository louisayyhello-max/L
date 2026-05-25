import React, { useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import UpdatesPage from './pages/UpdatesPage.jsx';
import SubstancesPage from './pages/SubstancesPage.jsx';
import ComparePage from './pages/ComparePage.jsx';

export default function App() {
  const [tab, setTab] = useState('updates');
  const [filters, setFilters] = useState({ region: '', category: '', update_type: '' });
  const [search, setSearch] = useState('');
  const [compareId, setCompareId] = useState(null);

  const handleCompare = (id) => {
    setCompareId(id);
    setTab('compare');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header search={search} onSearch={setSearch} tab={tab} onTabChange={setTab} />
      <div className="flex flex-1 overflow-hidden">
        {tab !== 'compare' && (
          <Sidebar filters={filters} onFiltersChange={setFilters} tab={tab} />
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {tab === 'updates' && (
            <UpdatesPage filters={filters} search={search} onCompare={handleCompare} />
          )}
          {tab === 'substances' && (
            <SubstancesPage filters={filters} search={search} onCompare={handleCompare} />
          )}
          {tab === 'compare' && (
            <ComparePage substanceId={compareId} onBack={() => setTab('substances')} />
          )}
        </main>
      </div>
    </div>
  );
}
