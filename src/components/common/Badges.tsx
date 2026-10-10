import React from 'react';
import { 
  Activity, 
  HeartPulse, 
  Stethoscope, 
  Baby, 
  Users, 
  ShieldPlus, 
  Scissors, 
  Building2 
} from 'lucide-react';
import { Department, ShiftType, ShiftStatus } from '../../types';

export const getDepartmentIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'Activity': return <Activity className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Stethoscope': return <Stethoscope className={className} />;
    case 'Baby': return <Baby className={className} />;
    case 'Users': return <Users className={className} />;
    case 'ShieldPlus': return <ShieldPlus className={className} />;
    case 'Scissors': return <Scissors className={className} />;
    default: return <Building2 className={className} />;
  }
};

export const DepartmentBadge: React.FC<{
  department?: Department;
  deptId?: string;
  departments?: Department[];
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ department, deptId, departments = [], showIcon = true, size = 'md', className = '' }) => {
  const dept = department || departments.find(d => d.id === deptId);
  if (!dept) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
        {deptId || 'نادیار'}
      </span>
    );
  }

  const colorStyles: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const currentStyle = colorStyles[dept.color] || 'bg-slate-100 text-slate-700 border-slate-200';
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-lg border ${currentStyle} ${sizeClasses} ${className}`}>
      {showIcon && getDepartmentIcon(dept.iconName, size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')}
      <span>{dept.nameKu}</span>
      <span className="opacity-75 font-mono text-[10px] uppercase font-bold tracking-wider">({dept.code})</span>
    </span>
  );
};

export const ShiftTypeBadge: React.FC<{
  type: ShiftType;
  slotName?: string;
  showTime?: boolean;
  className?: string;
}> = ({ type, slotName, showTime = false, className = '' }) => {
  switch (type) {
    case 'morning':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>{slotName || 'بەیانیان'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(08:00 - 14:00 | 6h)</span>}
        </span>
      );
    case 'evening':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>{slotName || 'ئێواران'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(14:00 - 20:00 | 6h)</span>}
        </span>
      );
    case 'night':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          <span>{slotName || 'شەوان'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(20:00 - 08:00 | 12h)</span>}
        </span>
      );
    case 'support_night':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>{slotName || 'شەوی پشتیوانی (Spport Night)'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(22:00 - 06:00 | 8h)</span>}
        </span>
      );
    case 'support':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
          <span>{slotName || 'پشتیوانی (Support)'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(6h)</span>}
        </span>
      );
    case 'on_call':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
          <span>{slotName || 'ئۆنکۆڵ (OnCall)'}</span>
          {showTime && <span className="opacity-75 font-mono text-[11px]">(OnCall)</span>}
        </span>
      );
    case 'full_day':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{slotName || '٢٤ کاتژمێری'}</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 ${className}`}>
          <span>{slotName || 'تایبەت'}</span>
        </span>
      );
  }
};

export const StatusBadge: React.FC<{
  status: ShiftStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  switch (status) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>پەسەندکراو</span>
        </span>
      );
    case 'pending':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
          <span>چاوەڕوانکراو</span>
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          <span>ڕەتکراوە</span>
        </span>
      );
  }
};
