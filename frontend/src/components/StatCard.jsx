import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    purple: 'bg-violet-50 text-violet-600 ring-violet-100',
    yellow: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-rose-50 text-rose-600 ring-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  };

  return (
    <div className="card p-6 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`rounded-2xl p-3 ring-1 ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mb-1 text-sm font-bold text-slate-500">{title}</div>
      <div className="text-2xl font-extrabold text-slate-950">{value}</div>
      {subtitle && <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
