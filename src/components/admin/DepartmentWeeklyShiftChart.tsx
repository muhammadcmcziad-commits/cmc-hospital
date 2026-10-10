import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { BarChart3, Calendar, Layers, Activity } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, p) => sum + (typeof p.value === 'number' ? p.value : 0), 0);
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[200px] z-50">
        <p className="font-bold text-slate-100 mb-2 border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="font-mono text-teal-400 font-extrabold">{total} شیفت</span>
        </p>
        <div className="space-y-1.5 font-sans">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-xs inline-block" 
                  style={{ backgroundColor: entry.color }} 
                />
                <span className="text-slate-300">{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-slate-100">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DepartmentWeeklyShiftChart: React.FC = () => {
  const { departments, shifts } = useHospital();
  const [viewMode, setViewMode] = useState<'stacked' | 'total'>('stacked');

  // Compute current week range (Saturday to Friday in Kurdish/Iraqi hospital calendar)
  const { startStr, endStr, weekLabel } = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const diffToSaturday = day === 6 ? 0 : day + 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToSaturday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const sStr = startOfWeek.toISOString().split('T')[0];
    const eStr = endOfWeek.toISOString().split('T')[0];

    const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const label = `${startOfWeek.toLocaleDateString('ku-IQ', formatOpts)} - ${endOfWeek.toLocaleDateString('ku-IQ', formatOpts)} (${sStr} تا ${eStr})`;

    return { startStr: sStr, endStr: eStr, weekLabel: label };
  }, []);

  // Prepare chart data per department
  const { chartData, totalWeekShifts } = useMemo(() => {
    let weekTotal = 0;

    const data = departments.map((dept) => {
      const deptShiftsThisWeek = shifts.filter(
        (s) => s.departmentId === dept.id && 
               s.status !== 'rejected' && 
               s.date >= startStr && 
               s.date <= endStr
      );

      const morning = deptShiftsThisWeek.filter(
        (s) => s.shiftType === 'morning' || s.shiftType === 'support'
      ).length;

      const evening = deptShiftsThisWeek.filter(
        (s) => s.shiftType === 'evening'
      ).length;

      const night = deptShiftsThisWeek.filter(
        (s) => s.shiftType === 'night' || s.shiftType === 'support_night'
      ).length;

      const total = deptShiftsThisWeek.length;
      weekTotal += total;

      return {
        id: dept.id,
        name: dept.nameKu || dept.nameEn,
        nameEn: dept.nameEn,
        code: dept.code,
        morning,
        evening,
        night,
        total,
      };
    });

    return { chartData: data, totalWeekShifts: weekTotal };
  }, [departments, shifts, startStr, endStr]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                دابەشبوونی شیفتەکان بەپێی بەشەکان بۆ ئەم هەفتەیە
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>هەفتەی ئێستا: {weekLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'stacked'
                  ? 'bg-white text-teal-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>جیاکردنەوەی شیفتەکان</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('total')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'total'
                  ? 'bg-white text-teal-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>کۆی گشتی</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200/70 rounded-xl text-xs">
            <span className="text-teal-800 font-medium">کۆی شیفتەکانی هەفتە:</span>
            <span className="font-mono font-black text-teal-900">{totalWeekShifts}</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="pt-2" style={{ width: '100%', height: 320 }}>
        {departments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            هیچ بەشێک بەردەست نییە بۆ پیشاندان
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                dy={10}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: '11px', fontWeight: 600 }}
              />
              
              {viewMode === 'stacked' ? (
                <>
                  <Bar 
                    dataKey="morning" 
                    name="بەیانیان (Morning)" 
                    fill="#0d9488" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar 
                    dataKey="evening" 
                    name="ئێواران (Evening)" 
                    fill="#f59e0b" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar 
                    dataKey="night" 
                    name="شەوان (Night)" 
                    fill="#6366f1" 
                    stackId="a" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </>
              ) : (
                <Bar 
                  dataKey="total" 
                  name="کۆی شیفتەکان" 
                  fill="#0d9488" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Chips under chart */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-600 font-medium">کۆی بەشەکان:</span>
          <span className="font-mono font-bold text-slate-900">{departments.length} بەش</span>
        </div>
        <div className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-200/60 flex items-center justify-between">
          <span className="text-teal-800 font-medium">شیفتی بەیانی:</span>
          <span className="font-mono font-bold text-teal-900">
            {chartData.reduce((acc, c) => acc + c.morning, 0)}
          </span>
        </div>
        <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 flex items-center justify-between">
          <span className="text-amber-800 font-medium">شیفتی ئێوارە:</span>
          <span className="font-mono font-bold text-amber-900">
            {chartData.reduce((acc, c) => acc + c.evening, 0)}
          </span>
        </div>
        <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200/60 flex items-center justify-between">
          <span className="text-indigo-800 font-medium">شیفتی شەو:</span>
          <span className="font-mono font-bold text-indigo-900">
            {chartData.reduce((acc, c) => acc + c.night, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
