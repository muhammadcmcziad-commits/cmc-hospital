import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Building2, 
  Bed, 
  MessageSquare, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  Trash2,
  Undo2,
  Search,
  AlertCircle,
  RotateCcw,
  Archive,
  History
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { ShiftRecord } from '../../types';
import { DepartmentBadge, ShiftTypeBadge } from '../common/Badges';

export const ShiftApprovalsView: React.FC = () => {
  const { 
    t, 
    shifts, 
    deletedShifts,
    departments, 
    nurses, 
    updateShiftStatus, 
    deleteShift,
    restoreShift,
    permanentlyDeleteShift,
    emptyDeletedShifts,
    getDepartment 
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'deleted' | 'all'>('pending');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState<Record<string, string>>({});
  const [shiftToDelete, setShiftToDelete] = useState<ShiftRecord | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');

  // Counts
  const pendingCount = shifts.filter(s => s.status === 'pending').length;
  const approvedCount = shifts.filter(s => s.status === 'approved').length;
  const rejectedCount = shifts.filter(s => s.status === 'rejected').length;
  const deletedCount = deletedShifts.length;
  const allCount = shifts.length;

  // Filtered by tab
  const tabShifts = activeTab === 'deleted'
    ? deletedShifts
    : shifts.filter(s => {
        if (activeTab === 'all') return true;
        return s.status === activeTab;
      });

  // Filtered by department and search query
  const filteredShifts = tabShifts.filter(s => {
    const matchesDept = selectedDeptFilter === 'all' || s.departmentId === selectedDeptFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || 
      s.nurseNameKu.toLowerCase().includes(query) ||
      s.nurseId.toLowerCase().includes(query) ||
      s.date.includes(query) ||
      (s.patientBedRoom && s.patientBedRoom.toLowerCase().includes(query));
    return matchesDept && matchesQuery;
  });

  const handleApproveAllPending = () => {
    const pendingInFilter = filteredShifts.filter(s => s.status === 'pending');
    if (pendingInFilter.length === 0) return;
    pendingInFilter.forEach(s => {
      updateShiftStatus(s.id, 'approved', 'پەسەندکراوی بەکۆمەڵ لەلایەن بەڕێوەبەر');
    });
  };

  const handleApprove = (shiftId: string) => {
    const note = supervisorNotes[shiftId] || 'پەسەندکرا لەلایەن بەڕێوەبەر';
    updateShiftStatus(shiftId, 'approved', note);
  };

  const handleReject = (shiftId: string) => {
    const note = supervisorNotes[shiftId] || 'ڕەتکرایەوە لەلایەن بەڕێوەبەر';
    updateShiftStatus(shiftId, 'rejected', note);
  };

  const handleUndoToPending = (shiftId: string) => {
    updateShiftStatus(shiftId, 'pending', 'گەڕێندرایەوە بۆ دۆخی چاوەڕوانکراو');
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>بەڕێوەبردنی شیفتەکان و پەسەندکردن</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              پەسەندکردن، ڕەتکردنەوە، یان سڕینەوەی شیفتەکان (چاوەڕوانکراو و پەسەندکراو)
            </p>
          </div>

          {activeTab === 'pending' && filteredShifts.filter(s => s.status === 'pending').length > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>پەسەندکردنی هەموو چاوەڕوانکراوەکان ({filteredShifts.filter(s => s.status === 'pending').length})</span>
            </button>
          )}

          {activeTab === 'deleted' && filteredShifts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`ئایا دڵنیایت لە گەڕاندنەوەی هەموو (${filteredShifts.length}) شیفتە سڕاوەکان بۆ دۆخی پەسەندکراو؟`)) {
                    filteredShifts.forEach(s => restoreShift(s.id, 'approved'));
                  }
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>گەڕاندنەوەی هەمووی ({filteredShifts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('ئایا دڵنیایت لە بەتاڵکردنەوەی تەواوەتی سەبەتەی سڕاوەکان؟ چیتر ئەم شیفتانە ناگەڕێنەوە.')) {
                    emptyDeletedShifts();
                  }
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>بەتاڵکردنەوەی سەبەتە</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>چاوەڕوانکراو</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>پەسەندکراوەکان</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>ڕەتکراوەکان</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {rejectedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deleted')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'deleted'
                ? 'bg-rose-800 text-white shadow-md shadow-rose-800/25 ring-2 ring-rose-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>ڕەشکراوەکان (سڕاوەکان)</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'deleted' ? 'bg-rose-950 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {deletedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>هەمووی</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {allCount}
            </span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="گەڕان بەپێی ناوی پەرستار، ئایدی، بەروار یان ژوور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            >
              <option value="all">هەموو بەشەکان ({tabShifts.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nameKu} ({tabShifts.filter(s => s.departmentId === d.id).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shifts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredShifts.map((shift) => {
          const dept = getDepartment(shift.departmentId);
          const nurse = nurses.find(n => n.id === shift.nurseId);
          const netHours = (Number(shift.hours) || 0) + (Number(shift.extraHours) || 0);

          return (
            <div
              key={shift.id}
              className={`bg-white rounded-2xl border-2 p-5 shadow-xs flex flex-col justify-between transition-all ${
                activeTab === 'deleted'
                  ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                  : shift.status === 'pending'
                  ? 'border-amber-200/80 hover:border-amber-300'
                  : shift.status === 'approved'
                  ? 'border-emerald-200/80 hover:border-emerald-300'
                  : 'border-rose-200/80 hover:border-rose-300'
              }`}
            >
              <div>
                {/* Header: Nurse & Dept */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={nurse?.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                      alt={shift.nurseNameKu}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {shift.nurseNameKu}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          {shift.nurseId}
                        </span>
                        <DepartmentBadge department={dept} size="sm" />
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                    activeTab === 'deleted'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : shift.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : shift.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {activeTab === 'deleted'
                      ? 'ڕەشکراوە (سڕاوە)'
                      : shift.status === 'approved'
                      ? 'پەسەندکراو'
                      : shift.status === 'pending'
                      ? 'چاوەڕوانکراو'
                      : 'ڕەتکراوە'}
                  </span>
                </div>

                {/* Shift Details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mb-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>بەروار:</span>
                      <span className="font-mono text-slate-900">{shift.date}</span>
                      {shift.createdAt && (
                        <span className="text-[11px] font-normal text-slate-500 font-sans mr-2">
                          (تایمی داخیلکردن: <span className="font-mono text-slate-700">{new Date(shift.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>)
                        </span>
                      )}
                    </div>
                    <ShiftTypeBadge type={shift.shiftType} slotName={shift.slotName} />
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                    <span className="font-mono">{shift.startTime} تا {shift.endTime}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-slate-900">
                        {netHours} کاتژمێر
                      </span>
                      {shift.extraHours ? (
                        shift.extraHours > 0 ? (
                          <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            (+{shift.extraHours}h زیادە، بنیات: {shift.hours}h)
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            ({shift.extraHours}h کەمکردن، بنیات: {shift.hours}h)
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>

                  {shift.patientBedRoom && (
                    <div className="flex items-center gap-1 text-slate-700 pt-1 border-t border-slate-200/60">
                      <Bed className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">شوێن: {shift.patientBedRoom}</span>
                    </div>
                  )}

                  {shift.notes && (
                    <div className="pt-1 text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-0.5">تێبینی پەرستار:</span>
                      <p className="text-[11px] leading-relaxed">{shift.notes}</p>
                    </div>
                  )}

                  {shift.supervisorNotes && (
                    <div className="pt-1 text-teal-800 bg-teal-50/70 p-2 rounded-lg border border-teal-200">
                      <span className="font-bold text-teal-900 block text-[11px] mb-0.5">تێبینی سەرپەرشتیار / بەڕێوەبەر:</span>
                      <p className="text-[11px] leading-relaxed">{shift.supervisorNotes}</p>
                    </div>
                  )}
                </div>

                {/* Archive / Deleted details box */}
                {(activeTab === 'deleted' || shift.deletedAt) && (
                  <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center justify-between text-rose-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>ڕەشکراوەتەوە لەلایەن:</span>
                      </span>
                      <span className="font-semibold text-rose-950 bg-rose-100 px-2 py-0.5 rounded">
                        {shift.deletedBy || 'سیستەم / بەڕێوەبەر'}
                      </span>
                    </div>
                    {shift.deletedAt && (
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span>کاتی سڕینەوە:</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {new Date(shift.deletedAt).toLocaleDateString('ku-IQ')} - {new Date(shift.deletedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    )}
                    {shift.deletedReason && (
                      <div className="text-[11px] text-rose-800 bg-white/90 p-2 rounded-lg border border-rose-200 mt-1">
                        <span className="font-bold block mb-0.5">هۆکاری سڕینەوە:</span>
                        <p>{shift.deletedReason}</p>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-rose-200/60 flex items-center justify-between">
                      <span>دۆخی شیفت پێش سڕینەوە:</span>
                      <span className="font-bold text-slate-800">
                        {shift.status === 'approved' ? 'پەسەندکراو بووە' : shift.status === 'pending' ? 'چاوەڕوانکراو بووە' : 'ڕەتکراوە بووە'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Supervisor Feedback Input for pending */}
                {shift.status === 'pending' && activeTab !== 'deleted' && (
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="تێبینی سەرپەرشتیار (ئارەزوومەندانە)..."
                      value={supervisorNotes[shift.id] || ''}
                      onChange={(e) =>
                        setSupervisorNotes({ ...supervisorNotes, [shift.id]: e.target.value })
                      }
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {activeTab === 'deleted' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('ئایا دڵنیایت لە سڕینەوەی یەکجارەکی؟ ئەم شیفتە بە تەواوی لە سیستەم نامێنێت.')) {
                          permanentlyDeleteShift(shift.id);
                        }
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="سڕینەوەی یەکجارەکی لە سەبەتەی سڕاوەکان"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>سڕینەوەی یەکجارەکی</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => restoreShift(shift.id, 'pending')}
                        className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="گەڕاندنەوە بۆ دۆخی چاوەڕوانکراو"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>گەڕاندنەوە بۆ چاوەڕوانکراو</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => restoreShift(shift.id, 'approved')}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="گەڕاندنەوەی یەکسەر بۆ دۆخی پەسەندکراو"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>گەڕاندنەوە بۆ پەسەندکراو</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShiftToDelete(shift);
                        setDeleteReasonInput('');
                      }}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="سڕینەوە / ڕەشکردنەوەی ئەم شیفتە"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>سڕینەوەی شیفت</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {shift.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReject(shift.id)}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-rose-500" />
                            <span>{t.reject}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(shift.id)}
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t.approve}</span>
                          </button>
                        </>
                      )}

                      {shift.status === 'approved' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUndoToPending(shift.id)}
                            className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="گەڕاندنەوە بۆ دۆخی چاوەڕوانکراو"
                          >
                            <Undo2 className="w-4 h-4 text-amber-600" />
                            <span>گەڕاندنەوە بۆ چاوەڕوانکراو</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(shift.id)}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="ڕەتکردنەوەی ئەم شیفتە"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>ڕەتکردنەوە</span>
                          </button>
                        </>
                      )}

                      {shift.status === 'rejected' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUndoToPending(shift.id)}
                            className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="گەڕاندنەوە بۆ دۆخی چاوەڕوانکراو"
                          >
                            <Undo2 className="w-4 h-4 text-amber-600" />
                            <span>گەڕاندنەوە بۆ چاوەڕوانکراو</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(shift.id)}
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>پەسەندکردن</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {filteredShifts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            {activeTab === 'deleted' ? (
              <Trash2 className="w-6 h-6 text-slate-400" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">
            {activeTab === 'deleted' 
              ? 'هیچ شیفتێکی ڕەشکراو (سڕاوە) بوونی نییە'
              : activeTab === 'rejected'
              ? 'هیچ شیفتێکی ڕەتکراوە نییە'
              : 'هیچ شیفتێک نەدۆزرایەوە'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {activeTab === 'deleted'
              ? 'سەبەتەی شیفتە سڕاوەکان بەتاڵە. کاتێک هەر شیفتێک ڕەشدەکرێتەوە، دەچێتە ئێرە تاوەکو بتوانیت بیگەڕێنیتەوە.'
              : activeTab === 'rejected'
              ? 'لەم کاتەدا هیچ شیفتێکی ڕەتکراوە لەم فلتەرەدا نییە. (تێبینی: ئەگەر شیفتەکەت ڕەشکردووەتەوە، لە تابی «ڕەشکراوەکان» دەیبینیت و دەتوانیت بیگەڕێنیتەوە).'
              : 'لە ژێر ئەم بەشە و فلتەرەدا لەم کاتەدا هیچ شیفتێک بوونی نییە.'}
          </p>
        </div>
      )}

      {/* Delete Shift In-App Confirmation Modal */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-black text-base text-slate-900 mb-2">
              دڵنیایت لە ڕەشکردنەوەی (سڕینەوەی) ئەم شیفتە؟
            </h3>
            <p className="text-center text-xs text-slate-600 mb-4 leading-relaxed">
              شیفتی بەرواری{' '}
              <span className="font-mono font-bold text-slate-900">{shiftToDelete.date}</span>{' '}
              بۆ پەرستار <strong className="text-slate-900">{shiftToDelete.nurseNameKu}</strong>{' '}
              (جۆری شیفت: {shiftToDelete.shiftType} - دۆخ: {shiftToDelete.status === 'approved' ? 'پەسەندکراو' : shiftToDelete.status === 'pending' ? 'چاوەڕوانکراو' : 'ڕەتکراوە'}) دەگوازرێتەوە بۆ بەشی «ڕەشکراوەکان».
            </p>

            <div className="mb-5 text-right">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                هۆکاری سڕینەوە (ئارەزوومەندانە):
              </label>
              <input
                type="text"
                value={deleteReasonInput}
                onChange={(e) => setDeleteReasonInput(e.target.value)}
                placeholder="بۆ نموونە: گۆڕینی خشتە، ڕەتکردنەوە بە هەڵە، مۆڵەت..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                دەتوانیت هەرکاتێک بتەوێت لە تابی «ڕەشکراوەکان» ئەم شیفتە بگێڕیتەوە.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShiftToDelete(null);
                  setDeleteReasonInput('');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteShift(shiftToDelete.id, deleteReasonInput.trim() || 'سڕایەوە لەلایەن بەڕێوەبەر');
                  setShiftToDelete(null);
                  setDeleteReasonInput('');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer transition-all"
              >
                بەڵێ، شیفتەکە ڕەش بکەرەوە
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
