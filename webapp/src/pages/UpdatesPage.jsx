import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { RegionBadge, CategoryBadge, TypeBadge } from '../components/Badge.jsx';
import { useStats } from '../hooks/useApi.js';

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: '法规动态', value: stats.total_updates },
        { label: '追踪物质', value: stats.total_substances },
        { label: '国家/地区规定', value: stats.total_regulations },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function UpdateCard({ item, onCompare }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <TypeBadge type={item.update_type} />
            <RegionBadge region={item.region} />
            <CategoryBadge category={item.category} />
            {item.effective_date && (
              <span className="text-xs text-gray-500">生效: {formatDate(item.effective_date)}</span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5">
            {item.title_zh || item.title}
          </h3>
          {item.title_zh && item.title !== item.title_zh && (
            <p className="text-xs text-gray-500 mb-1.5">{item.title}</p>
          )}

          <p className={`text-sm text-gray-600 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {item.summary}
          </p>

          {item.summary && item.summary.length > 200 && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:underline mt-1">
              {expanded ? '收起' : '展开全文'}
            </button>
          )}

          {item.substance_refs?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.substance_refs.map(s => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100"
                  onClick={() => onCompare && onCompare(s)}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {item.source} · {formatDate(item.published_at)}
        </span>
        <div className="flex gap-2">
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer"
              className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
              原文 <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpdatesPage({ filters, search, onCompare }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: stats } = useStats();

  const handleCompareByName = async (substanceName) => {
    try {
      const r = await fetch(`/api/substances?q=${encodeURIComponent(substanceName)}`);
      const d = await r.json();
      if (d.data?.[0]) onCompare(d.data[0].id);
    } catch {}
  };

  useEffect(() => {
    setPage(1);
  }, [filters.region, filters.category, filters.update_type, search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.set('q', search);
    if (filters.region) params.set('region', filters.region);
    if (filters.category) params.set('category', filters.category);
    if (filters.update_type) params.set('update_type', filters.update_type);

    fetch(`/api/updates?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [page, filters.region, filters.category, filters.update_type, search]);

  const totalPages = data ? Math.ceil(data.total / 15) : 0;

  return (
    <div className="max-w-4xl">
      <StatsBar stats={stats} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">
          法规动态
          {data && <span className="text-gray-400 font-normal text-sm ml-2">共 {data.total} 条</span>}
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
          <div className="text-4xl mb-3">🔍</div>
          <p>未找到匹配的法规动态</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.data?.map(item => (
          <UpdateCard key={item.id} item={item} onCompare={handleCompareByName} />
        ))}
      </div>

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
