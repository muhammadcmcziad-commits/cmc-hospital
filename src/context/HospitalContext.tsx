import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Department, 
  Nurse, 
  ShiftRecord, 
  HospitalNotice, 
  ShiftSwapRequest, 
  Language, 
  Theme,
  UserRole,
  ShiftType,
  ShiftStatus
} from '../types';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_NURSES, 
  INITIAL_SHIFTS, 
  INITIAL_NOTICES, 
  INITIAL_SWAPS 
} from '../data/mockData';
import { 
  validateDepartmentShiftQuota, 
  DepartmentQuotaCheck 
} from '../data/departmentSlots';
import { translations } from '../i18n/translations';
import { syncShiftToGoogleSheet } from '../services/googleDriveService';

// Helper to calculate the true total net hours of a shift (base hours + extra/overtime - minus hours)
export const getShiftTotalHours = (shift: { hours: number; extraHours?: number }): number => {
  const base = Number(shift.hours) || 0;
  const extra = Number(shift.extraHours) || 0;
  return Math.max(0, base + extra);
};

// Helper to reliably identify Mohammed Ziad / System Admin across the entire platform
export const isSystemAdminNurse = (nurse: { id?: string; fullNameKu?: string; fullNameEn?: string; phone?: string; notes?: string } | string | null | undefined): boolean => {
  if (!nurse) return false;
  if (typeof nurse === 'string') {
    const clean = nurse.trim().toUpperCase();
    return clean === 'A001' || clean === 'ADMIN' || clean === 'MOHAMMED' || clean === 'MOHAMMAD' || clean.includes('07504677411') || clean.includes('7504677411');
  }
  const id = (nurse.id || '').trim().toUpperCase();
  const nameKu = (nurse.fullNameKu || '').toLowerCase();
  const nameEn = (nurse.fullNameEn || '').toLowerCase();
  const phone = (nurse.phone || '').replace(/\D/g, '');
  const notes = (nurse.notes || '').toLowerCase();
  return (
    id === 'A001' ||
    id === 'ADMIN' ||
    id === 'MOHAMMED' ||
    id === 'MOHAMMAD' ||
    phone.includes('7504677411') ||
    nameKu.includes('mohammed ziad') ||
    nameKu.includes('mohammad ziad') ||
    nameKu.includes('محمد زیاد') ||
    nameEn.includes('mohammed ziad') ||
    nameEn.includes('mohammad ziad') ||
    notes.includes('ئەدمین') ||
    notes.includes('هێد نێرس')
  );
};

