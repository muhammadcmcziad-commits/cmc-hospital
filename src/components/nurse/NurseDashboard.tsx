import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Bell, 
  Phone, 
  Mail, 
  Shield, 
  UserCheck, 
  Search, 
  Filter, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Calculator,
  Award,
  CalendarDays,
  KeyRound,
  Eye,
  EyeOff,
  X,
  UserCheck2,
  RotateCcw,
  Camera
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { ShiftRecord, ShiftType } from '../../types';
import { DepartmentBadge, ShiftTypeBadge, StatusBadge } from '../common/Badges';
import { LogShiftModal } from './LogShiftModal';
import { checkDateLockStatus } from '../../utils/dateLockUtils';
import { SupervisorDepartmentControl } from './SupervisorDepartmentControl';
import { AvatarPickerModal } from '../common/AvatarPickerModal';
import { 
  getSavedGoogleSyncState, 
  syncNurseCredentialsToGoogleSheet 
} from '../../services/googleDriveService';

export const NurseDashboard: React.FC = () => {
  const { 
    t, 
    currentNurse, 
    departments, 
    nurses, 
    shifts, 
    deletedShifts,
    notices, 
    getDepartment, 
    deleteShift,
    restoreShift,
    exportShiftsToCSV,
    changeNurseCredentials,
    updateNurse,
    adminCredentials
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'shifts' | 'calendar' | 'notices' | 'supervisor'>('shifts');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string | undefined>(undefined);
  
  // Avatar modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Credentials modal state
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [newNurseId, setNewNurseId] = useState(currentNurse?.id || '');
  const [newNursePin, setNewNursePin] = useState(currentNurse?.pin || '');
  const [confirmNursePin, setConfirmNursePin] = useState(currentNurse?.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [credsError, setCredsError] = useState('');
  const [credsSuccess, setCredsSuccess] = useState('');

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNurse) return;
    setCredsError('');
    setCredsSuccess('');

    const cleanId = newNurseId.trim().toUpperCase();
    const cleanPin = newNursePin.trim();
    const cleanConfirm = confirmNursePin.trim();

    if (!cleanId) {
      setCredsError('تکایە ئایدی نوێ بنووسە');
      return;
    }
    if (!cleanPin) {
      setCredsError('تکایە وشەی تێپەڕبوون (PIN) بنووسە');
      return;
    }
    if (cleanPin.length < 3) {
      setCredsError('وشەی تێپەڕبوون دەبێت لانیکەم ٣ پیت یان ژمارە بێت');
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setCredsError('وشەی تێپەڕبوون و دووبارەکردنەوەکەی یەک ناگرنەوە!');
      return;
    }

    const oldNurseId = currentNurse.id;
    const res = changeNurseCredentials(currentNurse.id, cleanId, cleanPin);
    if (res.success) {
      setCredsSuccess(res.message);

      // Auto-sync changed credentials to Google Sheets (nurse time)
      const syncState = getSavedGoogleSyncState();
      if (syncState.accessToken) {
        syncNurseCredentialsToGoogleSheet({
          oldId: oldNurseId,
          newId: cleanId,
          newPin: cleanPin,
          fullNameKu: currentNurse.fullNameKu,
          fullNameEn: currentNurse.fullNameEn,
          phone: currentNurse.phone,
          role: currentNurse.role,
          allNurses: nurses,
          allDepartments: departments,
          allShifts: shifts,
        }).catch((err) => console.warn('Nurse self-update sheets sync error:', err));
      }

      setTimeout(() => {
        setIsCredsModalOpen(false);
        setCredsSuccess('');
      }, 1500);
    } else {
      setCredsError(res.message);
    }
  };
  
  // Shift filter
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Calendar month state
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  if (!currentNurse) return null;

  const assignedDeptIds = (currentNurse.departmentIds && currentNurse.departmentIds.length > 0)
    ? currentNurse.departmentIds
    : [currentNurse.departmentId];
  const nurseDepts = assignedDeptIds
    .map(dId => getDepartment(dId))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  // Filter nurse shifts
  const myShifts = shifts.filter(s => s.nurseId === currentNurse.id);
  
  // Current month shifts
  const currentMonthShifts = myShifts.filter(s => s.date.startsWith(filterMonth));
  
  // Calculate total hours this month
  const approvedHours = currentMonthShifts
    .filter(s => s.status === 'approved')
    .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);

  const pendingHours = currentMonthShifts
    .filter(s => s.status === 'pending')
    .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);

  const targetHours = currentNurse.maxMonthlyHours || 160;
  const progressPercent = Math.min(100, Math.round((approvedHours / targetHours) * 100));
  const overtimeHours = Math.max(0, approvedHours - targetHours);

  // Today's shift for this nurse
  const todayStr = new Date().toISOString().split('T')[0];
  const todayShift = myShifts.find(s => s.date === todayStr);

  // Pending shifts in this supervisor's departments (excluding Admin account)
  const pendingInSupervisorDepts = currentNurse.isSupervisor
    ? shifts.filter(s => 
        s.status === 'pending' && 
        s.nurseId !== adminCredentials.id && 
        s.nurseId !== 'A001' && 
        assignedDeptIds.includes(s.departmentId)
      )
    : [];

  // Notices for all or this nurse's departments
  const relevantNotices = notices.filter(
    n => n.targetDepartmentId === 'all' || assignedDeptIds.includes(n.targetDepartmentId)
  );

  // Month Name helper in Kurdish
  const formatMonthNameKu = (yearMonthStr: string) => {
    if (!yearMonthStr) return '';
    const parts = yearMonthStr.split('-');
    if (parts.length < 2) return yearMonthStr;
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const kurdishMonths = [
      'کانوونی دووەم (1)', 'شوبات (2)', 'ئازار (3)', 'نیسان (4)',
      'ئایار (5)', 'حوزەیران (6)', 'تەممووز (7)', 'ئاب (8)',
      'ئەیلوول (9)', 'تشرینی یەکەم (10)', 'تشرینی دووەم (11)', 'کانوونی یەکەم (12)'
    ];
    const name = kurdishMonths[monthNum - 1] || yearMonthStr;
    return `${name} - ${year}`;
  };

  // Group all shifts by month for monthly summaries
  const monthlySummaries = useMemo(() => {
    const map: { [key: string]: {
      monthKey: string;
      totalHours: number;
      approvedHours: number;
      pendingHours: number;
      rejectedHours: number;
      extraHoursNet: number;
      shiftsCount: number;
    } } = {};

    myShifts.forEach(shift => {
      const mKey = shift.date.substring(0, 7); // YYYY-MM
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          totalHours: 0,
          approvedHours: 0,
          pendingHours: 0,
          rejectedHours: 0,
          extraHoursNet: 0,
          shiftsCount: 0
        };
      }
      const baseH = Number(shift.hours) || 0;
      const extra = Number(shift.extraHours) || 0;
      const netH = baseH + extra;
      map[mKey].shiftsCount += 1;
      map[mKey].totalHours += netH;
      map[mKey].extraHoursNet += extra;
      if (shift.status === 'approved') {
        map[mKey].approvedHours += netH;
      } else if (shift.status === 'pending') {
        map[mKey].pendingHours += netH;
      } else if (shift.status === 'rejected') {
        map[mKey].rejectedHours += netH;
      }
    });

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [myShifts]);

  // Filtered shifts based on search/month filters
  const filteredShifts = useMemo(() => {
    if (statusFilter === 'deleted') {
      return deletedShifts
        .filter(s => s.nurseId === currentNurse.id)
        .filter(s => !filterMonth || s.date.startsWith(filterMonth));
    }
    return myShifts
      .filter(s => statusFilter === 'all' || s.status === statusFilter)
      .filter(s => !filterMonth || s.date.startsWith(filterMonth));
  }, [myShifts, deletedShifts, currentNurse.id, statusFilter, filterMonth]);

  // Filtered totals
  const filteredTotalHours = useMemo(() => {
    return filteredShifts.reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
  }, [filteredShifts]);

  const filteredApprovedHours = useMemo(() => {
    return filteredShifts
      .filter(s => s.status === 'approved')
      .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
  }, [filteredShifts]);

  const filteredPendingHours = useMemo(() => {
    return filteredShifts
      .filter(s => s.status === 'pending')
      .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
  }, [filteredShifts]);

  const filteredExtraHours = useMemo(() => {
    return filteredShifts.reduce((acc, curr) => acc + (Number(curr.extraHours) || 0), 0);
  }, [filteredShifts]);

  // Calendar generation helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  };

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInCalMonth = getDaysInMonth(calYear, calMonth);
  const startDayIndex = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Nurse Profile Card & Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar & Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="relative block rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 cursor-pointer"
                title="کلیک بکە بۆ گۆڕینی وێنەی پرۆفایل"
              >
                <img
                  src={currentNurse.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                  alt={currentNurse.fullNameKu}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-sm transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5">
                  <Camera className="w-5 h-5" />
                  <span>گۆڕین</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute -bottom-1.5 -left-1.5 w-6 h-6 bg-teal-600 hover:bg-teal-700 text-white rounded-full border-2 border-white flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-110"
                title="گۆڕینی وێنەی پرۆفایل"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white pointer-events-none" title="چالاکە">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {currentNurse.fullNameKu}
                </h2>
                {currentNurse.isSupervisor && (
                  <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                    بەرپرسی ستاف (Supervisor)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-1.5">
                  {nurseDepts.map(dept => (
                    <DepartmentBadge key={dept.id} department={dept} size="sm" />
                  ))}
                </div>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{currentNurse.phone}</span>
                </span>
                <span className="text-slate-400">|</span>
                <span>دامەزراندن: {currentNurse.joinedDate}</span>
              </div>

              {currentNurse.notes && (
                <p className="text-xs text-slate-500 pt-0.5">
                  {currentNurse.notes}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="دانان و گۆڕینی وێنەی پرۆفایلی ئەکاونتەکەت"
            >
              <Camera className="w-4 h-4 text-teal-600" />
              <span>گۆڕینی وێنە</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewNurseId(currentNurse.id);
                setNewNursePin(currentNurse.pin || '');
                setConfirmNursePin(currentNurse.pin || '');
                setCredsError('');
                setCredsSuccess('');
                setIsCredsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <KeyRound className="w-4 h-4 text-teal-600" />
              <span>گۆڕینی ئایدی و وشەی نهێنی</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedLogDate(todayStr);
                setIsLogModalOpen(true);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.logNewShift}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Supervisor Quick Alert Banner */}
      {currentNurse.isSupervisor && (
        <div className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-slate-50 dark:to-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>دەسەڵاتی سەرپەرشتیاری (Supervisor)</span>
                {pendingInSupervisorDepts.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {pendingInSupervisorDepts.length} چاوەڕوانکراو
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                تۆ مۆڵەتی پەسەندکردن، ڕەتکردنەوە، و سڕینەوەی شیفتەکانت هەیە بۆ بەشی {nurseDepts.map(d => d.nameKu).join('، ')}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('supervisor')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>کۆنتڕۆڵی بەشەکەم</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Shift Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">شیفتی ئەمڕۆت ({todayStr})</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          {todayShift ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ShiftTypeBadge type={todayShift.shiftType} showTime />
              </div>
              <div className="text-xs text-slate-600">
                {todayShift.patientBedRoom ? `شوێن: ${todayShift.patientBedRoom}` : 'دەوامی ئاسایی'}
              </div>
              <div className="mt-2">
                <StatusBadge status={todayShift.status} />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-bold text-slate-700 mb-1">ئەمڕۆ پشووە (Off)</div>
              <p className="text-xs text-slate-500">هیچ شیفتێک بۆ ئەمڕۆ تۆمار نەکراوە.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLogDate(todayStr);
                  setIsLogModalOpen(true);
                }}
                className="mt-2 text-xs font-bold text-teal-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> تۆمارکردنی دەوامی ئەمڕۆ
              </button>
            </div>
          )}
        </div>

        {/* Monthly Hours Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">{t.monthlyHours}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{approvedHours}</span>
            <span className="text-xs text-slate-500 font-mono">/ {targetHours} کاتژمێر</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 my-2 overflow-hidden">
            <div 
              className={`h-2.5 rounded-full transition-all ${
                progressPercent >= 100 ? 'bg-emerald-500' : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{progressPercent}% تەواوکراوە</span>
            {pendingHours > 0 && (
              <span className="text-amber-600 font-medium">+{pendingHours} کاتژمێری چاوەڕوانکراو</span>
            )}
          </div>
        </div>

        {/* Shifts Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">کۆی شیفتە تۆمارکراوەکان</span>
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {myShifts.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentMonthShifts.length} شیفت لەم مانگەدا
          </p>
        </div>

        {/* Assigned Departments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">بەشە کارپێکراوەکانت</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {nurseDepts.length} بەش
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate" title={nurseDepts.map(d => d.nameKu).join('، ')}>
            {nurseDepts.map(d => d.nameKu).join('، ')}
          </p>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto pb-px">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'shifts'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t.myShifts}</span>
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">{myShifts.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{t.myCalendar}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notices')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'notices'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{t.announcements}</span>
            {relevantNotices.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          {currentNurse.isSupervisor && (
            <button
              type="button"
              onClick={() => setActiveTab('supervisor')}
              className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'supervisor'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>کۆنتڕۆڵی بەش (سەرپەرشتیار)</span>
              {pendingInSupervisorDepts.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  {pendingInSupervisorDepts.length}
                </span>
              )}
            </button>
          )}
        </div>

        {activeTab === 'shifts' && (
          <button
            type="button"
            onClick={() => exportShiftsToCSV(currentNurse.departmentId)}
            className="p-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1.5"
            title={t.exportCSV}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">{t.exportCSV}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Shift History / Table */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          
          {/* Table Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> فلتەر:
              </span>
              
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg text-xs font-medium px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">هەموو دۆخەکان</option>
                <option value="approved">پەسەندکراو (Approved)</option>
                <option value="pending">چاوەڕوانکراو (Pending)</option>
                <option value="rejected">ڕەتکراوە (Rejected)</option>
                <option value="deleted">ڕەشکراوەکان / سڕاوەکان (Deleted)</option>
              </select>

              {/* Month selector */}
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg text-xs font-medium px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />

              {filterMonth && (
                <button
                  type="button"
                  onClick={() => setFilterMonth('')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  هەموو مانگەکان
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.logNewShift}</span>
            </button>
          </div>

          {/* Shifts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">بەروار</th>
                  <th className="p-3.5">جۆری شیفت</th>
                  <th className="p-3.5">کاتژمێرەکان</th>
                  <th className="p-3.5">ژوور / قەرەوێڵە</th>
                  <th className="p-3.5">تێبینی و ڕادەستکردن</th>
                  <th className="p-3.5">دۆخی پەسەندکردن</th>
                  <th className="p-3.5 text-center">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{shift.date}</span>
                        {shift.date === todayStr && (
                          <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded font-sans">ئەمڕۆ</span>
                        )}
                      </div>
                      {shift.createdAt && (
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                          <span className="text-slate-500 font-medium">تایمی داخیلکردن:</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">
                            {new Date(shift.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <ShiftTypeBadge type={shift.shiftType} slotName={shift.slotName} />
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {(Number(shift.hours) || 0) + (Number(shift.extraHours) || 0)} کاتژمێر
                      </span>
                      {shift.extraHours ? (
                        shift.extraHours > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-bold block text-[11px]">
                            +{shift.extraHours}h ئۆڤەرتایم (بنیات: {shift.hours}h)
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold block text-[11px]">
                            {shift.extraHours}h سالیب (بنیات: {shift.hours}h)
                          </span>
                        )
                      ) : null}
                      <span className="text-slate-400 block text-[11px]">({shift.startTime} - {shift.endTime})</span>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {shift.patientBedRoom || '—'}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate" title={shift.notes}>
                      {shift.notes || '—'}
                      {shift.supervisorNotes && (
                        <span className="block text-[11px] text-purple-700 font-medium mt-0.5">
                          تێبینی سەرپەرشتیار: {shift.supervisorNotes}
                        </span>
                      )}
                      {shift.deletedReason && (
                        <span className="block text-[11px] text-rose-700 font-medium mt-0.5">
                          هۆکاری سڕینەوە: {shift.deletedReason} (لەلایەن: {shift.deletedBy || 'سەرپەرشتیار'})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {statusFilter === 'deleted' || shift.deletedAt ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full border bg-rose-100 text-rose-800 border-rose-300">
                          ڕەشکراوە (سڕاوە)
                        </span>
                      ) : (
                        <StatusBadge status={shift.status} />
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {statusFilter === 'deleted' || shift.deletedAt ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('ئایا دڵنیایت لە گەڕاندنەوەی ئەم شیفتە بۆ دۆخی چاوەڕوانکراو؟')) {
                              restoreShift(shift.id, 'pending');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 flex items-center gap-1 mx-auto cursor-pointer"
                          title="گەڕاندنەوەی شیفت"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>گەڕاندنەوە</span>
                        </button>
                      ) : (shift.status === 'pending' || shift.status === 'rejected') ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('دڵنیایت لە سڕینەوەی ئەم شیفتە داغڵکراوە؟ دەچێتە بەشی سڕاوەکان و دەتوانیت بیگەڕێنیتەوە.')) {
                              deleteShift(shift.id, 'سڕایەوە لەلایەن پەرستار');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="سڕینەوەی شیفت"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-sm text-slate-700">
                        {statusFilter === 'deleted'
                          ? 'هیچ شیفتێکی ڕەشکراو (سڕاوە) بوونی نییە'
                          : statusFilter === 'rejected'
                          ? 'هیچ شیفتێکی ڕەتکراوە بوونی نییە'
                          : 'هیچ شیفتێک بەپێی ئەم فلتەرە نەدۆزرایەوە'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                        {statusFilter === 'deleted'
                          ? 'سەبەتەی شیفتە سڕاوەکانت بەتاڵە. هەرکاتێک شیفتێک بسڕیتەوە دەچێتە ئێرە تا بتوانیت بیگەڕێنیتەوە.'
                          : statusFilter === 'rejected'
                          ? 'هیچ شیفتێکی ڕەتکراوە نییە. ئەگەر شیفتەکەت پێشتر ڕەشکردووەتەوە، فلتەری «ڕەشکراوەکان / سڕاوەکان» هەڵبژێرە بۆ بینینی.'
                          : filterMonth 
                          ? `بۆ مانگی ${formatMonthNameKu(filterMonth)} هیچ شیفتێک تۆمار نەکراوە.` 
                          : 'دەتوانیت لە ڕێگەی دوگمەی "تۆمارکردنی شیفتی نوێ" دەوامی خۆت داغڵ بکەیت.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer with Summary Sum Row */}
              {filteredShifts.length > 0 && (
                <tfoot className="bg-slate-100/90 text-slate-800 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3.5 text-xs font-black" colSpan={2}>
                      <span className="inline-flex items-center gap-1 text-teal-800">
                        <Calculator className="w-4 h-4 text-teal-600" />
                        کۆی گشتی (مجموع):
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="text-teal-700 text-sm font-black block">
                        {filteredTotalHours} کاتژمێر
                      </span>
                      {filteredExtraHours !== 0 && (
                        <span className={`block text-[11px] font-bold ${filteredExtraHours > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                          {filteredExtraHours > 0 ? `+${filteredExtraHours}` : filteredExtraHours}h زیادە/کەم
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]" colSpan={2}>
                      پەسەندکراو: <strong className="text-emerald-700 font-mono">{filteredApprovedHours}h</strong> • چاوەڕوانکراو: <strong className="text-amber-700 font-mono">{filteredPendingHours}h</strong>
                    </td>
                    <td className="p-3.5 text-slate-700 text-xs font-bold" colSpan={2}>
                      کۆی: <span className="font-mono font-black text-teal-800">{filteredShifts.length}</span> شیفت
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Highlight: Nurse Total Hours per Month (مجموع الساعات بە ڕوونی) */}
          <div className="p-5 bg-gradient-to-l from-teal-50 via-emerald-50/70 to-teal-50 border-t border-teal-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                  <Calculator className="w-6 h-6" />
                </div>
                
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-200 text-teal-900">
                      پوختەی کاتژمێرەکانی مانگ (مجموع)
                    </span>
                    {filterMonth && (
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {formatMonthNameKu(filterMonth)}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                    {filterMonth ? (
                      <>
                        پەرستاری بەڕێز، لە مانگی <span className="text-teal-700 underline decoration-teal-400 font-extrabold">{formatMonthNameKu(filterMonth)}</span> دا، بەگشتی سعاتەکانت دەگاتە{' '}
                        <span className="text-teal-700 text-lg sm:text-xl font-black font-mono">
                          {filteredTotalHours} کاتژمێر
                        </span>{' '}
                        بە مجموع.
                      </>
                    ) : (
                      <>
                        پەرستاری بەڕێز، کۆی گشتی سعاتەکانت لە هەموو شیفتەکاندا دەگاتە{' '}
                        <span className="text-teal-700 text-lg sm:text-xl font-black font-mono">
                          {filteredTotalHours} کاتژمێر
                        </span>{' '}
                        بە مجموع.
                      </>
                    )}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                    <span>
                      پەسەندکراوی کۆتایی: <strong className="text-emerald-700 font-mono">{filteredApprovedHours} کاتژمێر</strong>
                    </span>
                    {filteredPendingHours > 0 && (
                      <span>
                        لە چاوەڕوانی پەسەندکردندا: <strong className="text-amber-700 font-mono">{filteredPendingHours} کاتژمێر</strong>
                      </span>
                    )}
                    <span>
                      کۆی شیفتەکان: <strong className="text-slate-800 font-mono">{filteredShifts.length} شیفت</strong>
                    </span>
                    {filterMonth && (
                      <span>
                        دەوامی دیاریکراوی مانگانە: <strong className="text-slate-800 font-mono">{targetHours} کاتژمێر</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Large Number Badge */}
              <div className="bg-white px-4 py-3 rounded-2xl border border-teal-200 shadow-xs flex items-center gap-3 shrink-0 self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">مجموعی سعاتەکان</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-teal-700 font-mono">
                      {filteredTotalHours}
                    </span>
                    <span className="text-xs text-slate-600 font-bold">کاتژمێر</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Monthly Breakdown History for Nurse (خشتەی مجموعی مانگەکان) */}
      {activeTab === 'shifts' && monthlySummaries.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-extrabold text-slate-900">
                پوختە و مجموعی کاتژمێرەکان بەپێی مانگەکان
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              کلیک لە هەر مانگێک بکە بۆ بینینی وردەکاری
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthlySummaries.map((m) => {
              const isSelected = filterMonth === m.monthKey;
              return (
                <button
                  type="button"
                  key={m.monthKey}
                  onClick={() => setFilterMonth(m.monthKey)}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {formatMonthNameKu(m.monthKey)}
                    </span>
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      {m.shiftsCount} شیفت
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xs text-slate-600">مجموعی کاتژمێرەکان:</span>
                    <span className="text-lg font-black text-teal-700 font-mono">
                      {m.totalHours} <span className="text-xs font-normal text-slate-500">سعات</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/80">
                    <span>پەسەندکراو: <strong className="text-emerald-700 font-mono">{m.approvedHours}h</strong></span>
                    <span>چاوەڕوانکراو: <strong className="text-amber-700 font-mono">{m.pendingHours}h</strong></span>
                    {m.extraHoursNet !== 0 && (
                      <span className={m.extraHoursNet > 0 ? 'text-amber-700 font-bold' : 'text-rose-600 font-bold'}>
                        {m.extraHoursNet > 0 ? `+${m.extraHoursNet}h` : `${m.extraHoursNet}h`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Monthly Calendar */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {calendarDate.toLocaleDateString(t === 'en' ? 'en-US' : 'ar-IQ', { month: 'long', year: 'numeric' })}
              </h3>
              <span className="text-xs text-slate-500">خشتەی مانگانەی تایبەت بە تۆ</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 text-slate-700"
              >
                ئەمڕۆ
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500">
            <div>شەممە (Sat)</div>
            <div>یەکشەممە (Sun)</div>
            <div>دووشەممە (Mon)</div>
            <div>سێشەممە (Tue)</div>
            <div>چوارشەممە (Wed)</div>
            <div>پێنجشەممە (Thu)</div>
            <div>هەینی (Fri)</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for starting offset */}
            {Array.from({ length: (startDayIndex + 1) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 bg-slate-50/50 rounded-xl border border-dashed border-slate-100"></div>
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInCalMonth }).map((_, i) => {
              const dayNum紧 = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum紧).padStart(2, '0')}`;
              const dayShifts = myShifts.filter(s => s.date === dateStr);
              const isToday = dateStr === todayStr;
              const lockStatus = checkDateLockStatus(dateStr, new Date(), 'nurse');
              const isLocked = lockStatus.isLocked;

              return (
                <div
                  key={dateStr}
                  className={`min-h-24 p-2 rounded-xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-400/20'
                      : isLocked
                      ? 'bg-slate-100/50 border-slate-200 opacity-65 select-none'
                      : dayShifts.length > 0
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${isToday ? 'text-teal-800' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                      {dayNum紧}
                    </span>
                    {isToday ? (
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    ) : isLocked ? (
                      <Lock className="w-3 h-3 text-slate-400" title={lockStatus.message || "ڕۆژەکە قوفڵکراوە"} />
                    ) : null}
                  </div>

                  <div className="space-y-1 my-1">
                    {dayShifts.map((sh) => (
                      <div
                        key={sh.id}
                        className={`text-[10px] p-1 rounded font-bold truncate ${
                          sh.shiftType === 'morning'
                            ? 'bg-amber-100 text-amber-900'
                            : sh.shiftType === 'evening'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {sh.shiftType === 'morning' ? 'بەیانیان' : sh.shiftType === 'evening' ? 'ئێواران' : 'شەوان'} ({sh.hours}k)
                      </div>
                    ))}
                  </div>

                  {isLocked ? (
                    <span className="text-[10px] text-slate-400 font-bold self-end flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>قوفڵە</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLogDate(dateStr);
                        setIsLogModalOpen(true);
                      }}
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-bold self-end opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      + تۆمارکردن
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Bottom Monthly Summary */}
          {(() => {
            const calMonthKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
            const calMonthShifts = myShifts.filter(s => s.date.startsWith(calMonthKey));
            const calTotalHours = calMonthShifts.reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
            const calApprovedHours = calMonthShifts.filter(s => s.status === 'approved').reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
            const calPendingHours = calMonthShifts.filter(s => s.status === 'pending').reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);

            return (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-l from-teal-50 via-emerald-50/70 to-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      پوختە و مجموعی کاتژمێرەکانی مانگی {formatMonthNameKu(calMonthKey)}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      پەرستاری بەڕێز، لەم مانگەدا کۆی گشتی سعاتەکانت دەگاتە <strong className="text-teal-800 font-mono font-black">{calTotalHours} کاتژمێر</strong> بە مجموع ({calApprovedHours} پەسەندکراو • {calPendingHours} لە چاوەڕوانیدا).
                    </p>
                  </div>
                </div>
                <div className="text-right sm:self-center shrink-0 bg-white px-3 py-1.5 rounded-lg border border-teal-100">
                  <span className="text-lg sm:text-xl font-black text-teal-700 font-mono">
                    {calTotalHours} <span className="text-xs font-normal text-slate-600">سعات بە مجموع</span>
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: Hospital / Department Notices */}
      {activeTab === 'notices' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              ئاگاداری و ڕێنماییە کارگێڕییەکان
            </h3>
          </div>

          <div className="space-y-3">
            {relevantNotices.map((notice) => (
              <div
                key={notice.id}
                className={`p-4 rounded-xl border ${
                  notice.priority === 'urgent'
                    ? 'bg-rose-50 border-rose-200'
                    : notice.priority === 'important'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        notice.priority === 'urgent'
                          ? 'bg-rose-600 text-white'
                          : notice.priority === 'important'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {notice.priority === 'urgent' ? t.urgencyUrgent : notice.priority === 'important' ? t.urgencyImportant : t.urgencyInfo}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {notice.titleKu}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {notice.createdAt}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {notice.contentKu}
                </p>
                <div className="mt-2 text-[11px] text-slate-500">
                  بڵاوکراوەتەوە لە لایەن: <span className="font-semibold text-slate-700">{notice.authorNameKu}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Supervisor Department Control */}
      {activeTab === 'supervisor' && currentNurse.isSupervisor && (
        <SupervisorDepartmentControl />
      )}

      {/* Modals */}
      <LogShiftModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        defaultDate={selectedLogDate}
      />

      {/* Change Credentials (ID & PIN) Modal */}
      {isCredsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    گۆڕینی ئایدی و وشەی نهێنی
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ڕێکخستنی زانیارییەکانی چوونەژوورەوەی تایبەت بە خۆت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCredsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCredentials} className="p-6 space-y-4 text-right">
              
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
                بەڕێز <strong>{currentNurse.fullNameKu}</strong>، لێرەدا دەتوانیت ئایدی و وشەی نهێنی (PIN) تایبەت بە خۆت بگۆڕیت. تێبینی: بەڕێوەبەری نەخۆشخانەش ئاگاداری گۆڕانکارییەکە دەبێت لە سیستەمدا.
              </div>

              {credsError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{credsError}</span>
                </div>
              )}

              {credsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{credsSuccess}</span>
                </div>
              )}

              {/* Nurse ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ئایدی نوێی پەرستار (Nurse ID)
                </label>
                <input
                  type="text"
                  value={newNurseId}
                  onChange={(e) => setNewNurseId(e.target.value)}
                  placeholder="وەک A002 یان هەر ئایدییەکی خوازراو"
                  required
                  className="w-full text-left px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono uppercase text-sm font-bold focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  dir="ltr"
                />
              </div>

              {/* New Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  وشەی نهێنی نوێ (PIN / Password)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={newNursePin}
                    onChange={(e) => setNewNursePin(e.target.value)}
                    placeholder="لانیکەم ٣ پیت یان ژمارە"
                    required
                    maxLength={16}
                    className="w-full text-left pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  دووبارەکردنەوەی وشەی نهێنی
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={confirmNursePin}
                  onChange={(e) => setConfirmNursePin(e.target.value)}
                  placeholder="دووبارە وشە نهێنییەکە بنووسەوە"
                  required
                  maxLength={16}
                  className="w-full text-left px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCredsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  پەشیمانبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  پاشەکەوتکردنی گۆڕانکاری
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Avatar / Profile Photo Modal */}
      {isAvatarModalOpen && (
        <AvatarPickerModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          currentAvatarUrl={currentNurse.avatarUrl}
          nurseName={currentNurse.fullNameKu}
          title="گۆڕینی وێنەی پرۆفایل"
          onSave={(newUrl) => {
            updateNurse(currentNurse.id, { avatarUrl: newUrl });
          }}
        />
      )}

    </div>
  );
};
