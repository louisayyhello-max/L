import React, { useState, useRef, useEffect } from 'react';
import { Search, FlaskConical, Globe, BookOpen, GitCompare, X } from 'lucide-react';

const TABS = [
  { id: 'updates', label: '法规动态', icon: Globe },
  { id: 'substances', label: '物质库', icon: BookOpen },
  { id: 'compare', label: '跨国对比', icon: GitCompare },
];

export default function Header({ search, onSearch, tab, onTabChange }) {
  const [localSearch, setLocalSearch] = useState(search);
  const [suggestions, setSuggestions] = useState(null);
  const timer = useRef(null);

  const handleChange = (v) => {
    setLocalSearch(v);
    clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions(null); onSearch(''); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(v)}`);
        const d = await r.json();
        setSuggestions(d);
      } catch { setSuggestions(null); }
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuggestions(null);
    onSearch(localSearch);
  };

  const clearSearch = () => {
    setLocalSearch('');
    setSuggestions(null);
    onSearch('');
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm lg:text-base whitespace-nowrap">
              全球食品添加剂法规库
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl relative">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={e => handleChange(e.target.value)}
                  placeholder="搜索物质名称、E号、CAS号、关键词…"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
                {localSearch && (
                  <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </form>
            {suggestions && (suggestions.substances.length > 0 || suggestions.updates.length > 0) && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {suggestions.substances.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b">物质</div>
                    {suggestions.substances.map(s => (
                      <button key={s.id} onClick={() => { onSearch(s.name_en); setLocalSearch(s.name_en); setSuggestions(null); }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 text-sm">
                        <span className="font-medium">{s.name_en}</span>
                        {s.name_zh && <span className="text-gray-500">{s.name_zh}</span>}
                        {s.e_number && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{s.e_number}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.updates.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-t">法规动态</div>
                    {suggestions.updates.slice(0, 4).map(u => (
                      <button key={u.id} onClick={() => { onSearch(u.title); setLocalSearch(u.title); setSuggestions(null); }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 line-clamp-1">
                        {u.title_zh || u.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 ml-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
