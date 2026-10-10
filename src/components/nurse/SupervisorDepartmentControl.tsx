import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Users, 
  Building2, 
  Calendar, 
  Filter, 
  Search, 
  Plus, 
  AlertTriangle, 
  Check, 
  MessageSquare, 
  Phone,
  Bed,
  FileSpreadsheet,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { ShiftRecord, ShiftStatus, ShiftType } from '../../types';
import { DepartmentBadge, ShiftTypeBadge, StatusBadge } from '../common/Badges';
import { LogShiftModal } from './LogShiftModal';

export const SupervisorDepartmentControl: React.FC = () => {
  const { 
    currentNurse, 
    departments, 
    nurses, 
    shifts, 
    getDepartment, 
    updateShiftStatus, 
    deleteShift,
    supervisorDepartmentIds,
    adminCredentials
  } = useHospital();

  // Sub-navigation view inside supervisor panel
  const [activeSubView, setActiveSubView] = useState<'pending' | 'allShifts' | 'staff'>('pending');

  // Selected department scope (defaults to 'all_supervised' or the single dept)
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all_supervised');

  // Filter for all shifts
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().substring(0, 7));
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string>('all');

  // Supervisor notes for pending shifts
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  // Confirmation modal for deleting a shift
  const [shiftToDelete, setShiftToDelete] = useState<ShiftRecord | null>(null);

  // Quick shift logging modal for staff
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logTargetNurseId, setLogTargetNurseId] = useState<string | undefined>(undefined);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (!currentNurse || !currentNurse.isSupervisor) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center text-amber-800 dark:text-amber-200">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
        <p className="font-bold">تۆ مۆڵەتی سەرپەرشتیاریت نییە لەم بەشەدا.</p>
      </div>
    );
  }

  // Determine allowed department IDs for this supervisor
  const allowedDeptIds = supervisorDepartmentIds.length > 0
    ? supervisorDepartmentIds
    : (currentNurse.departmentIds && currentNurse.departmentIds.length > 0 
        ? currentNurse.departmentIds 
        : [currentNurse.departmentId]);

  const supervisedDepartments = departments.filter(d => allowedDeptIds.includes(d.id));

  // Current active department IDs to display
  const activeDeptIds = selectedDeptId === 'all_supervised'
    ? allowedDeptIds
    : [selectedDeptId];

  // Helper to identify Admin / System Director so they are never treated as subordinate nurses
  const isSystemAdmin = (nurseId: string) => {
    return nurseId === adminCredentials.id || nurseId === 'A001';
  };

  const getRoleTitleKu = (role?: string) => {
    switch (role) {
      case 'head_nurse': return 'تیم لیدەر (Team Leader)';
      case 'senior_nurse': return 'پەرستاری دێرین';
      case 'registered_nurse': return 'پەرستاری بڕوانامەدار';
      case 'practical_nurse': return 'پەرستاری کارامە';
      case 'intern': return 'پەرستاری ڕاهێنراو';
      default: return 'پەرستار';
    }
  };

  // Strictly filter shifts belonging to this supervisor's departments (excluding Admin's account)
  const departmentShifts = shifts.filter(s => {
    if (isSystemAdmin(s.nurseId)) return false;
    return activeDeptIds.includes(s.departmentId);
  });

  // Pending shifts in this supervisor's scope
  const pendingShifts = departmentShifts.filter(s => s.status === 'pending');

  // Staff assigned to this supervisor's departments (Admin is NOT a subordinate nurse)
  const departmentNurses = nurses.filter(n => {
    if (isSystemAdminNurse(n) || isSystemAdmin(n.id) || n.notes?.includes('ئەدمین')) return false;
    const nDepts = n.departmentIds && n.departmentIds.length > 0 ? n.departmentIds : [n.departmentId];
    return nDepts.some(dId => activeDeptIds.includes(dId));
  });

  // Today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOnDutyCount = departmentShifts.filter(s => s.date === todayStr && s.status === 'approved').length;

  // Monthly approved hours for this department
  const monthlyApprovedHours = departmentShifts
    .filter(s => s.date.startsWith(monthFilter) && s.status === 'approved')
    .reduce((sum, s) => sum + (Number(s.hours) || 0) + (Number(s.extraHours) || 0), 0);

  // Handlers for approval/rejection
  const handleApprove = (shift: ShiftRecord) => {
    const note = pendingNotes[shift.id] || 'پەسەندکرا لەلایەن سەرپەرشتیاری بەش';
    updateShiftStatus(shift.id, 'approved', note);
    showToast(`شیفتی ${shift.nurseNameKu} بە سەرکەوتوویی پەسەندکرا.`);
  };

  const handleReject = (shift: ShiftRecord) => {
    const note = pendingNotes[shift.id] || 'ڕەتکرایەوە لەلایەن سەرپەرشتیاری بەش';
    updateShiftStatus(shift.id, 'rejected', note);
    showToast(`شیفتی ${shift.nurseNameKu} ڕەتکرایەوە.`);
  };

  const handleApproveAllPending = () => {
    if (pendingShifts.length === 0) return;
    if (confirm(`دڵنیایت لە پەسەندکردنی هەموو (${pendingShifts.length}) شیفتە چاوەڕوانکراوەکانی بەشەکەت؟`)) {
      pendingShifts.forEach(s => {
        updateShiftStatus(s.id, 'approved', 'پەسەندکراوی بەکۆمەڵ لەلایەن سەرپەرشتیاری بەش');
      });
      showToast(`هەموو (${pendingShifts.length}) شیفتەکە بە سەرکەوتوویی پەسەندکران.`);
    }
  };

  // Handler for delete
  const confirmDeleteShift = () => {
    if (!shiftToDelete) return;
    deleteShift(shiftToDelete.id);
    showToast(`شیفتی ${shiftToDelete.nurseNameKu} (${shiftToDelete.date}) بە سەرکەوتوویی ڕەشکرایەوە.`);
    setShiftToDelete(null);
  };

  // Filtered department shifts for "All Shifts" tab
  const filteredAllShifts = departmentShifts.filter(s => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = s.nurseNameKu?.toLowerCase().includes(term);
      const matchId = s.nurseId?.toLowerCase().includes(term);
      const matchBed = s.patientBedRoom?.toLowerCase().includes(term);
      if (!matchName && !matchId && !matchBed) return false;
    }
    // Month
    if (monthFilter && !s.date.startsWith(monthFilter)) return false;
    // Status
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    // Type
    if (shiftTypeFilter !== 'all' && s.shiftType !== shiftTypeFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Department Scope Guardian */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-teal-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                کۆنتڕۆڵی بەش - تیم لیدەر (Team Leader)
              </h2>
              <span className="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-bold">
                مۆڵەتی سنووردار
              </span>
            </div>

            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-normal">
              تۆ وەک تیم لیدەری ڕێگەپێدراوی{' '}
              <strong className="text-amber-300 font-bold underline decoration-amber-400/40 underline-offset-4">
                {supervisedDepartments.map(d => d.nameKu).join(' و ')}
              </strong>{' '}
              دیاریکراویت. دەسەڵاتەکانت بریتین لە: <span className="text-emerald-300 font-semibold">پەسەندکردنی شیفت</span>، <span className="text-rose-300 font-semibold">ڕەتکردنەوە</span>، و <span className="text-amber-200 font-semibold">ڕەشکردنەوەی شیفت</span> تەنها بۆ ستافی بەشەکەت. سیستەم بە توندی دەستکاری بەشەکانی تری بلۆک کردووە.
            </p>
          </div>

          {/* Department Scope Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-200">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>بەشی دیاریکراو:</span>
            </div>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-slate-900/90 text-white border border-teal-500/40 rounded-xl text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
            >
              {supervisedDepartments.length > 1 && (
                <option value="all_supervised">
                  هەموو بەشەکانم ({supervisedDepartments.length} بەش)
                </option>
              )}
              {supervisedDepartments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nameKu}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Row for Supervised Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Approvals Metric */}
        <div 
          onClick={() => setActiveSubView('pending')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
            activeSubView === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">شیفتی چاوەڕوانکراو</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {pendingShifts.length}
            </span>
            {pendingShifts.length > 0 && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full animate-pulse">
                پێویستی بە بڕیارە
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">لە چاوەڕوانی پەسەندکردن یان ڕەتکردنەوەن</p>
        </div>

        {/* Staff Count Metric */}
        <div 
          onClick={() => setActiveSubView('staff')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
            activeSubView === 'staff'
              ? 'border-teal-500 ring-2 ring-teal-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">پەرستارانی بەشەکەت</span>
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {departmentNurses.length} پەرستار
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ستافی ژێر سەرپەرشتی تۆ</p>
        </div>

        {/* Monthly Approved Hours Metric */}
        <div 
          onClick={() => setActiveSubView('allShifts')}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
            activeSubView === 'allShifts'
              ? 'border-teal-500 ring-2 ring-teal-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">کاتژمێری پەسەندکراو</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {monthlyApprovedHours} کاتژمێر
          </div>
          <p className="text-[11px] text-slate-400 mt-1">لە مانگی {monthFilter}دا</p>
        </div>

        {/* Today's On Duty Metric */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">لە دەوامی ئەمڕۆدا</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {todayOnDutyCount} پەرستار
          </div>
          <p className="text-[11px] text-slate-400 mt-1">بەرواری {todayStr}</p>
        </div>

      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubView('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubView === 'pending'
              ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>پەسەندکردنی شیفتەکان</span>
          {pendingShifts.length > 0 && (
            <span className="bg-amber-500 text-white text-[11px] font-mono px-2 py-0.5 rounded-full font-bold">
              {pendingShifts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('allShifts')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubView === 'allShifts'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>تۆماری گشتی و سڕینەوەی شیفتەکان</span>
          <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
            {departmentShifts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('staff')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubView === 'staff'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ستافی پەرستارانی بەشەکەم</span>
          <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
            {departmentNurses.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: PENDING APPROVALS & REJECTIONS                                */}
      {/* ========================================================================= */}
      {activeSubView === 'pending' && (
        <div className="space-y-4">
          
          {/* Header & Bulk Actions */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>داواکارییە چاوەڕوانکراوەکانی بەشەکەت ({pendingShifts.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تۆ وەک سەرپەرشتیار دەتوانیت ئەم شیفتانە پەسەند بکەیت یان بە تێبینییەوە ڕەتیان بکەیتەوە
              </p>
            </div>

            {pendingShifts.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAllPending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>پەسەندکردنی هەمووی ({pendingShifts.length})</span>
              </button>
            )}
          </div>

          {/* Pending Cards List */}
          {pendingShifts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                هیچ شیفتێکی چاوەڕوانکراو نییە
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                هەموو شیفتەکانی بەشەکەت بە سەرکەوتوویی پەسەندکراون یان دیاریکراون.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingShifts.map((shift) => {
                const nurse = nurses.find(n => n.id === shift.nurseId);
                const dept = getDepartment(shift.departmentId);

                return (
                  <div 
                    key={shift.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-200 dark:border-amber-800/80 p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={nurse?.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                            alt={shift.nurseNameKu}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {shift.nurseNameKu}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <DepartmentBadge department={dept} size="sm" />
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {getRoleTitleKu(nurse?.role)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-full border border-amber-300 dark:border-amber-700 animate-pulse">
                          چاوەڕوانکراو
                        </span>
                      </div>

                      {/* Shift Details Box */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>بەروار:</span>
                            <span className="font-mono text-slate-900 dark:text-slate-100">{shift.date}</span>
                          </div>
                          <ShiftTypeBadge type={shift.shiftType} showTime />
                        </div>

                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>کۆی کاتژمێر: <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">{(Number(shift.hours) || 0) + (Number(shift.extraHours) || 0)}</strong> کاتژمێر</span>
                            {shift.extraHours ? (
                              shift.extraHours > 0 ? (
                                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                  (+{shift.extraHours}h زیادە، بنیات: {shift.hours}h)
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded">
                                  ({shift.extraHours}h کەمکردن، بنیات: {shift.hours}h)
                                </span>
                              )
                            ) : null}
                          </div>
                          {shift.patientBedRoom && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-slate-400" />
                              <span>شوێن: <strong className="text-slate-900 dark:text-slate-100">{shift.patientBedRoom}</strong></span>
                            </div>
                          )}
                        </div>

                        {shift.notes && (
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">تێبینی پەرستار: </span>
                            {shift.notes}
                          </div>
                        )}
                      </div>

                      {/* Supervisor Note Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-400" />
                          <span>تێبینی سەرپەرشتیار (ئارەزوومەندانە):</span>
                        </label>
                        <input
                          type="text"
                          value={pendingNotes[shift.id] || ''}
                          onChange={(e) => setPendingNotes({ ...pendingNotes, [shift.id]: e.target.value })}
                          placeholder="هۆکار یان ڕێنمایی بنووسە..."
                          className="w-full text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleApprove(shift)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>پەسەندکردن</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(shift)}
                        className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>ڕەتکردنەوە</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShiftToDelete(shift)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="سڕینەوە / ڕەشکردنەوەی شیفت"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: ALL DEPARTMENT SHIFTS & DELETION                              */}
      {/* ========================================================================= */}
      {activeSubView === 'allShifts' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  <span>تۆماری گشتی شیفتەکانی بەشەکەت ({filteredAllShifts.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تۆ وەک سەرپەرشتیار مۆڵەتی تەواوت هەیە بۆ ڕەشکردنەوە (سڕینەوە) و دەستکاریکردنی ئەم شیفتانە
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLogTargetNurseId(undefined);
                  setIsLogModalOpen(true);
                }}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>تۆمارکردنی شیفت بۆ پەرستارێک</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="گەڕان بەپێی ناوی پەرستار یان ژوور..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Month */}
              <div>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Status */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">هەموو دۆخەکان</option>
                  <option value="approved">تەنها پەسەندکراو</option>
                  <option value="pending">تەنها چاوەڕوانکراو</option>
                  <option value="rejected">تەنها ڕەتکراوە</option>
                </select>
              </div>

              {/* Shift Type */}
              <div>
                <select
                  value={shiftTypeFilter}
                  onChange={(e) => setShiftTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">هەموو جۆرەکانی شیفت</option>
                  <option value="morning">بەیانیان (Morning)</option>
                  <option value="evening">ئێواران (Evening)</option>
                  <option value="night">شەوان (Night)</option>
                  <option value="fullday">24 کاتژمێری</option>
                </select>
              </div>

            </div>
          </div>

          {/* Shifts Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredAllShifts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-bold">هیچ شیفتێک بەم فلتەرانە نەدۆزرایەوە لە بەشەکەتدا.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold">
                    <tr>
                      <th className="p-3.5">پەرستار</th>
                      <th className="p-3.5">بەروار</th>
                      <th className="p-3.5">جۆری شیفت</th>
                      <th className="p-3.5">کاتژمێر</th>
                      <th className="p-3.5">بەش</th>
                      <th className="p-3.5">دۆخ</th>
                      <th className="p-3.5">سەرپەرشتیار / ئەدمین</th>
                      <th className="p-3.5 text-center">کردارەکان (دەسەڵاتی سەرپەرشتیار)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredAllShifts.map((shift) => {
                      const nurse = nurses.find(n => n.id === shift.nurseId);
                      const dept = getDepartment(shift.departmentId);

                      return (
                        <tr 
                          key={shift.id} 
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={nurse?.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                                alt={shift.nurseNameKu}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                  {shift.nurseNameKu}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                  {getRoleTitleKu(nurse?.role)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {shift.date}
                          </td>

                          <td className="p-3.5">
                            <ShiftTypeBadge type={shift.shiftType} showTime={false} />
                          </td>

                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {(Number(shift.hours) || 0) + (Number(shift.extraHours) || 0)} ک
                            </span>
                            {shift.extraHours ? (
                              shift.extraHours > 0 ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block font-sans">+{shift.extraHours}h زیادە</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block font-sans">{shift.extraHours}h کەمکردن</span>
                              )
                            ) : null}
                          </td>

                          <td className="p-3.5">
                            <DepartmentBadge department={dept} size="sm" />
                          </td>

                          <td className="p-3.5">
                            <StatusBadge status={shift.status} />
                          </td>

                          <td className="p-3.5 text-[11px] text-slate-500">
                            {shift.approvedBy || 'سیستەم'}
                            {shift.supervisorNotes && (
                              <span className="block text-[10px] text-slate-400 truncate max-w-[140px]" title={shift.supervisorNotes}>
                                {shift.supervisorNotes}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick Approve if pending or rejected */}
                              {shift.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(shift)}
                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                                  title="پەسەندکردن"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Quick Reject if pending or approved */}
                              {shift.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleReject(shift)}
                                  className="p-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg transition-colors cursor-pointer"
                                  title="ڕەتکردنەوە"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Shift (ڕەشکردنەوەی شیفت) */}
                              <button
                                type="button"
                                onClick={() => setShiftToDelete(shift)}
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-lg transition-colors cursor-pointer"
                                title="ڕەشکردنەوە / سڕینەوەی ئەم شیفتە لە بەشەکەت"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: DEPARTMENT STAFF OVERVIEW & QUICK LOG                         */}
      {/* ========================================================================= */}
      {activeSubView === 'staff' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>پەرستارانی ژێر سەرپەرشتی تۆ ({departmentNurses.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                لیستی پەرستارانی بەشەکەت، کاتژمێرە کارکراوەکان و تۆمارکردنی خێرای شیفت بۆیان
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentNurses.map((nurse) => {
              const nurseShiftsThisMonth = departmentShifts.filter(
                s => s.nurseId === nurse.id && s.date.startsWith(monthFilter) && s.status === 'approved'
              );
              const totalHours = nurseShiftsThisMonth.reduce((sum, s) => sum + (Number(s.hours) || 0) + (Number(s.extraHours) || 0), 0);
              const extraHoursNet = nurseShiftsThisMonth.reduce((sum, s) => sum + (Number(s.extraHours) || 0), 0);
              const targetHours = nurse.maxMonthlyHours || 160;
              const percent = Math.min(100, Math.round((totalHours / targetHours) * 100));

              // Check if nurse has shift today
              const todayShift = departmentShifts.find(s => s.nurseId === nurse.id && s.date === todayStr);

              return (
                <div 
                  key={nurse.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={nurse.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                          alt={nurse.fullNameKu}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {nurse.fullNameKu}
                          </h4>
                          <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 inline-block mt-0.5">
                            {getRoleTitleKu(nurse.role)}
                          </span>
                        </div>
                      </div>

                      {todayShift ? (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-300 dark:border-emerald-800">
                          ئەمڕۆ لە دەوامە
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full">
                          پشوو (Off)
                        </span>
                      )}
                    </div>

                    {/* Hours Progress */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>کاتژمێری مانگانە:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {totalHours} / {targetHours} کاتژمێر
                          </span>
                          {extraHoursNet !== 0 && (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              extraHoursNet > 0 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              {extraHoursNet > 0 ? `+${extraHoursNet}h` : `${extraHoursNet}h`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-teal-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>ڕێژەی ئەنجامدراو</span>
                        <span className="font-mono font-bold">{percent}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{nurse.phone}</span>
                    </div>
                  </div>

                  {/* Action to log shift for this nurse */}
                  <button
                    type="button"
                    onClick={() => {
                      setLogTargetNurseId(nurse.id);
                      setIsLogModalOpen(true);
                    }}
                    className="w-full py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تۆمارکردنی شیفت بۆ ئەم پەرستارە</span>
                  </button>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL FOR DELETING A SHIFT (ڕەشکردنەوەی شیفت)               */}
      {/* ========================================================================= */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  ڕەشکردنەوەی شیفت (سڕینەوە)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سەلاحیەتی سەرپەرشتیاری بەش
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ئایا دڵنیایت لە ڕەشکردنەوە و سڕینەوەی ئەم شیفتەی پەرستار{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-bold">{shiftToDelete.nurseNameKu}</strong>{' '}
              لە بەرواری <strong className="font-mono text-slate-900 dark:text-slate-100">{shiftToDelete.date}</strong>{' '}
              بە بڕی <strong className="font-mono text-slate-900 dark:text-slate-100">{shiftToDelete.hours} کاتژمێر</strong>؟
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
              ⚠️ ئەم کردارە لە خشتەی پەرستارەکە دەسڕدرێتەوە و لە کاتژمێرە مانگانەکانی کەم دەکرێتەوە. تەنها لە سنووری بەشەکەی خۆتدا ڕێگەپێدراوە.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={confirmDeleteShift}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>بەڵێ، ڕەشی بکەرەوە</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Shift Logging Modal for Staff in Supervised Dept */}
      <LogShiftModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setLogTargetNurseId(undefined);
        }}
        preSelectedNurseId={logTargetNurseId}
      />

    </div>
  );
};
