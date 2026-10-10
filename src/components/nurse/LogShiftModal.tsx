import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  AlertTriangle,
  Info,
  Lock
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { ShiftType } from '../../types';
import { DepartmentBadge } from '../common/Badges';
import { 
  getDepartmentSlots, 
  DepartmentSlot, 
  getDepartmentSlotsAvailability,
  SlotAvailability,
  getShiftTimeSlotGroup,
  shiftGroupNamesKu
} from '../../data/departmentSlots';
import { 
  checkDateLockStatus, 
  getMinimumAllowedDateForNurse 
} from '../../utils/dateLockUtils';

export const LogShiftModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultShiftType?: ShiftType;
  preSelectedNurseId?: string;
}> = ({ isOpen, onClose, defaultDate, defaultShiftType, preSelectedNurseId }) => {
  const { t, currentNurse, nurses, logShift, shifts, departments, getDepartment, validateQuota } = useHospital();

  const targetNurse = (preSelectedNurseId && nurses.find(n => n.id === preSelectedNurseId)) || currentNurse;
  const effectiveNurse = targetNurse || currentNurse;

  const todayStr = new Date().toISOString().split('T')[0];

  // Multi-department resolution for effective nurse with normalization of ghost IDs
  const nurseDeptIds = useMemo(() => {
    if (!effectiveNurse) return [];
    const rawIds = (effectiveNurse.departmentIds && effectiveNurse.departmentIds.length > 0)
      ? effectiveNurse.departmentIds
      : [effectiveNurse.departmentId];

    const normalized = rawIds
      .map(id => {
        const lower = (id || '').toLowerCase().trim();
        if (lower === 'dept-er' || lower === 'er') return 'dept-1';
        if (lower === 'dept-gen' || lower === 'gen') return 'dept-2';
        if (lower === 'dept-card' || lower === 'card') return 'dept-3';
        if (lower === 'dept-ped' || lower === 'ped') return 'dept-4';
        if (lower === 'dept-nicu' || lower === 'nicu') return 'dept-5';
        return id;
      })
      .filter((id, idx, arr) => {
        if (!id || id === 'admin') return false;
        if (arr.indexOf(id) !== idx) return false;
        return !!getDepartment(id);
      });

    return normalized.length > 0 ? normalized : [effectiveNurse.departmentId || 'dept-1'];
  }, [effectiveNurse, departments, getDepartment]);

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    nurseDeptIds[0] || (effectiveNurse?.departmentId || '')
  );
  
  const [date, setDate] = useState<string>(
    defaultDate && defaultDate <= todayStr ? defaultDate : todayStr
  );
  const [shiftType, setShiftType] = useState<ShiftType>(defaultShiftType || 'morning');
  const [selectedSlotName, setSelectedSlotName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('14:00');
  const [hours, setHours] = useState<number>(6);
  const [extraHours, setExtraHours] = useState<number>(0);
  const [patientBedRoom, setPatientBedRoom] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  // Sync selected date when modal opens or defaultDate changes
  useEffect(() => {
    if (isOpen) {
      const validDate = defaultDate && defaultDate <= todayStr ? defaultDate : todayStr;
      setDate(validDate);
      setError('');
      setSuccess(false);
    }
  }, [isOpen, defaultDate, todayStr]);

  // Sync selectedDeptId when currentNurse changes
  useEffect(() => {
    if (currentNurse) {
      const depts = (currentNurse.departmentIds && currentNurse.departmentIds.length > 0)
        ? currentNurse.departmentIds
        : [currentNurse.departmentId];
      if (!depts.includes(selectedDeptId)) {
        setSelectedDeptId(depts[0] || currentNurse.departmentId);
      }
    }
  }, [currentNurse]);

  const deptSlots = selectedDeptId ? getDepartmentSlots(selectedDeptId) : [];
  const slotAvailabilities: SlotAvailability[] = selectedDeptId && date
    ? getDepartmentSlotsAvailability(selectedDeptId, date, shifts)
    : [];

  // Update default times when shiftType or slot changes
  const applyShiftDefaults = (type: ShiftType, slot?: DepartmentSlot) => {
    setShiftType(type);
    if (slot) {
      setSelectedSlotName(slot.slotName);
      setStartTime(slot.defaultStartTime);
      setEndTime(slot.defaultEndTime);
      setHours(slot.hours);
    } else {
      setSelectedSlotName('');
      switch (type) {
        case 'morning':
          setStartTime('08:00');
          setEndTime('14:00');
          setHours(6);
          break;
        case 'evening':
          setStartTime('14:00');
          setEndTime('20:00');
          setHours(6);
          break;
        case 'night':
          setStartTime('20:00');
          setEndTime('08:00');
          setHours(12);
          break;
        case 'support_night':
          setStartTime('22:00');
          setEndTime('06:00');
          setHours(8);
          break;
        case 'support':
          setStartTime('08:00');
          setEndTime('14:00');
          setHours(6);
          break;
        case 'on_call':
          setStartTime('20:00');
          setEndTime('08:00');
          setHours(12);
          break;
        case 'full_day':
          setStartTime('08:00');
          setEndTime('08:00');
          setHours(24);
          break;
        default:
          setStartTime('08:00');
          setEndTime('14:00');
          setHours(6);
      }
    }
  };

  useEffect(() => {
    if (deptSlots.length > 0) {
      // Find first available slot for this date if possible
      const firstAvailable = slotAvailabilities.find(a => !a.isBooked)?.slot || deptSlots[0];
      if (firstAvailable) {
        applyShiftDefaults(firstAvailable.shiftCategory as ShiftType, firstAvailable);
      }
    }
  }, [selectedDeptId, date]);

  if (!isOpen || !currentNurse) return null;

  const currentActiveDept = getDepartment(selectedDeptId) || getDepartment(currentNurse.departmentId);

  // Check quota for currently selected category & slot
  const quotaCheck = validateQuota(selectedDeptId, date, shiftType, selectedSlotName || undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('تکایە بەرواری شیفت دیاریبکە');
      return;
    }

    // Check date lock rules (future dates & previous month cutoff at 8:00 AM on 1st of month)
    const lockStatus = checkDateLockStatus(date, new Date(), 'nurse');
    if (lockStatus.isLocked) {
      setError(lockStatus.message || 'ئەم بەروارە قوفڵکراوە و ناتوانیت شیفتی تێدا تۆمار بکەیت!');
      return;
    }

    if (!selectedDeptId) {
      setError('تکایە بەش دیاریبکە');
      return;
    }

    // Check if adjustment hours (extra or minus) has required explanation note
    if (Number(extraHours) !== 0 && (!notes || !notes.trim())) {
      const isNegative = Number(extraHours) < 0;
      setError(`تکایە نۆتێک بۆ بەرپرسەکەت بەجێبهێڵە و روونکردنەوە بدە لەسەر ${isNegative ? 'کەمکردنی کاتژمێر (سالب -)' : 'کاتژمێری زیادە (+)'}`);
      return;
    }

    // Check if this nurse already has a shift of the same time slot (e.g. Morning & Morning On-Call, Evening & Evening On-Call, Night & Night On-Call) on this date across ANY department
    const currentGroup = getShiftTimeSlotGroup({
      shiftType,
      slotName: selectedSlotName || undefined,
      startTime,
      endTime,
      hours: Number(hours),
    });

    const targetNurseId = effectiveNurse?.id || currentNurse.id;
    const existingSameShift = shifts.find(
      s => s.nurseId === targetNurseId && 
           s.date === date && 
           s.status !== 'rejected' && 
           getShiftTimeSlotGroup(s) === currentGroup
    );

    if (existingSameShift) {
      const existingDept = getDepartment(existingSameShift.departmentId);
      const groupLabel = shiftGroupNamesKu[currentGroup] || currentGroup;
      const existingSlot = existingSameShift.slotName ? ` [${existingSameShift.slotName}]` : '';
      setError(`ئاگاداری: پێشتر شیفتی ${groupLabel}${existingSlot} لە بەرواری (${date}) لە بەشی (${existingDept?.nameKu || 'بەشێکی نەخۆشخانە'}) تۆمارکراوە! ناتوانرێت لە هەمان ڕۆژدا دوو شیفتی هەمان کات (وەک بەیانی و بەیانی ئۆنکۆڵ، یان نایت و نایت ئۆنکۆڵ) تۆمار بکرێت.`);
      return;
    }

    // Enforce strict department quota check
    const quotaResult = validateQuota(selectedDeptId, date, shiftType, selectedSlotName || undefined);
    if (!quotaResult.allowed) {
      setError(quotaResult.errorMessage || 'ڕێژەی دیاریکراوی ئەم شیفتە لەم بەشەدا پڕکراوەتەوە و ناتوانیت پەرستاری زیاتر داخیڵ بکەیت!');
      return;
    }

    // If supervisor is logging for another nurse in their department, mark it as approved
    const isLoggedBySupervisor = currentNurse?.isSupervisor && effectiveNurse && effectiveNurse.id !== currentNurse.id;

    logShift({
      nurseId: effectiveNurse.id,
      nurseNameKu: effectiveNurse.fullNameKu,
      nurseNameEn: effectiveNurse.fullNameEn,
      departmentId: selectedDeptId,
      date,
      shiftType,
      slotName: selectedSlotName || undefined,
      startTime,
      endTime,
      hours: Number(hours),
      extraHours: Number(extraHours) || 0,
      loggedBy: isLoggedBySupervisor ? 'admin' : 'nurse',
      status: isLoggedBySupervisor ? 'approved' : undefined,
      patientBedRoom: patientBedRoom.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-teal-700 dark:bg-teal-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-800/80 dark:bg-teal-900/80 border border-teal-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">{t.logNewShift}</h3>
              <p className="text-xs text-teal-100 font-medium">
                تۆمارکردن بە ناوی: {effectiveNurse?.fullNameKu || effectiveNurse?.fullNameEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* Department Selection (Supports Nurses working across multiple departments) */}
          <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>بەشی داواکراو بۆ ئەم شیفتە:</span>
              </label>
              {nurseDeptIds.length > 1 && (
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  کاردەکات لە {nurseDeptIds.length} بەش
                </span>
              )}
            </div>

            {nurseDeptIds.length > 1 ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {nurseDeptIds.map(dId => {
                  const d = getDepartment(dId);
                  if (!d) return null;
                  const isSelected = selectedDeptId === dId;
                  return (
                    <button
                      key={dId}
                      type="button"
                      onClick={() => {
                        setSelectedDeptId(dId);
                        setSelectedSlotName('');
                      }}
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold ring-2 ring-teal-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-medium">{d.nameKu}</span>
                      <span className="text-[10px] font-mono opacity-70">({d.code})</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">بەشی فەرمی:</span>
                {currentActiveDept && <DepartmentBadge department={currentActiveDept} />}
              </div>
            )}
          </div>

          {/* Quota warning banner if not allowed */}
          {!quotaCheck.allowed && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-850 rounded-xl text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-950 dark:text-rose-100">ئاگاداری: ڕێژەی فەرمی پڕکراوەتەوە!</p>
                <p className="mt-0.5">{quotaCheck.errorMessage}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-850 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-850 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t.shiftLoggedSuccess} (چاوەڕوانی پەسەندکردنی سەرپەرشتیارە)</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.date}
              </label>
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <Lock className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                <span>قوفڵی ئۆتۆماتیکی (داهاتوو قوفڵە، مانگی پێشوو ٨ی بەیانی ١ی مانگ قوفڵ دەبێ)</span>
              </span>
            </div>
            <div className="relative">
              <input
                type="date"
                min={getMinimumAllowedDateForNurse()}
                max={todayStr}
                value={date}
                onChange={(e) => {
                  const val = e.target.value;
                  const lockCheck = checkDateLockStatus(val, new Date(), 'nurse');
                  if (lockCheck.isLocked) {
                    setError(lockCheck.message || 'ئەم بەروارە قوفڵکراوە!');
                    setDate(todayStr);
                  } else {
                    setError('');
                    setDate(val);
                  }
                }}
                required
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-sans focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>ڕۆژی نوێ خۆکارانە دەکرێتەوە. مانگی پێشوو لە ١ی مانگ لە کاتژمێر ٠٨:٠٠ی بەیانی قوفڵ دەبێت.</span>
            </p>
          </div>

          {/* Department Slots with Real-time Capacity and Status */}
          {deptSlots.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  جێگەکانی شیفت لەم بەشەدا (Slots & Capacity):
                </label>
                <span className="text-[11px] font-mono text-teal-700 dark:text-teal-300 font-bold">
                  {slotAvailabilities.filter(a => !a.isBooked).length} لە {slotAvailabilities.length} بەردەستە
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-slate-50/75 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                {slotAvailabilities.map(({ slot, isBooked, bookedByNurseName, bookedByNurseId }) => {
                  const isSelected = selectedSlotName === slot.slotName;
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      disabled={isBooked}
                      onClick={() => applyShiftDefaults(slot.shiftCategory as ShiftType, slot)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between text-xs cursor-pointer ${
                        isBooked
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 opacity-75 cursor-not-allowed'
                          : isSelected
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-100 font-bold ring-2 ring-teal-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-teal-50/40 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs truncate">{slot.slotName}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isBooked 
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' 
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {isBooked ? 'پڕکراوە' : `${slot.hours}h`}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          {slot.defaultStartTime}-{slot.defaultEndTime}
                        </span>
                        {isBooked && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold truncate max-w-[100px]">
                            {bookedByNurseName || bookedByNurseId}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shift Details (Read-only official hours summary) */}
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
              <Clock className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
              <span className="font-semibold">کاتی فەرمی شیفت:</span>
              <span className="font-mono font-bold">{startTime} - {endTime}</span>
            </div>
            <span className="bg-teal-700 dark:bg-teal-600 text-white font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
              {hours} کاتژمێر
            </span>
          </div>

          {/* Adjustment Hours */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            extraHours > 0 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-850 ring-2 ring-amber-400/20' 
              : extraHours < 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-850 ring-2 ring-rose-400/20'
              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">گۆڕانکاری کاتژمێر (ئۆڤەرتایم یان سالیب):</span>
                  {extraHours > 0 && (
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold px-1.5 py-0.5 rounded">
                      +{extraHours} کاتژمێری زیادە
                    </span>
                  )}
                  {extraHours < 0 && (
                    <span className="text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold px-1.5 py-0.5 rounded">
                      {extraHours} کاتژمێر (سالیب -)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  دەتوانی کاتژمێری زیادە (+) یان کەمکردنەوە/سالیب (-) دیاریبکەیت
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {/* Minus adjustment button */}
                <button
                  type="button"
                  onClick={() => setExtraHours(prev => Math.max(-12, Number((prev - 1).toFixed(1))))}
                  className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-300 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg transition-colors cursor-pointer"
                  title="کەمکردن (سالیب -)"
                >
                  -
                </button>

                <input
                  type="number"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={extraHours}
                  onChange={(e) => setExtraHours(Number(e.target.value))}
                  className={`w-18 p-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:ring-2 ${
                    extraHours > 0 
                      ? 'border-amber-400 text-amber-900 dark:text-amber-200 focus:ring-amber-500' 
                      : extraHours < 0
                      ? 'border-rose-400 text-rose-900 dark:text-rose-200 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-teal-500'
                  }`}
                />

                {/* Plus adjustment button */}
                <button
                  type="button"
                  onClick={() => setExtraHours(prev => Math.min(12, Number((prev + 1).toFixed(1))))}
                  className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:border-amber-300 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg transition-colors cursor-pointer"
                  title="زیادکردن (+)"
                >
                  +
                </button>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">h</span>
              </div>
            </div>
          </div>

          {/* Handover / Care Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{t.notes} (تێبینی دەوام یان ڕادەستکردن)</span>
              </span>
              {extraHours !== 0 && (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                  * پێویستە لەبەر {extraHours < 0 ? 'کەمکردنی کاتژمێر (سالیب -)' : 'کاتژمێری زیادە (+)'}
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                required={extraHours !== 0}
                placeholder={
                  extraHours > 0 
                    ? "تکایە لێرە روونکردنەوە بدە لەسەر هۆکاری کاتژمێری زیادە (Extra Hours) بۆ بەرپرسەکەت..."
                    : extraHours < 0
                    ? "تکایە لێرە روونکردنەوە بدە لەسەر هۆکاری کەمکردنی کاتژمێر (سالیب / Minus Hours) بۆ بەرپرسەکەت..."
                    : "کورتەیەک لە کارەکان یان حاڵەتە تایبەتەکان بۆ سەرپەرشتیار بنووسە..."
                }
                className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                  extraHours !== 0 && !notes.trim()
                    ? extraHours < 0 
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-amber-400 focus:ring-amber-500 bg-amber-50/20'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-teal-500'
                }`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={success || !quotaCheck.allowed}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.saveShift}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
