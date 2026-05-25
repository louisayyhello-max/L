import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { CategoryBadge, TypeBadge, RegionBadge } from '../components/Badge.jsx';

const COUNTRY_FLAGS = {
  EU: '🇪🇺', US: '🇺🇸', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷',
  SG: '🇸🇬', MY: '🇲🇾', ID: '🇮🇩', TH: '🇹🇭', VN: '🇻🇳', PH: '🇵🇭',
  SA: '🇸🇦', AE: '🇦🇪', NO: '🇳🇴', AU: '🇦🇺', IN: '🇮🇳',
  GCC: '🌍', ASEAN: '🌏',
};

const STATUS_ICON = {
  approved: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  banned: <XCircle className="w-4 h-4 text-red-600" />,
  restricted: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
  pending: <Clock className="w-4 h-4 text-gray-400" />,
  not_evaluated: <HelpCircle className="w-4 h-4 text-gray-300" />,
};

const STATUS_LABELS = {
  approved: '批准', banned: '禁止', restricted: '限量', pending: '待批', not_evaluated: '未评估',
};

const STATUS_ROW_STYLE = {
  approved: 'bg-green-50',
  banned: 'bg-red-50',
  restricted: 'bg-yellow-50',
  pending: 'bg-gray-50',
  not_evaluated: '',
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ComparePage({ substanceId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!substanceId) return;
    setLoading(true);
    fetch(`/api/substances/${substanceId}/compare`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [substanceId]);

  if (!substanceId) {
    return (
      <div className="text-center py-20 text-gray-400 max-w-2xl mx-auto">
        <div className="text-5xl mb-4">🔬</div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">跨国法规对比</h3>
        <p className="text-sm">在物质库中选择一种物质，查看其在各国的法规状态对比</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 max-w-2xl">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  const { substance, regulations, recent_updates } = data;

  const approved = regulations.filter(r => r.status === 'approved').length;
  const banned = regulations.filter(r => r.status === 'banned').length;
  const restricted = regulations.filter(r => r.status === 'restricted').length;
  const pending = regulations.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-5xl">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回物质库
      </button>

      {/* Substance header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{substance.name_en}</h1>
              {substance.e_number && substance.e_number !== '-' && (
                <span className="text-sm bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                  {substance.e_number}
                </span>
              )}
              {substance.ins_number && substance.ins_number !== '-' && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                  {substance.ins_number}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-2">{substance.name_zh}</p>
            <div className="flex flex-wrap gap-2 items-center">
              <CategoryBadge category={substance.category} />
              {substance.cas_number && substance.cas_number !== '-' && (
                <span className="text-xs text-gray-400 font-mono">CAS: {substance.cas_number}</span>
              )}
            </div>
            {substance.description_en && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{substance.description_en}</p>
            )}
            {substance.adi && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">ADI（每日允许摄入量）：</span>
                <span className="font-medium text-gray-800">{substance.adi}</span>
              </div>
            )}
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {[
              { label: '批准', count: approved, cls: 'bg-green-50 text-green-800 border-green-200' },
              { label: '禁止', count: banned, cls: 'bg-red-50 text-red-800 border-red-200' },
              { label: '限量', count: restricted, cls: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
              { label: '待批', count: pending, cls: 'bg-gray-50 text-gray-600 border-gray-200' },
            ].map(({ label, count, cls }) => (
              <div key={label} className={`border rounded-lg px-3 py-2 text-center ${cls}`}>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">各国/地区法规状态</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 font-semibold">
                <th className="text-left px-4 py-2.5 w-36">国家/地区</th>
                <th className="text-left px-4 py-2.5 w-24">状态</th>
                <th className="text-left px-4 py-2.5">最大限量</th>
                <th className="text-left px-4 py-2.5">法规依据</th>
                <th className="text-left px-4 py-2.5 w-24">生效日期</th>
                <th className="text-left px-4 py-2.5">备注</th>
              </tr>
            </thead>
            <tbody>
              {regulations.map(reg => (
                <tr key={reg.id} className={`border-b border-gray-100 hover:bg-gray-50 ${STATUS_ROW_STYLE[reg.status]}`}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{COUNTRY_FLAGS[reg.country_code] || '🏳️'}</span>
                      <span>{reg.country_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[reg.status]}
                      <span className={`text-xs font-semibold ${
                        reg.status === 'approved' ? 'text-green-700' :
                        reg.status === 'banned' ? 'text-red-700' :
                        reg.status === 'restricted' ? 'text-yellow-700' :
                        'text-gray-500'
                      }`}>
                        {STATUS_LABELS[reg.status] || reg.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {reg.max_level || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {reg.source_url ? (
                      <a href={reg.source_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline">
                        {reg.regulation_ref || '-'}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      reg.regulation_ref || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(reg.effective_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                    {reg.notes || '-'}
                  </td>
                </tr>
              ))}
              {regulations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    暂无法规数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent updates */}
      {recent_updates?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">相关法规动态</h2>
          <div className="space-y-2">
            {recent_updates.map(u => (
              <div key={u.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <TypeBadge type={u.update_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">
                    {u.title_zh || u.title}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(u.published_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