interface HospitalContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: typeof translations['ku'];
  
  // Auth
  currentRole: UserRole | null;
  currentNurse: Nurse | null;
  adminCredentials: { id: string; pin: string };
  updateAdminCredentials: (newId: string, newPin: string) => { success: boolean; message: string };
  loginAsAdmin: (adminId: string, pin?: string) => boolean;
  loginAsNurse: (nurseId: string, pin: string) => boolean;
  logout: () => void;
  changeNurseCredentials: (oldId: string, newId: string, newPin: string) => { success: boolean; message: string };
  
  // Departments
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, dept: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  getDepartment: (id: string) => Department | undefined;
  
  // Nurses
  nurses: Nurse[];
  addNurse: (nurse: Omit<Nurse, 'id'> & { customId?: string }) => Nurse;
  updateNurse: (id: string, nurse: Partial<Nurse>) => void;
  deleteNurse: (id: string) => void;
  getNurse: (id: string) => Nurse | undefined;
  
  // Shifts
  shifts: ShiftRecord[];
  deletedShifts: ShiftRecord[];
  logShift: (shift: Omit<ShiftRecord, 'id' | 'createdAt' | 'status'> & { status?: ShiftStatus }) => ShiftRecord;
  updateShiftStatus: (shiftId: string, status: ShiftStatus, supervisorNotes?: string) => void;
  updateShift: (shiftId: string, updated: Partial<ShiftRecord>) => void;
  deleteShift: (shiftId: string, reason?: string) => void;
  restoreShift: (shiftId: string, targetStatus?: ShiftStatus) => void;
  permanentlyDeleteShift: (shiftId: string) => void;
  emptyDeletedShifts: () => void;
  validateQuota: (deptId: string, date: string, shiftType: ShiftType, slotName?: string, excludeShiftId?: string) => DepartmentQuotaCheck;
  
  // Supervisor Permissions & Scope
  isCurrentNurseSupervisor: boolean;
  supervisorDepartmentIds: string[];
  canManageShift: (shift: ShiftRecord) => boolean;
  canManageDepartment: (deptId: string) => boolean;
  toggleNurseSupervisorStatus: (nurseId: string) => void;
  getDepartmentSupervisors: (deptId: string) => Nurse[];
  getDepartmentHeadNurseDisplay: (dept: Department) => string;

  // Shift Swaps
  swapRequests: ShiftSwapRequest[];
  createSwapRequest: (req: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => void;
  respondSwapRequest: (swapId: string, status: 'approved' | 'rejected') => void;
  
  // Notices
  notices: HospitalNotice[];
  addNotice: (notice: Omit<HospitalNotice, 'id' | 'createdAt'>) => void;
  deleteNotice: (noticeId: string) => void;
  
  // Utilities & Stats
  resetAllData: () => void;
  exportShiftsToCSV: (departmentId?: string) => void;
  bulkImportData: (data: {
    departments?: Array<Omit<Department, 'id'> & { id?: string }>;
    nurses?: Array<Omit<Nurse, 'id'> & { id?: string }>;
    shifts?: Array<Omit<ShiftRecord, 'id' | 'createdAt'> & { id?: string }>;
  }) => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LANG: 'careshift_lang',
  THEME: 'careshift_theme',
  AUTH_ROLE: 'careshift_role',
  AUTH_NURSE_ID: 'careshift_nurse_id',
  ADMIN_CREDS: 'careshift_admin_creds_v2',
  DEPTS: 'careshift_depts_v4',
  NURSES: 'careshift_nurses_v4',
  SHIFTS: 'careshift_shifts_v4',
  DELETED_SHIFTS: 'careshift_deleted_shifts_v4',
  NOTICES: 'careshift_notices_v4',
  SWAPS: 'careshift_swaps_v4',
};

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language state
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    return (saved as Language) || 'ku';
  });

  // Theme state (Night Shift / Dark Mode)
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    // Check if user prefers dark mode
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }, [language]);

  const t = translations[language] || translations.ku;

  // 2. Departments
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPTS);
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPTS, JSON.stringify(departments));
  }, [departments]);

  // 3. Nurses with migration to ensure all 49 nurses and departmentIds exist
  const [nurses, setNurses] = useState<Nurse[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NURSES);
    if (!saved) return INITIAL_NURSES;
    try {
      const parsed: Nurse[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length < 40) return INITIAL_NURSES;
      return parsed.map(n => {
        const initNurse = INITIAL_NURSES.find(inr => 
          (inr.id && n.id && inr.id.toLowerCase() === n.id.toLowerCase()) || 
          (inr.fullNameKu && n.fullNameKu && inr.fullNameKu.trim().toLowerCase() === n.fullNameKu.trim().toLowerCase())
        );
        const mergedDepts = new Set<string>();

        const normalizeDeptId = (id: string | undefined): string | null => {
          if (!id) return null;
          const clean = id.toLowerCase().trim();
          if (clean === 'dept-er' || clean === 'er') return 'dept-1';
          if (clean === 'dept-gen' || clean === 'gen') return 'dept-2';
          if (clean === 'dept-card' || clean === 'card') return 'dept-3';
          if (clean === 'dept-ped' || clean === 'ped') return 'dept-4';
          if (clean === 'dept-nicu' || clean === 'nicu') return 'dept-5';
          return id;
        };

        const cleanSavedDeptId = normalizeDeptId(n.departmentId);
        if (cleanSavedDeptId) mergedDepts.add(cleanSavedDeptId);
        if (Array.isArray(n.departmentIds)) {
          n.departmentIds.forEach(d => {
            const cleanD = normalizeDeptId(d);
            if (cleanD) mergedDepts.add(cleanD);
          });
        }
        if (initNurse) {
          const cleanInitDeptId = normalizeDeptId(initNurse.departmentId);
          if (cleanInitDeptId) mergedDepts.add(cleanInitDeptId);
          if (Array.isArray(initNurse.departmentIds)) {
            initNurse.departmentIds.forEach(d => {
              const cleanD = normalizeDeptId(d);
              if (cleanD) mergedDepts.add(cleanD);
            });
          }
        }

        // Strip accidental emergency/dept-er assignments for nurses who never belonged to ER (like Helin A029)
        if (initNurse && !initNurse.departmentIds?.includes('dept-1') && initNurse.departmentId !== 'dept-1') {
          mergedDepts.delete('dept-1');
          mergedDepts.delete('dept-er');
          mergedDepts.delete('er');
        }

        // Retain only valid existing departments
        const validDeptIds = Array.from(mergedDepts).filter(id => {
          if (!id || id === 'dept-er' || id === 'er' || id === 'admin') return false;
          return INITIAL_DEPARTMENTS.some(d => d.id === id);
        });
        const finalDeptIds = validDeptIds.length > 0 ? validDeptIds : (initNurse?.departmentIds || ['dept-1']);
        const primaryDept = finalDeptIds.includes(n.departmentId) ? n.departmentId : finalDeptIds[0];

        const isAdminNurse = n.id === 'A001' || isSystemAdminNurse(n);
        const supervisorFlag = isAdminNurse ? false : (n.isSupervisor !== undefined ? Boolean(n.isSupervisor) : Boolean(initNurse?.isSupervisor));
        const resolvedRole = isAdminNurse ? 'head_nurse' : (n.role === 'head_nurse' ? 'team_leader' : n.role);
        const resolvedHours = isAdminNurse ? 0 : (n.maxMonthlyHours || 160);
        const resolvedNotes = isAdminNurse ? 'هێد نێرس (Head Nurse) و سەرپەرشتیاری گشتی' : n.notes;
        const resolvedFullNameKu = isAdminNurse ? 'Mohammed Ziad Mohammed' : n.fullNameKu;
        const resolvedFullNameEn = isAdminNurse ? 'Mohammed Ziad Mohammed' : n.fullNameEn;
        const resolvedPin = (isAdminNurse && (n.pin === '1233' || !n.pin)) 
          ? '1234' 
          : (n.id === 'A003' && (n.pin === '1133' || !n.pin)) 
            ? '2233' 
            : ((n.id === 'A008' || n.id === 'E008') && (n.pin === '1188' || !n.pin))
              ? '11223344'
              : (n.pin === '1234' && initNurse?.pin && initNurse.pin !== '1234')
                ? initNurse.pin
                : (n.pin || initNurse?.pin || '1234');
        return {
          ...n,
          fullNameKu: resolvedFullNameKu,
          fullNameEn: resolvedFullNameEn,
          pin: resolvedPin,
          role: resolvedRole,
          maxMonthlyHours: resolvedHours,
          notes: resolvedNotes,
          departmentId: isAdminNurse ? 'admin' : primaryDept,
          departmentIds: isAdminNurse ? [] : (finalDeptIds.length > 0 ? finalDeptIds : [primaryDept]),
          isSupervisor: supervisorFlag,
        };
      });
    } catch {
      return INITIAL_NURSES;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NURSES, JSON.stringify(nurses));
  }, [nurses]);

  // 4. Shifts
  const [shifts, setShifts] = useState<ShiftRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
      const rawShifts: ShiftRecord[] = saved ? JSON.parse(saved) : INITIAL_SHIFTS;
      if (!Array.isArray(rawShifts)) return INITIAL_SHIFTS;

      // Normalize any legacy shift hours, times, and department IDs
      return rawShifts.map(s => {
        let updated = { ...s };
        const rawDept = (s.departmentId || '').toLowerCase().trim();
        if (rawDept === 'dept-er' || rawDept === 'er') {
          updated.departmentId = 'dept-1';
        } else if (rawDept === 'dept-gen' || rawDept === 'gen') {
          updated.departmentId = 'dept-2';
        } else if (rawDept === 'dept-card' || rawDept === 'card') {
          updated.departmentId = 'dept-3';
        } else if (rawDept === 'dept-ped' || rawDept === 'ped') {
          updated.departmentId = 'dept-4';
        } else if (rawDept === 'dept-nicu' || rawDept === 'nicu') {
          updated.departmentId = 'dept-5';
        }

        if (s.shiftType === 'morning' && (s.hours === 7 || s.endTime === '15:00')) {
          updated = { ...updated, startTime: '08:00', endTime: '14:00', hours: 6 };
        } else if (s.shiftType === 'evening' && (s.hours === 7 || s.startTime === '15:00' || s.endTime === '22:00')) {
          updated = { ...updated, startTime: '14:00', endTime: '20:00', hours: 6 };
        } else if (s.shiftType === 'night' && (s.startTime === '22:00' || s.hours === 10)) {
          updated = { ...updated, startTime: '20:00', endTime: '08:00', hours: 12 };
        }
        return updated;
      });
    } catch {
      return INITIAL_SHIFTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  // 4b. Deleted / Cancelled Shifts Archive (سڕاوەکان و ڕەشکراوەکان)
  const [deletedShifts, setDeletedShifts] = useState<ShiftRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELETED_SHIFTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELETED_SHIFTS, JSON.stringify(deletedShifts));
  }, [deletedShifts]);

  // 5. Notices
  const [notices, setNotices] = useState<HospitalNotice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTICES);
      const rawNotices: HospitalNotice[] = saved ? JSON.parse(saved) : INITIAL_NOTICES;
      if (!Array.isArray(rawNotices)) return INITIAL_NOTICES;
      return rawNotices.map(nt => {
        if (nt.authorNameKu && (nt.authorNameKu.includes('Mohammad') || nt.authorNameKu.includes('محمد زیاد'))) {
          return { ...nt, authorNameKu: 'Mohammed Ziad Mohammed (Admin)' };
        }
        return nt;
      });
    } catch {
      return INITIAL_NOTICES;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(notices));
  }, [notices]);

  // 6. Shift Swaps
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SWAPS);
    return saved ? JSON.parse(saved) : INITIAL_SWAPS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SWAPS, JSON.stringify(swapRequests));
  }, [swapRequests]);

  // 7. Auth State & Credentials
  const [adminCredentials, setAdminCredentials] = useState<{ id: string; pin: string }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.pin === 'string' && parsed.pin.trim()) {
          return {
            id: parsed.id ? String(parsed.id).trim().toUpperCase() : 'ADMIN',
            pin: parsed.pin.trim(),
          };
        }
      }
    } catch {
      // fallback
    }
    return { id: 'ADMIN', pin: '7891' };
  });

  const updateAdminCredentials = (newId: string, newPin: string): { success: boolean; message: string } => {
    const cleanId = newId.trim().toUpperCase() || 'ADMIN';
    const cleanPin = newPin.trim();

    if (!cleanPin || cleanPin.length < 3) {
      return { success: false, message: 'تکایە وشەی نهێنی بەڕێوەبەر بە لانیکەم ٣ پیت یان ژمارە دیاری بکە' };
    }

    const updated = { id: cleanId, pin: cleanPin };
    setAdminCredentials(updated);
    localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(updated));

    // Also update nurse A001's pin in state and storage if present
    setNurses(prev => prev.map(n => n.id.toUpperCase() === 'A001' ? { ...n, pin: cleanPin } : n));

    return { success: true, message: 'ئایدی و وشەی نهێنی بەڕێوەبەر بە سەرکەوتوویی نوێکرانەوە' };
  };

  const [currentRole, setCurrentRole] = useState<UserRole | null>(() => {
    const role = (localStorage.getItem(STORAGE_KEYS.AUTH_ROLE) as UserRole) || null;
    const nurseId = localStorage.getItem(STORAGE_KEYS.AUTH_NURSE_ID);
    if (nurseId && (nurseId.toUpperCase() === 'A001' || nurseId.toUpperCase() === 'ADMIN')) {
      localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'admin');
      localStorage.removeItem(STORAGE_KEYS.AUTH_NURSE_ID);
      return 'admin';
    }
    return role;
  });

  const [currentNurseId, setCurrentNurseId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_NURSE_ID) || null;
  });

  const currentNurse = currentNurseId ? nurses.find(n => n.id.toUpperCase() === currentNurseId.toUpperCase()) || null : null;

  const loginAsAdmin = (adminId: string, pin?: string): boolean => {
    // Support both loginAsAdmin(id, pin) and loginAsAdmin(pin)
    const idInput = pin !== undefined ? adminId.trim().toUpperCase() : 'ADMIN';
    const pinInput = (pin !== undefined ? pin : adminId).trim();

    const currentStoredPin = adminCredentials.pin.trim();
    const currentStoredId = adminCredentials.id.trim().toUpperCase();

    // Check if ID matches configured admin ID, or 'ADMIN', or 'A001', or phone/name
    const idValid = 
      idInput === currentStoredId || 
      idInput === 'ADMIN' || 
      idInput === 'A001' || 
      idInput === 'MOHAMMED' ||
      idInput === 'MOHAMMAD' ||
      idInput.includes('07504677411') ||
      idInput.includes('7504677411') ||
      idInput.includes('ZIAD') ||
      idInput.includes('زیاد');

    // Strict PIN check against currentStoredPin, 1234, or 7891
    const pinValid = 
      pinInput === currentStoredPin || 
      pinInput === '1234' || 
      pinInput === '7891';

    if (idValid && pinValid) {
      setCurrentRole('admin');
      setCurrentNurseId(null);
      localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'admin');
      localStorage.removeItem(STORAGE_KEYS.AUTH_NURSE_ID);
      return true;
    }
    return false;
  };

  const loginAsNurse = (nurseId: string, pin: string): boolean => {
    const cleanId = nurseId.trim().toUpperCase();
    const cleanPin = pin.trim();
    
    // Support all common prefixes interchangeably: 'E', 'A', 'T', 'N' (e.g. E008 <-> A008 <-> T008)
    const cleanDigits = cleanId.replace(/\D/g, '');
    const paddedDigits = cleanDigits ? cleanDigits.padStart(3, '0') : '';
    const prefixVariants = ['A', 'E', 'T', 'N'].map(p => `${p}${paddedDigits}`);

    // Check match by ID (e.g. A008, E008, T008), digits, email, or full name
    const found = nurses.find(n => {
      const nId = n.id.trim().toUpperCase();
      const nDigits = nId.replace(/\D/g, '');
      const matchId = nId === cleanId || prefixVariants.includes(nId);
      const matchDigits = cleanDigits.length > 0 && (cleanDigits === nDigits || parseInt(cleanDigits, 10) === parseInt(nDigits, 10));
      const matchUsr = cleanId.startsWith('USR') && nDigits === cleanDigits;
      const matchEmail = n.email && n.email.trim().toUpperCase() === cleanId;
      const matchName = 
        n.fullNameEn.trim().toUpperCase() === cleanId || 
        n.fullNameKu.trim().toUpperCase() === cleanId ||
        (cleanId.includes('ELAF') && n.fullNameEn.toUpperCase().includes('ELAF')) ||
        (cleanId.includes('ئیلاف') && n.fullNameKu.includes('ئیلاف'));
      return matchId || matchDigits || matchUsr || matchEmail || matchName;
    });

    if (found) {
      // Check pin - allow official PIN or customized PINs
      const currentNursePin = (found.pin || '').trim();
      const isElaf = found.id === 'A008' || found.id === 'E008' || found.fullNameEn.toLowerCase().includes('elaf');
      const isKarwan = found.id === 'A003' || found.fullNameEn.toLowerCase().includes('karwan');
      const isA001 = isSystemAdminNurse(found);

      const isPinMatch = 
        currentNursePin === cleanPin ||
        (isA001 && (cleanPin === '1234' || cleanPin === '7891' || cleanPin === adminCredentials.pin.trim())) ||
        (isElaf && (cleanPin === '11223344' || cleanPin === '1188')) ||
        (isKarwan && (cleanPin === '2233' || cleanPin === '1133'));

      if (isPinMatch) {
        if (isA001) {
          // Mohammad Ziad is the Head Nurse / Admin - ALWAYS logged in as System Admin
          setCurrentRole('admin');
          setCurrentNurseId(null);
          localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'admin');
          localStorage.removeItem(STORAGE_KEYS.AUTH_NURSE_ID);
          return true;
        }

        // If logged in with customized pin, persist it to memory & storage
        if (cleanPin && found.pin !== cleanPin) {
          found.pin = cleanPin;
          setNurses(prev => prev.map(item => item.id === found.id ? { ...item, pin: cleanPin } : item));
        }
        setCurrentRole('nurse');
        setCurrentNurseId(found.id);
        localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'nurse');
        localStorage.setItem(STORAGE_KEYS.AUTH_NURSE_ID, found.id);
        return true;
      }
    }
    return false;
  };

  const changeNurseCredentials = (
    oldId: string,
    newId: string,
    newPin: string
  ): { success: boolean; message: string } => {
    const cleanOldId = oldId.trim().toUpperCase();
    const cleanNewId = newId.trim().toUpperCase();
    const cleanPin = newPin.trim();

    if (!cleanNewId) {
      return { success: false, message: 'تکایە ئایدی نوێ بنووسە' };
    }
    if (!cleanPin || cleanPin.length < 3) {
      return { success: false, message: 'وشەی تێپەڕبوون (PIN) دەبێت لانیکەم ٣ پیت یان ژمارە بێت' };
    }

    const existingNurse = nurses.find(n => n.id.toUpperCase() === cleanOldId);
    if (!existingNurse) {
      return { success: false, message: 'پەرستار نەدۆزرایەوە' };
    }

    // If ID changed, ensure new ID is not already used
    if (cleanNewId !== cleanOldId) {
      const idTaken = nurses.some(n => n.id.toUpperCase() === cleanNewId && n.id.toUpperCase() !== cleanOldId);
      if (idTaken || cleanNewId === 'ADMIN' || cleanNewId === adminCredentials.id.toUpperCase()) {
        return { success: false, message: 'ئەم ئایدییە پێشتر بەکارهێنراوە، تکایە ئایدییەکی تر هەڵبژێرە' };
      }
    }

    // Update nurse
    const updatedNurse: Nurse = {
      ...existingNurse,
      id: cleanNewId,
      pin: cleanPin,
    };

    setNurses(prev => prev.map(n => n.id.toUpperCase() === cleanOldId ? updatedNurse : n));

    // Cascade ID change to shifts and swap requests
    if (cleanNewId !== cleanOldId) {
      setShifts(prev => prev.map(s => s.nurseId.toUpperCase() === cleanOldId ? { ...s, nurseId: cleanNewId } : s));
      setSwapRequests(prev => prev.map(sw => ({
        ...sw,
        requesterNurseId: sw.requesterNurseId.toUpperCase() === cleanOldId ? cleanNewId : sw.requesterNurseId,
        targetNurseId: sw.targetNurseId.toUpperCase() === cleanOldId ? cleanNewId : sw.targetNurseId,
      })));

      if (currentNurseId && currentNurseId.toUpperCase() === cleanOldId) {
        setCurrentNurseId(cleanNewId);
        localStorage.setItem(STORAGE_KEYS.AUTH_NURSE_ID, cleanNewId);
      }
    }

    return { success: true, message: 'ئایدی و وشەی تێپەڕبوون (PIN) بە سەرکەوتوویی گۆڕدرا' };
  };

  const logout = () => {
    setCurrentRole(null);
    setCurrentNurseId(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_NURSE_ID);
  };

  // Department Helpers
  const addDepartment = (dept: Omit<Department, 'id'>) => {
    const newId = `dept-${Date.now().toString(36)}`;
    const newDept: Department = { ...dept, id: newId };
    setDepartments(prev => [...prev, newDept]);
  };

  const updateDepartment = (id: string, updated: Partial<Department>) => {
    setDepartments(prev => prev.map(d => (d.id === id ? { ...d, ...updated } : d)));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  const getDepartment = (id: string): Department | undefined => {
    if (!id) return undefined;
    const directMatch = departments.find(d => d.id === id);
    if (directMatch) return directMatch;

    const lower = id.toLowerCase().trim();
    if (lower === 'dept-er' || lower === 'er' || lower === 'emergency') {
      return departments.find(d => d.id === 'dept-1' || d.code === 'ER');
    }
    if (lower === 'dept-gen' || lower === 'gen' || lower === 'general') {
      return departments.find(d => d.id === 'dept-2' || d.code === 'GEN');
    }
    if (lower === 'dept-card' || lower === 'card' || lower === 'cardiac') {
      return departments.find(d => d.id === 'dept-3' || d.code === 'CARD');
    }
    if (lower === 'dept-ped' || lower === 'ped' || lower === 'pediatric') {
      return departments.find(d => d.id === 'dept-4' || d.code === 'PED');
    }
    if (lower === 'dept-nicu' || lower === 'nicu') {
      return departments.find(d => d.id === 'dept-5' || d.code === 'NICU');
    }
    return departments.find(d => d.code.toLowerCase() === lower);
  };

  // Nurse Helpers
  const addNurse = (nurseData: Omit<Nurse, 'id'> & { customId?: string }): Nurse => {
    let nextId = nurseData.customId?.trim().toUpperCase();
    if (!nextId) {
      const highestNum = nurses.reduce((acc, curr) => {
        const match = curr.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          return num > acc ? num : acc;
        }
        return acc;
      }, 100);
      nextId = `NUR-${highestNum + 1}`;
    }

    const newNurse: Nurse = {
      ...nurseData,
      id: nextId,
      pin: nurseData.pin || '1234',
      status: nurseData.status || 'active',
      joinedDate: nurseData.joinedDate || new Date().toISOString().split('T')[0],
      maxMonthlyHours: nurseData.maxMonthlyHours || 160,
    };

    setNurses(prev => [...prev, newNurse]);

    if (newNurse.isSupervisor || newNurse.role === 'head_nurse') {
      const deptIds = newNurse.departmentIds || (newNurse.departmentId ? [newNurse.departmentId] : []);
      setDepartments(prev => prev.map(d => {
        if (deptIds.includes(d.id)) {
          return { ...d, headNurseNameKu: newNurse.fullNameKu, headNurseId: newNurse.id };
        }
        return d;
      }));
    }

    return newNurse;
  };

  const updateNurse = (id: string, updated: Partial<Nurse>) => {
    setNurses(prev => prev.map(n => (n.id === id ? { ...n, ...updated } : n)));

    if (updated.isSupervisor !== undefined || updated.role !== undefined || updated.fullNameKu !== undefined) {
      const current = nurses.find(n => n.id === id);
      const isSup = updated.isSupervisor !== undefined ? updated.isSupervisor : current?.isSupervisor;
      const role = updated.role !== undefined ? updated.role : current?.role;
      const name = updated.fullNameKu !== undefined ? updated.fullNameKu : current?.fullNameKu;
      const deptIds = updated.departmentIds || current?.departmentIds || (current?.departmentId ? [current.departmentId] : []);

      if ((isSup || role === 'head_nurse') && !isSystemAdminNurse({ id, fullNameKu: name } as any)) {
        setDepartments(prev => prev.map(d => {
          if (deptIds.includes(d.id)) {
            return { ...d, headNurseNameKu: name || d.headNurseNameKu, headNurseId: id };
          }
          return d;
        }));
      }
    }
  };

  const deleteNurse = (id: string) => {
    setNurses(prev => prev.filter(n => n.id !== id));
    // Also remove shifts if needed or keep history
  };

  const getNurse = (id: string) => {
    return nurses.find(n => n.id === id);
  };

  // Shift Helpers
  const calculateShiftHours = (type: ShiftType, start: string, end: string): number => {
    if (type === 'morning') return 6;
    if (type === 'evening') return 6;
    if (type === 'night') return 12;
    if (type === 'support_night') return 8;
    if (type === 'support') return 6;
    if (type === 'on_call') return 12;
    if (type === 'full_day') return 24;
    
    // Custom calculation
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Next day
    return Math.max(1, Math.round((diffMinutes / 60) * 10) / 10);
  };

  const logShift = (
    shiftData: Omit<ShiftRecord, 'id' | 'createdAt' | 'status'> & { status?: ShiftStatus }
  ): ShiftRecord => {
    const hours = shiftData.hours || calculateShiftHours(shiftData.shiftType, shiftData.startTime, shiftData.endTime);
    
    const newRecord: ShiftRecord = {
      ...shiftData,
      id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hours,
      status: shiftData.status || (currentRole === 'admin' ? 'approved' : 'pending'),
      createdAt: new Date().toISOString(),
    };

    setShifts(prev => {
      const nextShifts = [newRecord, ...prev];
      // Automatically sync newly logged shift to Google Sheets with submission time in the background
      syncShiftToGoogleSheet({
        shift: newRecord,
        allShifts: nextShifts,
        allNurses: nurses,
        allDepartments: departments,
      }).catch(err => console.warn('Auto sync shift to Google Sheets warning:', err));
      return nextShifts;
    });
    return newRecord;
  };

  // Supervisor Permissions & Scope calculations
  const isCurrentNurseSupervisor = Boolean(
    (currentRole === 'nurse' && currentNurse?.isSupervisor) || 
    (currentRole === 'nurse' && currentNurse?.role === 'head_nurse')
  );

  const supervisorDepartmentIds: string[] = currentNurse
    ? Array.from(new Set([
        ...(currentNurse.departmentIds || []),
        currentNurse.departmentId,
      ].filter(Boolean)))
    : [];

  const canManageDepartment = (deptId: string): boolean => {
    if (currentRole === 'admin') return true;
    if (isCurrentNurseSupervisor) {
      return supervisorDepartmentIds.includes(deptId);
    }
    return false;
  };

  const canManageShift = (shift: ShiftRecord): boolean => {
    if (currentRole === 'admin') return true;
    if (isCurrentNurseSupervisor) {
      return supervisorDepartmentIds.includes(shift.departmentId);
    }
    return false;
  };

  const toggleNurseSupervisorStatus = (nurseId: string) => {
    if (isSystemAdminNurse(nurseId)) return; // Admin / Head Nurse cannot be toggled as department supervisor
    const targetNurse = nurses.find(n => n.id === nurseId);
    if (!targetNurse) return;
    const willBeSupervisor = !targetNurse.isSupervisor;

    setNurses(prev => prev.map(n => {
      if (n.id === nurseId) {
        return { 
          ...n, 
          isSupervisor: willBeSupervisor,
          role: willBeSupervisor ? 'team_leader' : (n.role === 'team_leader' ? 'senior_nurse' : n.role)
        };
      }
      return n;
    }));

    // Auto sync to assigned departments
    const deptIds = targetNurse.departmentIds || (targetNurse.departmentId ? [targetNurse.departmentId] : []);
    setDepartments(prevDepts => prevDepts.map(d => {
      if (deptIds.includes(d.id)) {
        if (willBeSupervisor) {
          return {
            ...d,
            headNurseNameKu: targetNurse.fullNameKu,
            headNurseId: targetNurse.id
          };
        } else {
          // Check if any other supervisor remains for this department (excluding admin)
          const otherSupervisor = nurses.find(other => 
            other.id !== nurseId &&
            !isSystemAdminNurse(other) &&
            (other.isSupervisor || other.role === 'team_leader') &&
            (other.departmentId === d.id || (Array.isArray(other.departmentIds) && other.departmentIds.includes(d.id)))
          );
          return {
            ...d,
            headNurseNameKu: otherSupervisor ? otherSupervisor.fullNameKu : undefined,
            headNurseId: otherSupervisor ? otherSupervisor.id : undefined,
          };
        }
      }
      return d;
    }));
  };

  const getDepartmentSupervisors = (deptId: string): Nurse[] => {
    return nurses.filter(n => 
      !isSystemAdminNurse(n) &&
      (n.isSupervisor || n.role === 'team_leader') &&
      (n.departmentId === deptId || (Array.isArray(n.departmentIds) && n.departmentIds.includes(deptId)))
    );
  };

  const getDepartmentHeadNurseDisplay = (dept: Department): string => {
    const supervisors = getDepartmentSupervisors(dept.id);
    if (supervisors.length > 0) {
      return supervisors.map(s => s.fullNameKu).join(' ، ');
    }
    const raw = dept.headNurseNameKu || '';
    const cleaned = raw
      .replace(/mohammed ziad mohammed/gi, '')
      .replace(/mohammed ziad/gi, '')
      .replace(/mohammad ziad mohammad/gi, '')
      .replace(/mohammad ziad/gi, '')
      .replace(/محمد زیاد محمد/g, '')
      .replace(/محمد زیاد/g, '')
      .replace(/^[،,\s]+|[،,\s]+$/g, '')
      .trim();
    return cleaned || 'دیارینەکراوە';
  };

  // Auto-sync department supervisor names from active nurse supervisors
  useEffect(() => {
    setDepartments(prevDepts => {
      let changed = false;
      const nextDepts = prevDepts.map(dept => {
        const activeSups = nurses.filter(n => 
          !isSystemAdminNurse(n) &&
          (n.isSupervisor || n.role === 'team_leader') &&
          (n.departmentId === dept.id || (Array.isArray(n.departmentIds) && n.departmentIds.includes(dept.id)))
        );
        let supName = activeSups.map(s => s.fullNameKu).join(' ، ');
        if (!supName && dept.headNurseNameKu) {
          supName = dept.headNurseNameKu
            .replace(/mohammed ziad mohammed/gi, '')
            .replace(/mohammed ziad/gi, '')
            .replace(/mohammad ziad mohammad/gi, '')
            .replace(/mohammad ziad/gi, '')
            .replace(/محمد زیاد محمد/g, '')
            .replace(/محمد زیاد/g, '')
            .replace(/^[،,\s]+|[،,\s]+$/g, '')
            .trim();
        }
        if (dept.headNurseNameKu !== supName) {
          changed = true;
          return {
            ...dept,
            headNurseNameKu: supName,
            headNurseId: activeSups.length > 0 ? activeSups[0].id : undefined
          };
        }
        return dept;
      });
      return changed ? nextDepts : prevDepts;
    });
  }, [nurses]);

  const updateShiftStatus = (shiftId: string, status: ShiftStatus, supervisorNotes?: string) => {
    setShifts(prev =>
      prev.map(s => {
        if (s.id === shiftId) {
          // Scope Check: Admin can do all; supervisor can ONLY approve/reject shifts in their own department
          if (currentRole !== 'admin') {
            if (!isCurrentNurseSupervisor || !supervisorDepartmentIds.includes(s.departmentId)) {
              console.warn('Unauthorized: Shift outside supervisor department', s.departmentId);
              return s;
            }
          }

          const approvedByTitle = currentRole === 'admin'
            ? 'بەڕێوەبەری سەرپەرشتیار (Admin)'
            : `${currentNurse?.fullNameKu || 'سەرپەرشتیار'} (سەرپەرشتیاری بەش)`;

          return {
            ...s,
            status,
            supervisorNotes: supervisorNotes !== undefined ? supervisorNotes : s.supervisorNotes,
            approvedAt: new Date().toISOString(),
            approvedBy: approvedByTitle,
          };
        }
        return s;
      })
    );
  };

  const updateShift = (shiftId: string, updated: Partial<ShiftRecord>) => {
    setShifts(prev => prev.map(s => (s.id === shiftId ? { ...s, ...updated } : s)));
  };

  const validateQuota = (
    deptId: string,
    date: string,
    shiftType: ShiftType,
    slotName?: string,
    excludeShiftId?: string
  ): DepartmentQuotaCheck => {
    return validateDepartmentShiftQuota(deptId, date, shiftType, slotName, shifts, excludeShiftId);
  };

  const deleteShift = (shiftId: string, reason?: string) => {
    setShifts(prev => {
      const target = prev.find(s => s.id === shiftId);
      if (!target) return prev;

      // 1. Admin can delete any shift
      // 2. Supervisor nurse can delete shifts of staff inside their supervised department(s)
      // 3. Regular nurse can delete their own pending or rejected shift
      const isAdmin = currentRole === 'admin';
      const isSupervisor = (isCurrentNurseSupervisor || Boolean(currentNurse?.isSupervisor) || currentNurse?.role === 'head_nurse') &&
        (supervisorDepartmentIds.length === 0 || supervisorDepartmentIds.includes(target.departmentId));
      const isNurseOwner = Boolean(currentNurse && target.nurseId === currentNurse.id && (target.status === 'pending' || target.status === 'rejected'));

      if (!isAdmin && !isSupervisor && !isNurseOwner) {
        console.warn('Unauthorized: Shift deletion blocked outside supervisor department');
        return prev;
      }

      // Archive into deletedShifts so it can be viewed in the deleted/cancelled tab and restored
      const deletedRecord: ShiftRecord = {
        ...target,
        deletedAt: new Date().toISOString(),
        deletedBy: isAdmin 
          ? 'بەڕێوەبەری گشتی (Admin)' 
          : (currentNurse ? `${currentNurse.fullNameKu} (سەرپەرشتیاری بەش)` : 'سیستەم'),
        deletedReason: reason || undefined,
      };

      setDeletedShifts(dPrev => [deletedRecord, ...dPrev.filter(d => d.id !== shiftId)]);

      return prev.filter(s => s.id !== shiftId);
    });
  };

  const restoreShift = (shiftId: string, targetStatus: ShiftStatus = 'approved') => {
    const target = deletedShifts.find(d => d.id === shiftId);
    if (!target) return;

    const restored: ShiftRecord = {
      ...target,
      status: targetStatus,
      deletedAt: undefined,
      deletedBy: undefined,
      deletedReason: undefined,
      approvedAt: targetStatus === 'approved' ? new Date().toISOString() : target.approvedAt,
      approvedBy: targetStatus === 'approved' 
        ? (currentRole === 'admin' ? 'بەڕێوەبەری گشتی (Admin)' : `${currentNurse?.fullNameKu || 'سەرپەرشتیار'}`) 
        : target.approvedBy,
    };

    setShifts(prev => [restored, ...prev.filter(s => s.id !== shiftId)]);
    setDeletedShifts(prev => prev.filter(d => d.id !== shiftId));
  };

  const permanentlyDeleteShift = (shiftId: string) => {
    setDeletedShifts(prev => prev.filter(d => d.id !== shiftId));
  };

  const emptyDeletedShifts = () => {
    setDeletedShifts([]);
  };

  // Swaps
  const createSwapRequest = (req: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => {
    const newSwap: ShiftSwapRequest = {
      ...req,
      id: `swap-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSwapRequests(prev => [newSwap, ...prev]);
  };

  const respondSwapRequest = (swapId: string, status: 'approved' | 'rejected') => {
    setSwapRequests(prev =>
      prev.map(s => (s.id === swapId ? { ...s, status } : s))
    );
  };

  // Notices
  const addNotice = (notice: Omit<HospitalNotice, 'id' | 'createdAt'>) => {
    const newNotice: HospitalNotice = {
      ...notice,
      id: `notice-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setNotices(prev => [newNotice, ...prev]);
  };

  const deleteNotice = (noticeId: string) => {
    setNotices(prev => prev.filter(n => n.id !== noticeId));
  };

  // Export and Utilities
  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.DEPTS);
    localStorage.removeItem(STORAGE_KEYS.NURSES);
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.NOTICES);
    localStorage.removeItem(STORAGE_KEYS.SWAPS);
    setDepartments(INITIAL_DEPARTMENTS);
    setNurses(INITIAL_NURSES);
    setShifts(INITIAL_SHIFTS);
    setNotices(INITIAL_NOTICES);
    setSwapRequests(INITIAL_SWAPS);
  };

  const exportShiftsToCSV = (departmentId?: string) => {
    const filtered = departmentId 
      ? shifts.filter(s => s.departmentId === departmentId)
      : shifts;

    const headers = ['Shift ID', 'Nurse ID', 'Nurse Name', 'Department', 'Date', 'Shift Type', 'Start Time', 'End Time', 'Base Hours', 'Extra/Overtime Hours', 'Total Hours', 'Status', 'Room/Bed', 'Notes'];
    
    const rows = filtered.map(s => {
      const dept = departments.find(d => d.id === s.departmentId);
      const netTotal = getShiftTotalHours(s);
      return [
        s.id,
        s.nurseId,
        `"${s.nurseNameKu || s.nurseNameEn}"`,
        `"${dept?.nameKu || s.departmentId}"`,
        s.date,
        s.shiftType,
        s.startTime,
        s.endTime,
        s.hours,
        s.extraHours || 0,
        netTotal,
        s.status,
        `"${s.patientBedRoom || ''}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hospital_shifts_${departmentId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bulkImportData = (data: {
    departments?: Array<Omit<Department, 'id'> & { id?: string }>;
    nurses?: Array<Omit<Nurse, 'id'> & { id?: string }>;
    shifts?: Array<Omit<ShiftRecord, 'id' | 'createdAt'> & { id?: string }>;
  }) => {
    if (data.departments && data.departments.length > 0) {
      setDepartments(prev => {
        const next = [...prev];
        data.departments!.forEach(d => {
          const id = d.id || `dept-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
          const existingIdx = next.findIndex(item => item.id === id || item.code.toUpperCase() === d.code.toUpperCase());
          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], ...d, id: next[existingIdx].id };
          } else {
            next.push({ ...d, id } as Department);
          }
        });
        return next;
      });
    }

    if (data.nurses && data.nurses.length > 0) {
      setNurses(prev => {
        const next = [...prev];
        data.nurses!.forEach(n => {
          const id = n.id || `NUR-${Date.now().toString(36).substring(2, 5).toUpperCase()}`;
          const existingIdx = next.findIndex(item => item.id.toUpperCase() === id.toUpperCase() || item.fullNameKu === n.fullNameKu);
          if (existingIdx >= 0) {
            const existingPin = next[existingIdx].pin;
            const incomingPin = n.pin;
            const finalPin = (incomingPin && incomingPin !== '1234') ? incomingPin : (existingPin || incomingPin || '1234');
            next[existingIdx] = { ...next[existingIdx], ...n, pin: finalPin, id: next[existingIdx].id };
          } else {
            next.push({
              ...n,
              id,
              pin: n.pin || '1234',
              status: n.status || 'active',
              joinedDate: n.joinedDate || new Date().toISOString().split('T')[0],
              maxMonthlyHours: n.maxMonthlyHours || 160,
            } as Nurse);
          }
        });
        return next;
      });
    }

    if (data.shifts && data.shifts.length > 0) {
      setShifts(prev => {
        const next = [...prev];
        data.shifts!.forEach(s => {
          const id = s.id || `shift-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const existingIdx = next.findIndex(item => item.id === id || (item.nurseId === s.nurseId && item.date === s.date && item.shiftType === s.shiftType));
          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], ...s, id: next[existingIdx].id };
          } else {
            next.unshift({
              ...s,
              id,
              createdAt: new Date().toISOString(),
              status: s.status || 'approved',
            } as ShiftRecord);
          }
        });
        return next;
      });
    }
  };

  return (
    <HospitalContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        toggleTheme,
        t,
        currentRole,
        currentNurse,
        adminCredentials,
        updateAdminCredentials,
        loginAsAdmin,
        loginAsNurse,
        logout,
        changeNurseCredentials,
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        getDepartment,
        nurses,
        addNurse,
        updateNurse,
        deleteNurse,
        getNurse,
        shifts,
        deletedShifts,
        logShift,
        updateShiftStatus,
        updateShift,
        deleteShift,
        restoreShift,
        permanentlyDeleteShift,
        emptyDeletedShifts,
        validateQuota,
        isCurrentNurseSupervisor,
        supervisorDepartmentIds,
        canManageShift,
        canManageDepartment,
        toggleNurseSupervisorStatus,
        getDepartmentSupervisors,
        getDepartmentHeadNurseDisplay,
        swapRequests,
        createSwapRequest,
        respondSwapRequest,
        notices,
        addNotice,
        deleteNotice,
        resetAllData,
        exportShiftsToCSV,
        bulkImportData,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
