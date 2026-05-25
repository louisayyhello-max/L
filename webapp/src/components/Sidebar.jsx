import React from 'react';
import { Filter } from 'lucide-react';

const REGIONS = [
  { code: '', label: '全部地区', flag: '🌐' },
  { code: 'eu', label: '欧盟', flag: '🇪🇺' },
  { code: 'usa', label: '美国', flag: '🇺🇸' },
  { code: 'china', label: '中国', flag: '🇨🇳' },
  { code: 'sea', label: '东南亚', flag: '🌏' },
  { code: 'mea', label: '中东/非洲', flag: '🌍' },
  { code: 'global', label: '全球', flag: '🌐' },
];

const CATEGORIES = [
  { code: '', label: '全部类别' },
  { code: 'colorants', label: '色素' },
  { code: 'sweeteners', label: '甜味剂' },
  { code: 'preservatives', label: '防腐剂' },
  { code: 'emulsifiers', label: '乳化剂' },
  { code: 'flavor_enhancers', label: '增味剂' },
  { code: 'antioxidants', label: '抗氧化剂' },
  { code: 'thickeners', label: '增稠剂' },
  { code: 'acidity_regulators', label: '酸度调节剂' },
  { code: 'functional_ingredients', label: '功能性配料' },
  { code: 'general', label: '综合' },
];

const UPDATE_TYPES = [
  { code: '', label: '全部类型' },
  { code: 'new_regulation', label: '新法规' },
  { code: 'amendment', label: '修订' },
  { code: 'ban', label: '禁止' },
  { code: 'approval', label: '批准' },
  { code: 'consultation', label: '征求意见' },
  { code: 'guidance', label: '指导意见' },
  { code: 'safety_assessment', label: '安全评估' },
];

function FilterGroup({ title, items, value, onChange }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-0.5">
        {items.map(item => (
          <button
            key={item.code}
            onClick={() => onChange(item.code === value ? '' : item.code)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              value === item.code
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.flag && <span>{item.flag}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ filters, onFiltersChange, tab }) {
  const update = (key, val) => onFiltersChange({ ...filters, [key]: val });

  const hasFilters = filters.region || filters.category || filters.update_type;

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto scrollbar-thin hidden md:block">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Filter className="w-4 h-4" />
            筛选
          </div>
          {hasFilters && (
            <button
              onClick={() => onFiltersChange({ region: '', category: '', update_type: '' })}
              className="text-xs text-blue-600 hover:underline"
            >
              清除
            </button>
          )}
        </div>

        <FilterGroup
          title="地区"
          items={REGIONS}
          value={filters.region}
          onChange={v => update('region', v)}
        />

        <FilterGroup
          title="类别"
          items={CATEGORIES}
          value={filters.category}
          onChange={v => update('category', v)}
        />

        {tab === 'updates' && (
          <FilterGroup
            title="更新类型"
            items={UPDATE_TYPES}
            value={filters.update_type}
            onChange={v => update('update_type', v)}
          />
        )}
      </div>
    </aside>
  );
}
