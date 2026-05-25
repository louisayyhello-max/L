import React from 'react';

const REGION_STYLES = {
  eu: 'bg-blue-100 text-blue-800',
  usa: 'bg-red-100 text-red-800',
  china: 'bg-rose-100 text-rose-800',
  sea: 'bg-green-100 text-green-700',
  mea: 'bg-amber-100 text-amber-800',
  global: 'bg-purple-100 text-purple-800',
};

const REGION_FLAGS = {
  eu: '🇪🇺', usa: '🇺🇸', china: '🇨🇳', sea: '🌏', mea: '🌍', global: '🌐',
};

const REGION_LABELS = {
  eu: '欧盟', usa: '美国', china: '中国', sea: '东南亚', mea: '中东/非洲', global: '全球',
};

const CATEGORY_STYLES = {
  colorants: 'bg-pink-100 text-pink-800',
  sweeteners: 'bg-purple-100 text-purple-800',
  preservatives: 'bg-orange-100 text-orange-800',
  emulsifiers: 'bg-cyan-100 text-cyan-800',
  flavor_enhancers: 'bg-yellow-100 text-yellow-800',
  antioxidants: 'bg-lime-100 text-lime-800',
  thickeners: 'bg-teal-100 text-teal-800',
  acidity_regulators: 'bg-indigo-100 text-indigo-800',
  functional_ingredients: 'bg-emerald-100 text-emerald-800',
  general: 'bg-gray-100 text-gray-700',
};

const CATEGORY_LABELS = {
  colorants: '色素', sweeteners: '甜味剂', preservatives: '防腐剂',
  emulsifiers: '乳化剂', flavor_enhancers: '增味剂', antioxidants: '抗氧化剂',
  thickeners: '增稠剂', acidity_regulators: '酸度调节剂',
  functional_ingredients: '功能性配料', general: '综合',
};

const TYPE_STYLES = {
  new_regulation: 'bg-blue-600 text-white',
  amendment: 'bg-sky-500 text-white',
  ban: 'bg-red-600 text-white',
  approval: 'bg-green-600 text-white',
  consultation: 'bg-yellow-500 text-white',
  guidance: 'bg-indigo-500 text-white',
  safety_assessment: 'bg-orange-500 text-white',
};

const TYPE_LABELS = {
  new_regulation: '新法规', amendment: '修订', ban: '禁止',
  approval: '批准', consultation: '征求意见', guidance: '指导意见',
  safety_assessment: '安全评估',
};

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-800',
  banned: 'bg-red-100 text-red-800',
  restricted: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-600',
  not_evaluated: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = {
  approved: '批准', banned: '禁止', restricted: '限量使用',
  pending: '待批', not_evaluated: '未评估',
};

export function RegionBadge({ region }) {
  const style = REGION_STYLES[region] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {REGION_FLAGS[region]} {REGION_LABELS[region] || region}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const style = CATEGORY_STYLES[category] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || 'bg-gray-200 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
