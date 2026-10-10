import { ShiftRecord, ShiftType } from '../types';

export interface DepartmentSlot {
  slotId: number;
  departmentName: 'Emergency' | 'General Floor' | 'Cardiac Floor' | 'Pediatric Floor' | 'NICU';
  departmentId: string;
  slotName: string;
  hours: number;
  shiftCategory: ShiftType;
  defaultStartTime: string;
  defaultEndTime: string;
}

export const OFFICIAL_HOSPITAL_SLOTS: DepartmentSlot[] = [
  // 1. Emergency (DepartmentID: 1 / dept-1) - Total slots: 8 (Morning: 2, Evening: 2, Night: 2, Support: 1, Spport Night: 1)
  { slotId: 1, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Morning1', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 2, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Morning2', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 3, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Evening1', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 4, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Evening2', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 5, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Night1', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 6, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Night2', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 7, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Support', hours: 6, shiftCategory: 'support', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 8, departmentName: 'Emergency', departmentId: 'dept-1', slotName: 'Spport Night', hours: 8, shiftCategory: 'support_night', defaultStartTime: '22:00', defaultEndTime: '06:00' },

  // 2. General Floor (DepartmentID: 2 / dept-2) - Total slots: 20 (Morning: 5, Evening: 5, Night: 4, OnCall: 6)
  { slotId: 14, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning1', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 15, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning2', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 16, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning3', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 17, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning4', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 18, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning5', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 19, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening1', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 20, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening2', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 21, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening3', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 22, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening4', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 23, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening5', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 24, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night1', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 25, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night2', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 26, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night3', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 27, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night4', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 28, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning Oncall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 29, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Morning Oncall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 30, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening OnCall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 31, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Evening OnCall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 32, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night OnCall1', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 33, departmentName: 'General Floor', departmentId: 'dept-2', slotName: 'Night OnCall2', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },

  // 3. Cardiac Floor (DepartmentID: 3 / dept-3) - Total slots: 9 (Morning: 1, Evening: 1, Night: 1, OnCall: 6)
  { slotId: 39, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Morning', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 40, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Evening', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 41, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Night', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 42, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Morning Oncall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 43, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Morning Oncall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 44, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Evening OnCall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 45, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Evening OnCall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 46, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Night OnCall1', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 47, departmentName: 'Cardiac Floor', departmentId: 'dept-3', slotName: 'Night OnCall2', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },

  // 4. Pediatric Floor (DepartmentID: 4 / dept-4) - Total slots: 12 (Morning: 2, Evening: 2, Night: 2, OnCall: 6)
  { slotId: 53, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Morning1', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 54, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Morning2', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 55, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Evening1', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 56, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Evening2', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 57, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Night1', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 58, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Night2', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 59, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Morning Oncall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 60, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Morning Oncall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 61, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Evening OnCall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 62, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Evening OnCall2', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 63, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Night OnCall1', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 64, departmentName: 'Pediatric Floor', departmentId: 'dept-4', slotName: 'Night OnCall2', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },

  // 5. NICU (DepartmentID: 5 / dept-5) - Total slots: 6 (Morning: 1, Evening: 1, Night: 1, OnCall: 3)
  { slotId: 70, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Morning', hours: 6, shiftCategory: 'morning', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 71, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Evening', hours: 6, shiftCategory: 'evening', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 72, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Night', hours: 12, shiftCategory: 'night', defaultStartTime: '20:00', defaultEndTime: '08:00' },
  { slotId: 73, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Morning Oncall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '08:00', defaultEndTime: '14:00' },
  { slotId: 75, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Evening OnCall1', hours: 6, shiftCategory: 'on_call', defaultStartTime: '14:00', defaultEndTime: '20:00' },
  { slotId: 77, departmentName: 'NICU', departmentId: 'dept-5', slotName: 'Night OnCall1', hours: 12, shiftCategory: 'on_call', defaultStartTime: '20:00', defaultEndTime: '08:00' },
];

export function getDepartmentSlots(deptId: string): DepartmentSlot[] {
  return OFFICIAL_HOSPITAL_SLOTS.filter(s => s.departmentId === deptId);
}

export function findSlotByName(deptId: string, slotName: string): DepartmentSlot | undefined {
  return OFFICIAL_HOSPITAL_SLOTS.find(
    s => s.departmentId === deptId && s.slotName.toLowerCase() === slotName.toLowerCase().trim()
  );
}

export interface SlotAvailability {
  slot: DepartmentSlot;
  isBooked: boolean;
  bookedByNurseId?: string;
  bookedByNurseName?: string;
  shiftRecordId?: string;
}

export function getDepartmentSlotsAvailability(
  deptId: string,
  date: string,
  existingShifts: ShiftRecord[],
  excludeShiftId?: string
): SlotAvailability[] {
  const deptSlots = getDepartmentSlots(deptId);
  const activeShiftsOnDate = existingShifts.filter(
    s => s.departmentId === deptId && 
         s.date === date && 
         s.status !== 'rejected' && 
         (!excludeShiftId || s.id !== excludeShiftId)
  );

  return deptSlots.map(slot => {
    // 1. Direct slot match
    let matchedShift = activeShiftsOnDate.find(
      s => s.slotName && s.slotName.toLowerCase() === slot.slotName.toLowerCase()
    );

    // 2. If no direct slot match, check if a shift with the same shiftType occupied this slot position
    if (!matchedShift) {
      const sameCategorySlots = deptSlots.filter(s => s.shiftCategory === slot.shiftCategory);
      const slotIndex = sameCategorySlots.findIndex(s => s.slotId === slot.slotId);
      const unassignedCategoryShifts = activeShiftsOnDate.filter(
        s => !s.slotName && s.shiftType === slot.shiftCategory
      );
      if (unassignedCategoryShifts[slotIndex]) {
        matchedShift = unassignedCategoryShifts[slotIndex];
      }
    }

    return {
      slot,
      isBooked: !!matchedShift,
      bookedByNurseId: matchedShift?.nurseId,
      bookedByNurseName: matchedShift ? (matchedShift.nurseNameEn || matchedShift.nurseNameKu) : undefined,
      shiftRecordId: matchedShift?.id,
    };
  });
}

export interface DepartmentQuotaCheck {
  allowed: boolean;
  errorMessage?: string;
  totalSlotsForCategory: number;
  bookedCountForCategory: number;
  availableSlotNames: string[];
}

export function validateDepartmentShiftQuota(
  deptId: string,
  date: string,
  shiftType: ShiftType,
  requestedSlotName: string | undefined,
  existingShifts: ShiftRecord[],
  excludeShiftId?: string
): DepartmentQuotaCheck {
  const slots = getDepartmentSlots(deptId);
  const slotsForCategory = slots.filter(s => s.shiftCategory === shiftType);

  if (slotsForCategory.length === 0) {
    // Custom shift or no fixed category
    return {
      allowed: true,
      totalSlotsForCategory: 99,
      bookedCountForCategory: 0,
      availableSlotNames: []
    };
  }

  const availability = getDepartmentSlotsAvailability(deptId, date, existingShifts, excludeShiftId);
  const categoryAvailabilities = availability.filter(a => a.slot.shiftCategory === shiftType);
  const bookedSlots = categoryAvailabilities.filter(a => a.isBooked);
  const availableSlots = categoryAvailabilities.filter(a => !a.isBooked);

  // If specific slot requested, check if it's already booked
  if (requestedSlotName) {
    const targetSlotAvail = categoryAvailabilities.find(
      a => a.slot.slotName.toLowerCase() === requestedSlotName.toLowerCase().trim()
    );
    if (targetSlotAvail && targetSlotAvail.isBooked) {
      return {
        allowed: false,
        errorMessage: `جێگەی (${requestedSlotName}) لە بەرواری ${date} پێشتر لەلایەن (${targetSlotAvail.bookedByNurseName || targetSlotAvail.bookedByNurseId}) پڕکراوەتەوە!`,
        totalSlotsForCategory: categoryAvailabilities.length,
        bookedCountForCategory: bookedSlots.length,
        availableSlotNames: availableSlots.map(a => a.slot.slotName)
      };
    }
  }

  // Check overall category quota
  if (bookedSlots.length >= categoryAvailabilities.length) {
    const shiftNamesKu: Record<string, string> = {
      morning: 'بەیانیان (Morning)',
      evening: 'ئێواران (Evening)',
      night: 'شەوان (Night)',
      support: 'پشتیوانی (Support)',
      support_night: 'شەوی پشتیوانی (Spport Night)',
      on_call: 'ئۆنکۆڵ (OnCall)',
      full_day: '٢٤ کاتژمێری'
    };
    const shiftLabel = shiftNamesKu[shiftType] || shiftType;

    return {
      allowed: false,
      errorMessage: `ڕێژەی دیاریکراوی شیفتی ${shiftLabel} بۆ ئەم بەشە لە بەرواری ${date} پڕکراوەتەوە (${categoryAvailabilities.length}/${categoryAvailabilities.length}). ناتوانیت زیاتر لە ڕێژەی فەرمی شیفت داخیڵ بکەیت!`,
      totalSlotsForCategory: categoryAvailabilities.length,
      bookedCountForCategory: bookedSlots.length,
      availableSlotNames: []
    };
  }

  return {
    allowed: true,
    totalSlotsForCategory: categoryAvailabilities.length,
    bookedCountForCategory: bookedSlots.length,
    availableSlotNames: availableSlots.map(a => a.slot.slotName)
  };
}

export type ShiftTimeGroup = 'morning' | 'evening' | 'night' | 'full_day' | 'custom';

/**
 * Categorizes any shift (regular or on-call) into its respective time slot:
 * - Morning & Morning On-Call are treated as 'morning'
 * - Evening & Evening On-Call are treated as 'evening'
 * - Night & Night On-Call are treated as 'night'
 */
export function getShiftTimeSlotGroup(shift: {
  shiftType: ShiftType;
  slotName?: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
}): ShiftTimeGroup {
  const slotNameLower = (shift.slotName || '').toLowerCase();

  // 1. Explicit slotName keywords (e.g. "Morning Oncall1", "Evening OnCall1", "Night OnCall1")
  if (slotNameLower.includes('morning') || slotNameLower.includes('بەیانی')) return 'morning';
  if (slotNameLower.includes('evening') || slotNameLower.includes('ئێوارە')) return 'evening';
  if (slotNameLower.includes('night') || slotNameLower.includes('شەو')) return 'night';

  // 2. Direct ShiftType classification
  if (shift.shiftType === 'morning' || shift.shiftType === 'support') return 'morning';
  if (shift.shiftType === 'evening') return 'evening';
  if (shift.shiftType === 'night' || shift.shiftType === 'support_night') return 'night';
  if (shift.shiftType === 'full_day') return 'full_day';

  // 3. Fallback to startTime
  if (shift.startTime) {
    const startHour = parseInt(shift.startTime.split(':')[0], 10);
    if (startHour >= 6 && startHour < 14) return 'morning';
    if (startHour >= 14 && startHour < 20) return 'evening';
    if (startHour >= 20 || startHour < 6) return 'night';
  }

  // 4. Default fallback for on_call
  if (shift.shiftType === 'on_call') {
    if (shift.hours === 6) return 'morning';
    return 'night';
  }

  return 'custom';
}

export const shiftGroupNamesKu: Record<ShiftTimeGroup, string> = {
  morning: 'بەیانیان (Morning / Morning On-Call)',
  evening: 'ئێواران (Evening / Evening On-Call)',
  night: 'شەوان (Night / Night On-Call)',
  full_day: '٢٤ کاتژمێری (Full Day)',
  custom: 'تایبەت (Custom)'
};
