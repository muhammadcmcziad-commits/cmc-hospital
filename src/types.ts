export type Language = 'ku' | 'en' | 'ar';

export type Theme = 'light' | 'dark';

export type UserRole = 'admin' | 'nurse';

export type NurseRank = 
  | 'head_nurse'      // هێد نێرس (Head Nurse) - Mohammed Ziad Mohammed (سەرپەرشتیاری گشتی)
  | 'team_leader'     // تیم لیدەر (Team Leader)
  | 'senior_nurse'    // پەرستاری پێشکەوتوو
  | 'registered_nurse'// پەرستاری بڕوانامەدار
  | 'practical_nurse' // پەرستاری پراکتیکی
  | 'trainee';        // ڕاهێنراو / فێرخواز

export type ShiftType = 
  | 'morning'        // بەیانیان (08:00 - 14:00) 6 hours
  | 'evening'        // ئێواران (14:00 - 20:00) 6 hours
  | 'night'          // شەوان (20:00 - 08:00) 12 hours
  | 'support'        // دەوامی پشتیوانی (08:00 - 14:00) 6 hours
  | 'support_night'  // شەوی پشتیوانی (22:00 - 06:00) 8 hours
  | 'on_call'        // ئۆنکۆڵ (OnCall) 6h / 12h
  | 'full_day'       // 24 کاتژمێری
  | 'custom';        // تایبەت بە دیاریکردنی کات

export type ShiftStatus = 'approved' | 'pending' | 'rejected';

export interface Department {
  id: string;
  nameKu: string;
  nameEn: string;
  nameAr: string;
  code: string; // e.g., 'ER', 'ICU', 'OR', 'PED'
  iconName: string;
  color: string; // Tailwind color theme identifier (e.g. 'rose', 'teal', 'blue', 'purple', 'emerald', 'amber')
  headNurseId?: string;
  headNurseNameKu?: string;
  floor: string;
  bedCapacity: number;
  descriptionKu: string;
  descriptionEn: string;
  phoneExtension: string;
}

export interface Nurse {
  id: string; // Special ID, e.g. "A001"
  pin: string; // e.g. "1234"
  fullNameKu: string;
  fullNameEn: string;
  departmentId: string; // Primary department
  departmentIds?: string[]; // Multiple assigned departments e.g. ['dept-1', 'dept-2']
  role: NurseRank;
  phone: string;
  email?: string;
  avatarUrl?: string;
  status: 'active' | 'on_leave' | 'inactive';
  joinedDate: string; // YYYY-MM-DD
  maxMonthlyHours: number; // default e.g. 160
  notes?: string;
  isSupervisor?: boolean;
}

export interface ShiftRecord {
  id: string;
  nurseId: string;
  nurseNameKu: string;
  nurseNameEn: string;
  departmentId: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  slotName?: string; // e.g. "Morning1", "Night2", "Spport Night", "Evening OnCall1"
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number;
  extraHours?: number; // e.g. Extra Hours worked
  status: ShiftStatus;
  loggedBy: 'nurse' | 'admin';
  patientBedRoom?: string; // e.g. "ژووری ٣٠٢" or "Bed 4 ICU"
  notes?: string;
  supervisorNotes?: string;
  createdAt: string; // ISO string
  approvedAt?: string;
  approvedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
}

export type DeletedShiftRecord = ShiftRecord & {
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
};

export interface ShiftSwapRequest {
  id: string;
  requesterNurseId: string;
  requesterNurseNameKu: string;
  targetNurseId: string;
  targetNurseNameKu: string;
  departmentId: string;
  originalShiftDate: string;
  originalShiftType: ShiftType;
  desiredShiftDate: string;
  desiredShiftType: ShiftType;
  reasonKu: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface HospitalNotice {
  id: string;
  titleKu: string;
  titleEn: string;
  contentKu: string;
  contentEn: string;
  targetDepartmentId: string; // 'all' or specific departmentId
  priority: 'urgent' | 'important' | 'info';
  authorNameKu: string;
  createdAt: string; // YYYY-MM-DD
}

export interface AuthSession {
  role: UserRole;
  nurse?: Nurse;
  token?: string;
  loginTime: string;
}
