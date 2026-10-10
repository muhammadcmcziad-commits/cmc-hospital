import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  Building2, 
  X,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { Department, Nurse, ShiftRecord, ShiftType } from '../../types';
import { DepartmentBadge, ShiftTypeBadge } from '../common/Badges';
import { getShiftTimeSlotGroup, shiftGroupNamesKu } from '../../data/departmentSlots';

export const ShiftRosterCalendar: React.FC<{
  onOpenPrintModal: () => void;
}> = ({ onOpenPrintModal }) => {
  const { 
    t, 
    departments, 
    nurses, 
    shifts, 
    logShift, 
    deleteShift,
    getDepartment, 
    exportShiftsToCSV 
  } = useHospital();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDayShifts, setSelectedDayShifts] = useState<{ date: string; shifts: ShiftRecord[] } | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftRecord | null>(null);

  // Assign Form State
  const [selectedNurseId, setSelectedNurseId] = useState(nurses[0]?.id || '');
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignShiftType, setAssignShiftType] = useState<ShiftType>('morning');
  const [assignRoom, setAssignRoom] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignError, setAssignError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar calculations
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayIndex = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sun

  const daysCount = getDaysInMonth(calYear, calMonth);
  const startDayOffset = (getFirstDayIndex(calYear, calMonth) + 1) % 7; // Kurdish/Iraqi week starts on Saturday

  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  // Filtered shifts
  const visibleShifts = selectedDeptFilter === 'all'
    ? shifts.filter(s => s.status === 'approved')
    : shifts.filter(s => s.status === 'approved' && s.departmentId === selectedDeptFilter);

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');

    const nurse = nurses.find(n => n.id === selectedNurseId);
    if (!nurse) return;

    let hours = 6;
    let times = { start: '08:00', end: '14:00' };

    switch (assignShiftType) {
      case 'morning':
        hours = 6;
        times = { start: '08:00', end: '14:00' };
        break;
      case 'evening':
        hours = 6;
        times = { start: '14:00', end: '20:00' };
        break;
      case 'night':
        hours = 12;
        times = { start: '20:00', end: '08:00' };
        break;
      case 'support_night':
        hours = 8;
        times = { start: '22:00', end: '06:00' };
        break;
      case 'support':
        hours = 6;
        times = { start: '08:00', end: '14:00' };
        break;
      case 'on_call':
        hours = 12;
        times = { start: '20:00', end: '08:00' };
        break;
      case 'full_day':
        hours = 24;
        times = { start: '08:00', end: '08:00' };
        break;
    }

    // Check duplicate shift of the same time slot across all departments (e.g. morning & morning on-call, night & night on-call)
    const currentGroup = getShiftTimeSlotGroup({
      shiftType: assignShiftType,
      startTime: times.start,
      endTime: times.end,
      hours
    });

    const existingSameShift = shifts.find(
      s => s.nurseId === nurse.id && 
           s.date === assignDate && 
           s.status !== 'rejected' && 
           getShiftTimeSlotGroup(s) === currentGroup
    );

    if (existingSameShift) {
      const existingDept = getDepartment(existingSameShift.departmentId);
      const groupLabel = shiftGroupNamesKu[currentGroup] || currentGroup;
      setAssignError(`ئەم پەرستارە (${nurse.fullNameKu}) لە بەرواری (${assignDate}) پێشتر شیفتی ${groupLabel}ی لە بەشی (${existingDept?.nameKu || 'بەشێکی تر'}) بۆ تۆمارکراوە! ناتوانرێت دوو شیفتی هەمان کات (وەک بەیانی و بەیانی ئۆنکۆڵ یان نایت و نایت ئۆنکۆڵ) لە یەک ڕۆژدا تۆمار بکرێت.`);
      return;
    }

    const targetDeptId = assignDeptId || (selectedDeptFilter !== 'all' ? selectedDeptFilter : nurse.departmentId);

    logShift({
      nurseId: nurse.id,
      nurseNameKu: nurse.fullNameKu,
      nurseNameEn: nurse.fullNameEn,
      departmentId: targetDeptId,
      date: assignDate,
      shiftType: assignShiftType,
      startTime: times.start,
      endTime: times.end,
      hours,
      status: 'approved',
      loggedBy: 'admin',
      patientBedRoom: assignRoom.trim() || undefined,
      notes: assignNotes.trim() || 'تەرخانکراوە لەلایەن بەڕێوەبەر',
    });

    setIsAssignModalOpen(false);
    setAssignNotes('');
    setAssignDeptId('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-600" />
            <span>{t.shiftRoster}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            خشتەی مانگانەی سەرجەم بەشەکان، پشکنینی داپۆشینی دەوام و پەرستارانی لەسەر کار
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">هەموو بەشەکان</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.nameKu} ({d.code})
              </option>
            ))}
          </select>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={() => exportShiftsToCSV(selectedDeptFilter === 'all' ? undefined : selectedDeptFilter)}
            className="p-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="داگرتن لە Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">{t.exportCSV}</span>
          </button>

          {/* Print Roster */}
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="p-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="چاپکردنی خشتە"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">{t.printRoster}</span>
          </button>

          {/* Direct Assign Shift Button */}
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تەرخانکردنی شیفت</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation & Month Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        
        {/* Month header & switch */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              {calendarDate.toLocaleDateString(t === 'en' ? 'en-US' : 'ar-IQ', { month: 'long', year: 'numeric' })}
            </h3>
            {selectedDeptFilter !== 'all' && (
              <DepartmentBadge deptId={selectedDeptFilter} departments={departments} />
            )}
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
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 text-slate-700 cursor-pointer"
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

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <span className="font-bold text-slate-500">جۆری شیفتەکان:</span>
          <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> بەیانیان (08:00 - 15:00)
          </span>
          <span className="flex items-center gap-1 text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> ئێواران (15:00 - 22:00)
          </span>
          <span className="flex items-center gap-1 text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span> شەوان (22:00 - 08:00)
          </span>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500">
          <div>شەممە (Sat)</div>
          <div>یەکشەممە (Sun)</div>
          <div>دووشەممە (Mon)</div>
          <div>سێشەممە (Tue)</div>
          <div>چوارشەممە (Wed)</div>
          <div>پێنجشەممە (Thu)</div>
          <div>هەینی (Fri)</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Offset cells */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="min-h-28 bg-slate-50/40 rounded-xl border border-dashed border-slate-100"></div>
          ))}

          {/* Active Days */}
          {Array.from({ length: daysCount }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayShifts = visibleShifts.filter(s => s.date === dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                onClick={() => dayShifts.length > 0 && setSelectedDayShifts({ date: dateStr, shifts: dayShifts })}
                className={`min-h-28 p-2 rounded-xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-teal-50/40 border-teal-400 ring-2 ring-teal-400/20'
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                } ${dayShifts.length > 0 ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold font-mono ${isToday ? 'text-teal-800' : 'text-slate-700'}`}>
                    {dayNum}
                  </span>
                  {dayShifts.length > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                      {dayShifts.length}
                    </span>
                  )}
                </div>

                {/* Shift Pills */}
                <div className="space-y-1 overflow-y-auto max-h-20">
                  {dayShifts.slice(0, 3).map((sh) => (
                    <div
                      key={sh.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate flex items-center justify-between ${
                        sh.shiftType === 'morning'
                          ? 'bg-amber-100/90 text-amber-950'
                          : sh.shiftType === 'evening'
                          ? 'bg-blue-100/90 text-blue-950'
                          : 'bg-purple-100/90 text-purple-950'
                      }`}
                      title={`${sh.nurseNameKu} (${sh.nurseId}) - ${sh.shiftType}`}
                    >
                      <span className="truncate">{sh.nurseNameKu.split(' ')[0]}</span>
                      <span className="font-mono text-[9px] uppercase font-bold opacity-75">
                        {sh.shiftType === 'morning' ? 'بەیانی' : sh.shiftType === 'evening' ? 'ئێوارە' : 'شەو'}
                      </span>
                    </div>
                  ))}

                  {dayShifts.length > 3 && (
                    <div className="text-[10px] text-teal-700 font-bold text-center">
                      +{dayShifts.length - 3} پەرستاری تر
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 self-end pt-1">
                  {isToday ? <span className="font-bold text-teal-600">ئەمڕۆ</span> : ''}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Selected Day Details Modal */}
      {selectedDayShifts && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  خشتەی دەوامی ڕۆژی: <span className="font-mono text-teal-700">{selectedDayShifts.date}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  کۆی گشتی: {selectedDayShifts.shifts.length} پەرستار لەم بەروارەدا دەوامیان هەیە
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayShifts(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDayShifts.shifts.map((sh) => {
                const dept = getDepartment(sh.departmentId);
                const nurse = nurses.find(n => n.id === sh.nurseId);

                return (
                  <div key={sh.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={nurse?.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                        alt={sh.nurseNameKu}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sh.nurseNameKu}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                            {sh.nurseId}
                          </span>
                        </div>
                        <div className="mt-1">
                          <DepartmentBadge department={dept} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left font-mono">
                        <ShiftTypeBadge type={sh.shiftType} showTime />
                        {sh.patientBedRoom && (
                          <span className="block text-[11px] text-slate-500 font-sans mt-0.5">{sh.patientBedRoom}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShiftToDelete(sh)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                        title="سڕینەوەی ئەم شیفتە"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Admin Assign Shift Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                تەرخانکردنی ڕاستەوخۆی شیفت لەلایەن بەڕێوەبەر
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignShift} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  پەرستار دیاریبکە *
                </label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => {
                    setSelectedNurseId(e.target.value);
                    const n = nurses.find(nurse => nurse.id === e.target.value);
                    if (n) {
                      setAssignDeptId(n.departmentId);
                    }
                  }}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  {nurses.filter(n => !isSystemAdminNurse(n)).map((n) => {
                    const assignedDeptNames = (n.departmentIds || [n.departmentId])
                      .map(dId => getDepartment(dId)?.code || dId)
                      .join(', ');
                    return (
                      <option key={n.id} value={n.id}>
                        {n.fullNameKu} ({n.id}) - [{assignedDeptNames}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بەشی مەبەست بۆ ئەم شیفتە *
                </label>
                <select
                  value={assignDeptId || (selectedDeptFilter !== 'all' ? selectedDeptFilter : (nurses.find(n => n.id === selectedNurseId)?.departmentId || departments[0]?.id || ''))}
                  onChange={(e) => setAssignDeptId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  {departments.map((d) => {
                    const currentNurse = nurses.find(n => n.id === selectedNurseId);
                    const isAssigned = currentNurse ? (currentNurse.departmentId === d.id || (Array.isArray(currentNurse.departmentIds) && currentNurse.departmentIds.includes(d.id))) : false;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.nameKu} ({d.code}) {isAssigned ? '✓ بەشی پەرستارە' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    بەروار *
                  </label>
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    جۆری شیفت *
                  </label>
                  <select
                    value={assignShiftType}
                    onChange={(e) => setAssignShiftType(e.target.value as ShiftType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="morning">بەیانیان - Morning (08:00 - 14:00 | 6h)</option>
                    <option value="evening">ئێواران - Evening (14:00 - 20:00 | 6h)</option>
                    <option value="night">شەوان - Night (20:00 - 08:00 | 12h)</option>
                    <option value="support_night">شەوی پشتیوانی - Spport Night (22:00 - 06:00 | 8h)</option>
                    <option value="support">پشتیوانی - Support (6h)</option>
                    <option value="on_call">ئۆنکۆڵ - OnCall (6h / 12h)</option>
                    <option value="full_day">٢٤ کاتژمێری - Full Day (24h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ژوور / قەرەوێڵە
                </label>
                <input
                  type="text"
                  value={assignRoom}
                  onChange={(e) => setAssignRoom(e.target.value)}
                  placeholder="نموونە: هۆڵی نەشتەرگەری ١، یان ژووری ٣٠٢"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تێبینی یان فەرمانی کارگێڕی
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={2}
                  placeholder="ڕێنمایی بۆ پەرستار..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تۆمارکردنی شیفتەکە</span>
                </button>
              </div>
            </form>
          </div>
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
              دڵنیایت لە سڕینەوەی ئەم شیفتە؟
            </h3>
            <p className="text-center text-xs text-slate-600 mb-6 leading-relaxed">
              سڕینەوەی یەکجارەکی شیفتی بەرواری <span className="font-mono font-bold text-slate-900">{shiftToDelete.date}</span> بۆ پەرستار <strong className="text-slate-900">{shiftToDelete.nurseNameKu}</strong> ({shiftToDelete.shiftType}).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteShift(shiftToDelete.id);
                  if (selectedDayShifts) {
                    setSelectedDayShifts(prev => prev ? {
                      ...prev,
                      shifts: prev.shifts.filter(s => s.id !== shiftToDelete.id)
                    } : null);
                  }
                  setShiftToDelete(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer transition-all"
              >
                بەڵێ، شیفتەکە بسڕەوە
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
