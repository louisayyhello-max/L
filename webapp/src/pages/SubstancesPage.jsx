import React, { useState, useEffect } from 'react';
import { GitCompare, ChevronLeft, ChevronRight, Loader2, AlertCircle, FlaskConical } from 'lucide-react';
import { CategoryBadge } from '../components/Badge.jsx';

const CATEGORY_LABELS = {
  colorants: '色素', sweeteners: '甜味剂', preservatives: '防腐剂',
  emulsifiers: '乳化剂', flavor_enhancers: '增味剂', antioxidants: '抗氧化剂',
  thickeners: '增稠剂', acidity_regulators: '酸度调节剂',
  functional_ingredients: '功能性配料', general: '综合',
};

function SubstanceCard({ substance, onCompare }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{substance.name_en}</h3>
            {substance.e_number && substance.e_number !== '-' && (
              <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-medium">
                {substance.e_number}
              </span>
            )}
            {substance.ins_number && substance.ins_number !== '-' && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                {substance.ins_number}
              </span>
            )}
          </div>

          {substance.name_zh && (
            <p className="text-sm text-gray-600 mb-1.5">{substance.name_zh}</p>
          )}

          <div className="flex flex-wrap gap-2 items-center mb-2">
            <CategoryBadge category={substance.category} />
            {substance.cas_number && substance.cas_number !== '-' && (
              <span className="text-xs text-gray-400 font-mono">CAS: {substance.cas_number}</span>
            )}
          </div>

          {substance.description_en && (
            <p className="text-xs text-gray-500 line-clamp-2">{substance.description_en}</p>
          )}

          {substance.adi && (
            <div className="mt-2 text-xs">
              <span className="text-gray-500">ADI: </span>
              <span className="text-gray-700 font-medium">{substance.adi}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onCompare(substance.id)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
        >
          <GitCompare className="w-3.5 h-3.5" />
          跨国对比
        </button>
      </div>
    </div>
  );
}

export default function SubstancesPage({ filters, search, onCompare }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setPage(1); }, [filters.category, search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('q', search);
    if (filters.category) params.set('category', filters.category);

    fetch(`/api/substances?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [page, filters.category, search]);

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  // Group by category
  const grouped = {};
  if (data?.data) {
    for (const s of data.data) {
      const cat = s.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-600" />
          物质数据库
          {data && <span className="text-gray-400 font-normal text-sm">共 {data.total} 种</span>}
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">无法连接到服务器：{error}</span>
        </div>
      )}

      {!loading && !error && data?.data?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🔬</div>
          <p>未找到匹配的物质</p>
        </div>
      )}

      {/* If filtered (no grouping needed), show flat */}
      {!loading && !error && data?.data && (filters.category || search) ? (
        <div className="space-y-3">
          {data.data.map(s => (
            <SubstanceCard key={s.id} substance={s} onCompare={onCompare} />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-700 text-sm">{CATEGORY_LABELS[cat] || cat}</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{items.length} 种</span>
            </div>
            <div className="space-y-2">
              {items.map(s => (
                <SubstanceCard key={s.id} substance={s} onCompare={onCompare} />
              ))}
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
