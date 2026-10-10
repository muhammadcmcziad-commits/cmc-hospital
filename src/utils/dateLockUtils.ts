/**
 * Utility functions for hospital shift date locking & rules:
 * 1. Future dates (date > today) are strictly LOCKED for nurses.
 * 2. Current day (today) is always UNLOCKED automatically as soon as the day begins (00:00).
 * 3. Current month past days are open for the current month.
 * 4. Previous month days are ONLY allowed until 08:00 AM on the 1st day of the new month.
 *    Once the clock reaches 08:00 AM on the 1st (or on day 2, 3, etc.), the previous month is completely LOCKED.
 * 5. Older months (2+ months ago) are permanently LOCKED for shift logging.
 */

export interface DateLockStatus {
  isLocked: boolean;
  reason?: 'future' | 'previous_month_locked' | 'older_month_locked' | null;
  message?: string;
}

export function checkDateLockStatus(
  targetDateStr: string, 
  currentDate: Date = new Date(),
  userRole: 'nurse' | 'admin' | 'supervisor' = 'nurse'
): DateLockStatus {
  // Admins can log/manage past & future if needed
  if (userRole === 'admin') {
    return { isLocked: false, reason: null };
  }

  const todayStr = currentDate.toISOString().split('T')[0];

  // 1. Future dates are strictly locked
  if (targetDateStr > todayStr) {
    return {
      isLocked: true,
      reason: 'future',
      message: `ئاگاداری: ڕۆژی (${targetDateStr}) لە داهاتوودایە و قوفڵکراوە. تەنها دەتوانیت تاوەکو ئەمڕۆ (${todayStr}) شیفت تۆمار بکەیت.`
    };
  }

  // Target date year, month (1-12), day
  const [tYear, tMonth] = targetDateStr.split('-').map(Number);
  
  const cYear = currentDate.getFullYear();
  const cMonth = currentDate.getMonth() + 1; // 1-12
  const cDay = currentDate.getDate();
  const cHour = currentDate.getHours();

  // 2. Is target date in current year and current month?
  if (tYear === cYear && tMonth === cMonth) {
    // Current month dates up to today are unlocked and allowed
    return { isLocked: false, reason: null };
  }

  // Calculate previous month
  let prevMonth = cMonth - 1;
  let prevYear = cYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = cYear - 1;
  }

  // 3. Is target date in immediately previous month?
  if (tYear === prevYear && tMonth === prevMonth) {
    // Grace period: 1st of month before 08:00 AM
    const isWithinGracePeriod = cDay === 1 && cHour < 8;

    if (isWithinGracePeriod) {
      return { isLocked: false, reason: null };
    } else {
      return {
        isLocked: true,
        reason: 'previous_month_locked',
        message: `مانگی ڕابردوو لە کاتژمێر ٠٨:٠٠ی بەیانی ١ی مانگەوە قوفڵ کراوە! دەستکاری و تۆمارکردنی شیفت بۆ مانگی پێشوو ڕاگیراوە.`
      };
    }
  }

  // 4. Older months (2+ months ago)
  return {
    isLocked: true,
    reason: 'older_month_locked',
    message: 'ئەم مانگە کۆنە و بە تەواوەتی قوفڵکراوە.'
  };
}

/**
 * Returns minimum allowable date string for nurse input
 */
export function getMinimumAllowedDateForNurse(currentDate: Date = new Date()): string {
  const cYear = currentDate.getFullYear();
  const cMonth = currentDate.getMonth() + 1;
  const cDay = currentDate.getDate();
  const cHour = currentDate.getHours();

  // If day 1 before 8:00 AM, allow going back to 1st of previous month
  if (cDay === 1 && cHour < 8) {
    let prevMonth = cMonth - 1;
    let prevYear = cYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = cYear - 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  }

  // Otherwise, strictly 1st of current month
  return `${cYear}-${String(cMonth).padStart(2, '0')}-01`;
}
