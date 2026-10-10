import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  Award,
  Plus, 
  ArrowUpRight, 
  Activity, 
  Bed, 
  AlertCircle,
  FileSpreadsheet,
  Printer,
  RefreshCw
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { DepartmentBadge, ShiftTypeBadge, StatusBadge } from '../common/Badges';
import { DepartmentManager } from './DepartmentManager';
import { NurseManager } from './NurseManager';
import { ShiftRosterCalendar } from './ShiftRosterCalendar';
import { ShiftApprovalsView } from './ShiftApprovalsView';
import { AnalyticsReports } from './AnalyticsReports';
import { AnnouncementsManager } from './AnnouncementsManager';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { DepartmentWeeklyShiftChart } from './DepartmentWeeklyShiftChart';
import { 
  getSavedGoogleSyncState, 
  saveGoogleSyncState 
} from '../../services/googleDriveService';
import { 
  extractSpreadsheetId, 
  fetchSpreadsheetData, 
  parseHospitalSpreadsheet 
} from '../../services/googleSheetsService';

export const AdminDashboard: React.FC<{
  onOpenPrintModal: () => void;
}> = ({ onOpenPrintModal }) => {
  const { 
    t, 
    departments, 
    nurses, 
    shifts, 
    notices, 
    getDepartment, 
    updateShiftStatus,
    bulkImportData,
    getDepartmentHeadNurseDisplay
  } = useHospital();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'departments' | 'nurses' | 'roster' | 'approvals' | 'reports' | 'announcements'
  >('overview');

  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [quickSyncToast, setQuickSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleQuickSyncFromSheets = async () => {
    const syncState = getSavedGoogleSyncState();
    const targetSpreadsheetId = syncState.spreadsheetId || extractSpreadsheetId(syncState.spreadsheetUrl || '');
    const targetToken = syncState.accessToken;

    if (!targetSpreadsheetId || !targetToken) {
      setIsSheetsModalOpen(true);
      return;
    }

    setIsQuickSyncing(true);
    setQuickSyncToast(null);

    try {
      const result = await fetchSpreadsheetData(targetSpreadsheetId, targetToken);
      const parsed = parseHospitalSpreadsheet(result.sheets, departments, nurses);

      bulkImportData({
        departments: parsed.departments,
        nurses: parsed.nurses,
        shifts: parsed.shifts,
      });

      const syncTime = new Date().toLocaleTimeString('ckb', { hour: '2-digit', minute: '2-digit' });
      saveGoogleSyncState({ ...syncState, lastSyncedAt: syncTime });

      setQuickSyncToast({
        message: `داتاکان لە Google Sheets نوێکرانەوە (${parsed.nurses.length} پەرستار، ${parsed.shifts.length} شیفت).`,
        type: 'success'
      });
      setTimeout(() => setQuickSyncToast(null), 5000);
    } catch (err: any) {
      console.error('Quick sync error:', err);
      setQuickSyncToast({
        message: 'پێویستە مۆڵەتی Google Drive نوێ بکەیتەوە. تکایە پەنجەرەکە بکەرەوە.',
        type: 'error'
      });
      setTimeout(() => setQuickSyncToast(null), 6000);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Key metrics
  const pendingApprovalsCount = shifts.filter(s => s.status === 'pending').length;
  const todayApprovedShifts = shifts.filter(s => s.date === todayStr && s.status === 'approved');
  const activeNursesCount = nurses.filter(n => n.status === 'active').length;

  const totalBedCapacity = departments.reduce((acc, curr) => acc + curr.bedCapacity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/15">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            <span>لوحەی کۆنترۆڵی سەرپەرشتیاری گشتی (Master Admin)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            کۆنترۆڵی تەواوی بەشەکان، پەرستاران و خشتەی شیفتەکان
          </h2>
          <p className="text-xs sm:text-sm text-purple-100/80 max-w-2xl leading-relaxed">
            لێرەوە دەتوانیت سەرجەم بەشەکان جیا بکەیتەوە، پەرستاری نوێ زیاد بکەیت، ئایدی و PIN بدەیتێ، و سەرپەرشتی تەواوی شیفتە تۆمارکراوەکان بکەیت.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleQuickSyncFromSheets}
            disabled={isQuickSyncing}
            className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40 shadow-sm disabled:opacity-50"
            title="نوێکردنەوەی ڕاستەوخۆی داتاکان لە ناو فایلی Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isQuickSyncing ? 'animate-spin' : ''}`} />
            <span>{isQuickSyncing ? 'هێنانەوەی داتا...' : 'نوێکردنەوە لە شیت (Sync)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Drive & Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>پەسەندکردنەکان ({pendingApprovalsCount})</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپکردنی خشتە</span>
          </button>
        </div>
      </div>

      {/* Quick Sync Notification Toast */}
      {quickSyncToast && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          quickSyncToast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100' 
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100'
        }`}>
          <div className="flex items-center gap-2">
            {quickSyncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{quickSyncToast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setQuickSyncToast(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-normal underline cursor-pointer"
          >
            داخستن
          </button>
        </div>
      )}

      {/* Main Admin Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>کورتەی سیستەم</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'departments'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t.departments}</span>
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">{departments.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nurses')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'nurses'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.nurses}</span>
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">{nurses.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'roster'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t.shiftRoster}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'approvals'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t.shiftApprovals}</span>
          {pendingApprovalsCount > 0 && (
            <span className="font-mono text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t.reports}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t.announcements}</span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* KPI metric tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div 
              onClick={() => setActiveTab('nurses')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{t.totalNurses}</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">{activeNursesCount}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>بە ئایدی و PINی چالاک</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('departments')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{t.activeDepartments}</span>
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">{departments.length}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>کۆی {totalBedCapacity} قەرەوێڵە</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('roster')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{t.todayOnDuty}</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">{todayApprovedShifts.length}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>لە تەواوی بەشەکان ئەمڕۆ</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('approvals')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{t.pendingApprovals}</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className={`text-3xl font-black font-mono ${pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {pendingApprovalsCount}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>داواکاری شیفتەکان</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </p>
            </div>

          </div>

          {/* Recharts Department Weekly Shift Distribution */}
          <DepartmentWeeklyShiftChart />

          {/* Realtime Department Status Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>دۆخی ڕاستەوخۆی بەشەکانی نەخۆشخانە (دەوامی ئەمڕۆ)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  سەرجەم بەشە جیاکراوەکان و ژمارەی پەرستارانی لەسەر کار لە هەر بەشێکدا
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('departments')}
                className="text-xs font-bold text-teal-700 hover:underline"
              >
                بەڕێوەبردنی بەشەکان &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {departments.map((dept) => {
                const onDutyInDept = todayApprovedShifts.filter(s => s.departmentId === dept.id);
                const totalInDept = nurses.filter(
                  n => !isSystemAdminNurse(n) && (n.departmentId === dept.id || (Array.isArray(n.departmentIds) && n.departmentIds.includes(dept.id)))
                ).length;

                return (
                  <div
                    key={dept.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <DepartmentBadge department={dept} size="sm" />
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {dept.floor}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-xs font-bold text-slate-600">پەرستاران لە دەوام:</span>
                        <span className="text-base font-extrabold font-mono text-teal-700">
                          {onDutyInDept.length} / {totalInDept}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between gap-1 text-slate-600">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>هێد نێرس:</span>
                        </span>
                        <span className="font-bold text-indigo-950 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
                          Mohammed Ziad Mohammed
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-slate-600">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>تیم لیدەر:</span>
                        </span>
                        <span className="font-bold text-slate-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[130px] text-[10px]" title={getDepartmentHeadNurseDisplay(dept)}>
                          {getDepartmentHeadNurseDisplay(dept)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Shifts Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>دوایین شیفتە تۆمارکراوەکانی پەرستاران</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                بینینی خشتەی گشتی &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {shifts.slice(0, 5).map((s) => {
                const dept = getDepartment(s.departmentId);

                return (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">{s.date}</span>
                      <span className="font-bold text-slate-800">{s.nurseNameKu}</span>
                      <span className="font-mono text-slate-400">({s.nurseId})</span>
                      <DepartmentBadge department={dept} size="sm" />
                    </div>

                    <div className="flex items-center gap-3">
                      <ShiftTypeBadge type={s.shiftType} />
                      <StatusBadge status={s.status} />
                      {s.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateShiftStatus(s.id, 'approved', 'پەسەندکراو لەلایەن بەڕێوەبەر')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          پەسەندکردن
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Departments */}
      {activeTab === 'departments' && <DepartmentManager />}

      {/* Tab: Nurses */}
      {activeTab === 'nurses' && <NurseManager />}

      {/* Tab: Roster */}
      {activeTab === 'roster' && <ShiftRosterCalendar onOpenPrintModal={onOpenPrintModal} />}

      {/* Tab: Approvals */}
      {activeTab === 'approvals' && <ShiftApprovalsView />}

      {/* Tab: Reports */}
      {activeTab === 'reports' && <AnalyticsReports />}

      {/* Tab: Announcements */}
      {activeTab === 'announcements' && <AnnouncementsManager />}

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

    </div>
  );
};
