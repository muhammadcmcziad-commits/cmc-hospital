import React, { useState, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  KeyRound, 
  Building2, 
  Edit3, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  X,
  UserPlus,
  FileSpreadsheet,
  Lock,
  Eye,
  EyeOff,
  Shield,
  RefreshCw,
  CloudUpload,
  Camera,
  Upload,
  Sparkles,
  Award,
  Image as ImageIcon
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { Nurse, NurseRank, ShiftRecord } from '../../types';
import { DepartmentBadge } from '../common/Badges';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { AVATAR_PRESETS, DEFAULT_AVATAR, compressImageFile } from '../../data/avatarPresets';
import { 
  getSavedGoogleSyncState, 
  exportAllDataToGoogleDrive,
  signInWithGoogle,
  saveGoogleSyncState,
  syncNurseCredentialsToGoogleSheet
} from '../../services/googleDriveService';

export const NurseManager: React.FC = () => {
  const { 
    t, 
    departments, 
    nurses, 
    shifts, 
    addNurse, 
    updateNurse, 
    deleteNurse, 
    deleteShift,
    getDepartment, 
    exportShiftsToCSV,
    toggleNurseSupervisorStatus,
    adminCredentials,
    updateAdminCredentials,
    changeNurseCredentials
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [viewingNurseShifts, setViewingNurseShifts] = useState<Nurse | null>(null);
  const [nurseToDelete, setNurseToDelete] = useState<Nurse | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftRecord | null>(null);

  // Admin Credentials Modal State
  const [isAdminCredsModalOpen, setIsAdminCredsModalOpen] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState(adminCredentials.id);
  const [adminPinInput, setAdminPinInput] = useState(adminCredentials.pin);
  const [confirmAdminPinInput, setConfirmAdminPinInput] = useState(adminCredentials.pin);
  const [showAdminPinInModal, setShowAdminPinInModal] = useState(false);
  const [showAdminPinCard, setShowAdminPinCard] = useState(false);
  const [adminCredsError, setAdminCredsError] = useState('');
  const [adminCredsSuccess, setAdminCredsSuccess] = useState('');
  const [showNursesPin, setShowNursesPin] = useState(true);

  // Google Sheets sync state
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isPushingToSheets, setIsPushingToSheets] = useState(false);
  const [pushToast, setPushToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Quick push to Google Sheets
  const handleQuickPushToSheets = async () => {
    let syncState = getSavedGoogleSyncState();

    // If not connected yet or token is missing, prompt to authorize Google
    if (!syncState.accessToken) {
      setIsPushingToSheets(true);
      setPushToast({
        type: 'info',
        text: 'کردنەوەی پەنجەرەی گووگڵ... تکایە هەژماری Googleەکەت پەسەند بکە بۆ نوێکردنەوەی شیتەکە.',
      });

      try {
        const targetEmail = syncState.userEmail || 'muhammad201498@gmail.com';
        const { accessToken: token, user } = await signInWithGoogle(targetEmail);
        const spreadsheetId = syncState.spreadsheetId || '1JLIc-54GHadPzASFX8Fw0BtrMZhxjPjhXarMbGsfnkU';

        const updatedState = {
          ...syncState,
          isConnected: true,
          accessToken: token,
          userEmail: user.email || targetEmail,
          spreadsheetId,
        };
        saveGoogleSyncState(updatedState);
        syncState = updatedState;
      } catch (authErr: any) {
        setIsPushingToSheets(false);
        setPushToast({
          type: 'error',
          text: 'گووگڵ داوای مۆڵەت (Sign In) دەکات بۆ دەستکاریکردنی فایلی سەر مۆبایلەکەت. تکایە لە پەنجەرەکە هەژمارەکەت هەڵبژێرە.',
        });
        setIsSheetsModalOpen(true);
        return;
      }
    }

    if (syncState.accessToken) {
      setIsPushingToSheets(true);
      setPushToast({ type: 'info', text: 'خەریکی ناردن و نوێکردنەوەی فایلی nurse time لە Google Sheets...' });
      try {
        const spreadsheetId = syncState.spreadsheetId || '1JLIc-54GHadPzASFX8Fw0BtrMZhxjPjhXarMbGsfnkU';
        await exportAllDataToGoogleDrive(syncState.accessToken, spreadsheetId, {
          departments,
          nurses,
          shifts,
        });
        setPushToast({ 
          type: 'success', 
          text: 'بەسەرکەوتوویی فایلی Google Sheets (nurse time) بە هەموو ئایدی و وشە نهێنییە نوێیەکان نوێکرایەوە!' 
        });
        setTimeout(() => setPushToast(null), 6000);
      } catch (err: any) {
        console.error('Push error:', err);
        setPushToast({ 
          type: 'error', 
          text: 'پەیوەندی لەگەڵ Google Drive پێویستی بە نوێکردنەوەیە. تکایە لە پەنجەرەکە دووبارە بەستنەوە بکە.' 
        });
        setIsSheetsModalOpen(true);
      } finally {
        setIsPushingToSheets(false);
      }
    }
  };

  // Form State
  const [customId, setCustomId] = useState('');
  const [pin, setPin] = useState('1234');
  const [fullNameKu, setFullNameKu] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [departmentIds, setDepartmentIds] = useState<string[]>([departments[0]?.id || '']);
  const [role, setRole] = useState<NurseRank>('registered_nurse');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const nursePhotoInputRef = useRef<HTMLInputElement>(null);
  const [maxMonthlyHours, setMaxMonthlyHours] = useState(160);
  const [notes, setNotes] = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [error, setError] = useState('');

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setError('');
      const compressed = await compressImageFile(file, 256);
      setAvatarUrl(compressed);
    } catch (err: any) {
      setError(err.message || 'هەڵە لە بارکردنی وێنە ڕوویدا');
    } finally {
      setIsUploadingPhoto(false);
      if (nursePhotoInputRef.current) nursePhotoInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setCustomId('');
    setPin('1234');
    setFullNameKu('');
    setFullNameEn('');
    setDepartmentId(departments[0]?.id || '');
    setDepartmentIds([departments[0]?.id || '']);
    setRole('registered_nurse');
    setPhone('');
    setEmail('');
    setAvatarUrl('');
    setMaxMonthlyHours(160);
    setNotes('');
    setIsSupervisor(false);
    setError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingNurse(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setCustomId(nurse.id);
    setPin(nurse.pin);
    setFullNameKu(nurse.fullNameKu);
    setFullNameEn(nurse.fullNameEn);
    setDepartmentId(nurse.departmentId);
    setDepartmentIds(
      nurse.departmentIds && nurse.departmentIds.length > 0
        ? nurse.departmentIds
        : [nurse.departmentId]
    );
    const isMohammad = isSystemAdminNurse(nurse);
    setRole(isMohammad ? 'head_nurse' : nurse.role);
    setPhone(nurse.phone);
    setEmail(nurse.email || '');
    setAvatarUrl(nurse.avatarUrl || '');
    setMaxMonthlyHours(isMohammad ? 0 : nurse.maxMonthlyHours);
    setNotes(nurse.notes || '');
    setIsSupervisor(isMohammad ? false : !!nurse.isSupervisor);
    setError('');
    setIsAddModalOpen(true);
  };

  const toggleDeptId = (dId: string) => {
    setDepartmentIds(prev => {
      if (prev.includes(dId)) {
        if (prev.length === 1) return prev; // Keep at least one
        const updated = prev.filter(id => id !== dId);
        setDepartmentId(updated[0]);
        return updated;
      } else {
        const updated = [...prev, dId];
        return updated;
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullNameKu.trim()) {
      setError('تکایە ناوی تەواوی پەرستار بنووسە');
      return;
    }
    const isMohammad = editingNurse ? isSystemAdminNurse(editingNurse) : false;
    if (!isMohammad && departmentIds.length === 0) {
      setError('تکایە بەلایەنی کەمەوە یەک بەش دیاریبکە');
      return;
    }

    const primaryDeptId = isMohammad ? 'admin' : (departmentIds[0] || departmentId);
    const cleanPin = pin.trim() || '1234';
    let targetOldId = '';
    let targetNewId = '';

    if (editingNurse) {
      targetOldId = editingNurse.id;
      targetNewId = customId.trim() ? customId.trim().toUpperCase() : editingNurse.id;

      // If ID changed, check if taken by another nurse
      if (targetNewId !== targetOldId) {
        const idTaken = nurses.some(n => n.id.toUpperCase() === targetNewId && n.id.toUpperCase() !== targetOldId);
        if (idTaken || targetNewId === 'ADMIN') {
          setError('ئەم ئایدییە پێشتر لە سیستەمدا بەکارهاتووە، تکایە دانەیەکی تر بنووسە');
          return;
        }
        changeNurseCredentials(targetOldId, targetNewId, cleanPin);
      }

      updateNurse(targetNewId, {
        id: targetNewId,
        fullNameKu,
        fullNameEn: fullNameEn || fullNameKu,
        departmentId: isMohammad ? 'admin' : primaryDeptId,
        departmentIds: isMohammad ? [] : departmentIds,
        role: isMohammad ? 'head_nurse' : role,
        phone,
        email: email.trim() || undefined,
        pin: cleanPin,
        maxMonthlyHours: isMohammad ? 0 : (Number(maxMonthlyHours) || 160),
        notes: isMohammad ? 'هێد نێرس (Head Nurse) و سەرپەرشتیاری گشتی' : (notes.trim() || undefined),
        isSupervisor: isMohammad ? false : isSupervisor,
      });
    } else {
      // Check if custom ID already exists
      if (customId && nurses.some(n => n.id.toUpperCase() === customId.trim().toUpperCase())) {
        setError('ئەم ئایدییە پێشتر لە سیستەمدا بەکارهاتووە!');
        return;
      }

      targetNewId = customId.trim() || `NUR-${Date.now().toString().slice(-4)}`;
      targetOldId = targetNewId;

      addNurse({
        customId: customId.trim() || undefined,
        pin: cleanPin,
        fullNameKu,
        fullNameEn: fullNameEn || fullNameKu,
        departmentId: primaryDeptId,
        departmentIds,
        role,
        phone: phone || '0750 000 0000',
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        maxMonthlyHours: Number(maxMonthlyHours) || 160,
        notes: notes.trim() || undefined,
        isSupervisor,
      });
    }

    setIsAddModalOpen(false);
    resetForm();

    // Instant direct sync to Google Sheets (nurse time)
    const syncState = getSavedGoogleSyncState();
    if (syncState.accessToken) {
      setPushToast({ 
        type: 'info', 
        text: `خەریکی ناردن و گۆڕینی ڕاستەوخۆ لەناو فایلی Google Sheets (nurse time)...` 
      });

      syncNurseCredentialsToGoogleSheet({
        oldId: targetOldId,
        newId: targetNewId,
        newPin: cleanPin,
        fullNameKu,
        fullNameEn: fullNameEn || fullNameKu,
        phone,
        role,
        allNurses: nurses,
        allDepartments: departments,
        allShifts: shifts,
      }).then((res) => {
        setPushToast({
          type: 'success',
          text: `بەسەرکەوتوویی لە ناو Google Sheets (nurse time) گۆڕدرا! ئایدی: ${targetNewId}، وشەی نهێنی: ${cleanPin}`,
        });
        setTimeout(() => setPushToast(null), 6000);
      }).catch((err: any) => {
        console.warn('Sync error:', err);
        setPushToast({
          type: 'error',
          text: 'زانیارییەکان لە ئەپەکە تۆمارکران. بۆ نوێکردنەوەی ناو شیتەکە، پەنجە لە دوگمەی سەوزی [ناردن بۆ Google Sheets] بدە.',
        });
        setTimeout(() => setPushToast(null), 6000);
      });
    } else {
      setPushToast({ 
        type: 'info', 
        text: `ئایدی (${targetNewId}) و وشەی نهێنی (${cleanPin}) لە ئەپەکە تۆمارکرا. بۆ گۆڕینی ڕاستەوخۆ لەناو Google Sheets، یەک جار پەنجە لە دوگمەی سەوزی سەرەوە بدە بۆ پەسەندکردنی گووگڵ.` 
      });
      setTimeout(() => setPushToast(null), 7000);
    }
  };

  const handleSaveAdminCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredsError('');
    setAdminCredsSuccess('');

    const cleanId = adminIdInput.trim().toUpperCase();
    const cleanPin = adminPinInput.trim();
    const cleanConfirm = confirmAdminPinInput.trim();

    if (!cleanId) {
      setAdminCredsError('تکایە ئایدی بەڕێوەبەر دیاری بکە');
      return;
    }
    if (!cleanPin) {
      setAdminCredsError('تکایە وشەی نهێنی (PIN) بنووسە');
      return;
    }
    if (cleanPin.length < 3) {
      setAdminCredsError('وشەی نهێنی دەبێت لانیکەم ٣ پیت یان ژمارە بێت');
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setAdminCredsError('وشەی نهێنی و دووبارەکردنەوەکەی وەک یەک نین!');
      return;
    }

    const oldAdminId = adminCredentials.id;
    updateAdminCredentials(cleanId, cleanPin);
    setAdminCredsSuccess('زانیارییەکانی بەڕێوەبەر بە سەرکەوتوویی نوێکرانەوە.');
    
    // Also sync admin to Google Sheets
    const syncState = getSavedGoogleSyncState();
    if (syncState.accessToken) {
      syncNurseCredentialsToGoogleSheet({
        oldId: oldAdminId,
        newId: cleanId,
        newPin: cleanPin,
        fullNameKu: 'بەڕێوەبەری سیستەم',
        role: 'head_nurse',
        allNurses: nurses,
        allDepartments: departments,
        allShifts: shifts,
      }).catch((err) => console.warn('Admin sync error:', err));
    }

    setTimeout(() => {
      setIsAdminCredsModalOpen(false);
      setAdminCredsSuccess('');
    }, 1500);
  };

  const filteredNurses = nurses.filter((nurse) => {
    if (selectedDeptFilter !== 'all' && isSystemAdminNurse(nurse)) {
      return false;
    }
    const assignedDepts = nurse.departmentIds && nurse.departmentIds.length > 0
      ? nurse.departmentIds
      : [nurse.departmentId];
    const matchesDept = selectedDeptFilter === 'all' || assignedDepts.includes(selectedDeptFilter);
    const matchesSearch = 
      nurse.fullNameKu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.fullNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.phone.includes(searchQuery);
    return matchesDept && matchesSearch;
  });

  const getRankName = (r: NurseRank) => {
    switch (r) {
      case 'head_nurse': return t.rankHeadNurse;
      case 'team_leader': return (t as any).rankTeamLeader || 'تیم لیدەر (Team Leader)';
      case 'senior_nurse': return t.rankSeniorNurse;
      case 'registered_nurse': return t.rankRegisteredNurse;
      case 'practical_nurse': return t.rankPracticalNurse;
      case 'trainee': return t.rankTrainee;
      default: return 'پەرستار';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>بەڕێوەبردنی ستافی پەرستاران ({nurses.length} پەرستار)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تۆمارکردن، پێدانی ئایدی و PIN تایبەت، دابەشکردن بەسەر بەشەکاندا
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">هەموو بەشەکان ({nurses.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.nameKu} ({nurses.filter(n => !isSystemAdminNurse(n) && (n.departmentId === d.id || (Array.isArray(n.departmentIds) && n.departmentIds.includes(d.id)))).length})
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان بەپێی ناو یان ئایدی..."
              className="pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 sm:w-56"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Google Sheets Sync Button */}
          <button
            type="button"
            onClick={handleQuickPushToSheets}
            disabled={isPushingToSheets}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-emerald-400/30 disabled:opacity-50"
            title="ناردن و نوێکردنەوەی تەواوی داتاکان لەناو فایلی Google Sheets (nurse time)"
          >
            {isPushingToSheets ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Google Sheets (nurse time)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addNewNurse}</span>
          </button>
        </div>
      </div>

      {/* Push status alert banner */}
      {pushToast && (
        <div className={`p-3.5 px-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-all ${
          pushToast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : pushToast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {pushToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : pushToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
            )}
            <span>{pushToast.text}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSheetsModalOpen(true)}
              className="px-2.5 py-1 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              کردنەوەی بەشی Sheets
            </button>
            <button 
              type="button" 
              onClick={() => setPushToast(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Security & Credentials Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-5 text-white shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">ئاسایش و دەستەڵاتی بەڕێوەبەر (Admin Security)</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                سیستەمی پارێزراو
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">ئایدی ئەدمین:</span>
                <strong className="text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800 font-bold">{adminCredentials.id}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">وشەی نهێنی (PIN):</span>
                <strong className="text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 font-bold">
                  {showAdminPinCard ? adminCredentials.pin : '••••'}
                </strong>
                <button
                  type="button"
                  onClick={() => setShowAdminPinCard(!showAdminPinCard)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title={showAdminPinCard ? 'شاردنەوە' : 'پیشاندان'}
                >
                  {showAdminPinCard ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-[11px] text-teal-200/90 hidden lg:inline">
                ئایدی و وشەی نهێنی هەر پەرستارێکیش لە خوارەوە بە تەواوی بۆت ڕوون و دیارە.
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleQuickPushToSheets}
            disabled={isPushingToSheets}
            className="px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer shadow-xs disabled:opacity-50"
            title="هاوکاتکردن و ناردنی داتاکان بۆ ناو فایلی Google Sheets"
          >
            {isPushingToSheets ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            <span>ناردن بۆ Google Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminIdInput(adminCredentials.id);
              setAdminPinInput(adminCredentials.pin);
              setConfirmAdminPinInput(adminCredentials.pin);
              setAdminCredsError('');
              setAdminCredsSuccess('');
              setIsAdminCredsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>گۆڕینی ئایدی و پاسۆردی ئەدمین</span>
          </button>
        </div>
      </div>

      {/* Mobile Nurses Cards (Visible on mobile screens) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredNurses.map((nurse) => {
          const dept = getDepartment(nurse.departmentId);
          const nurseApprovedShifts = shifts.filter(s => s.nurseId === nurse.id && s.status === 'approved');
          const totalHoursWorked = nurseApprovedShifts
            .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);

          return (
            <div key={nurse.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={nurse.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                    alt={nurse.fullNameKu}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">{nurse.fullNameKu}</span>
                      {nurse.isSupervisor && (
                        <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" title="بەرپرسی ستاف" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        ID: {nurse.id}
                      </span>
                      {dept && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {dept.nameKu}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">کۆدی چوونەژوورەوە (PIN)</span>
                  <span className="font-mono font-bold text-teal-700 text-sm tracking-wider">
                    {showNursesPin ? nurse.pin : '••••'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">کۆی کاتژمێری مانگ</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {totalHoursWorked} کاتژمێر
                  </span>
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingNurseShifts(nurse)}
                  className="py-2 px-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-teal-200/50"
                  title="بینینی شیفتەکان"
                >
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span className="text-[10px]">شیفتەکان</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(nurse)}
                  className="py-2 px-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-blue-200/50"
                  title="دەستکاریکردن"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px]">دەستکاری</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleNurseSupervisorStatus(nurse.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    nurse.isSupervisor 
                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="سەرپەرشتیار"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px]">سەرپەرشتیار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNurseToDelete(nurse)}
                  className="py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-rose-200"
                  title="سڕینەوەی پەرستار"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px]">سڕینەوە</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredNurses.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 text-xs border border-slate-200">
            هیچ پەرستارێک بەپێی ئەم فلتەرە نەدۆزرایەوە.
          </div>
        )}
      </div>

      {/* Nurses Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">پەرستار / ئایدی تایبەت</th>
                <th className="p-3.5">بەش</th>
                <th className="p-3.5">پلە و بەرپرسیاریەتی</th>
                <th className="p-3.5">پەیوەندی (تەلەفۆن)</th>
                <th className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <span>کۆدی نهێنی (PIN / Password)</span>
                    <button
                      type="button"
                      onClick={() => setShowNursesPin(!showNursesPin)}
                      className="text-slate-400 hover:text-slate-600"
                      title={showNursesPin ? 'شاردنەوەی PIN' : 'پیشاندانی PIN'}
                    >
                      {showNursesPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </th>
                <th className="p-3.5">کاتژمێری مانگانە</th>
                <th className="p-3.5 text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNurses.map((nurse) => {
                const dept = getDepartment(nurse.departmentId);
                const nurseApprovedShifts = shifts.filter(s => s.nurseId === nurse.id && s.status === 'approved');
                const nurseShiftsCount = nurseApprovedShifts.length;
                const totalHoursWorked = nurseApprovedShifts
                  .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
                const totalExtraHours = nurseApprovedShifts
                  .reduce((acc, curr) => acc + (Number(curr.extraHours) || 0), 0);

                return (
                  <tr key={nurse.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Nurse info & ID */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={nurse.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                          alt={nurse.fullNameKu}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">{nurse.fullNameKu}</span>
                            {nurse.isSupervisor && (
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" title="بەرپرسی ستاف" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              ID: {nurse.id}
                            </span>
                            <span className="text-[10px] text-slate-400">({nurse.joinedDate})</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-3.5">
                      {isSystemAdminNurse(nurse) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>سەرپەرشتیاری گشتی (سەرجەم بەشەکان)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center max-w-[180px]">
                          {(nurse.departmentIds && nurse.departmentIds.length > 0
                            ? nurse.departmentIds
                            : [nurse.departmentId]
                          )
                            .filter(dId => !!getDepartment(dId))
                            .map(dId => {
                              const d = getDepartment(dId);
                              return <DepartmentBadge key={dId} department={d} size="sm" />;
                            })}
                        </div>
                      )}
                    </td>

                    {/* Role & Supervisor Status */}
                    <td className="p-3.5">
                      {isSystemAdminNurse(nurse) ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            هێد نێرس (Head Nurse)
                          </span>
                          <span className="text-[10px] text-indigo-700 font-bold block">سەرپەرشتیاری گشتی</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-800 font-medium block">
                            {getRankName(nurse.role)}
                          </span>
                          {nurse.isSupervisor ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              تیم لیدەر (Team Leader)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">پەرستاری ئاسایی</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="p-3.5 font-mono text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{nurse.phone}</span>
                      </div>
                    </td>

                    {/* PIN */}
                    <td className="p-3.5">
                      <span className="font-mono bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-md text-xs border border-amber-200 shadow-2xs">
                        {showNursesPin ? nurse.pin : '••••'}
                      </span>
                    </td>

                    {/* Monthly Hours */}
                    <td className="p-3.5">
                      {isSystemAdminNurse(nurse) ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-indigo-900">سەرپەرشتیاری گشتی</span>
                          <span className="text-[10px] text-indigo-600 font-medium">دەسەڵاتی باڵا</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{totalHoursWorked}k</span>
                            <span className="text-[11px] text-slate-400">/ {nurse.maxMonthlyHours}k</span>
                          </div>
                          {totalExtraHours !== 0 && (
                            <span className={`text-[10px] font-mono font-bold ${
                              totalExtraHours > 0 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {totalExtraHours > 0 ? `+${totalExtraHours}h زیادە` : `${totalExtraHours}h کەمکردن`}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isSystemAdminNurse(nurse) ? (
                          <span 
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200" 
                            title="سەرپەرشتیاری گشتیی نەخۆشخانە (هێد نێرس)"
                          >
                            <Award className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleNurseSupervisorStatus(nurse.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              nurse.isSupervisor
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={nurse.isSupervisor ? 'لابردنی دەسەڵاتی تیم لیدەر' : 'پێدانی دەسەڵاتی تیم لیدەری بەش (Team Leader)'}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingNurseShifts(nurse)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="بینینی شیفتەکانی پەرستار"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(nurse)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="دەستکاریکردن"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {!isSystemAdminNurse(nurse) && (
                          <button
                            type="button"
                            onClick={() => setNurseToDelete(nurse)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="سڕینەوەی پەرستار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredNurses.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    هیچ پەرستارێک بەپێی ئەم فلتەرە نەدۆزرایەوە.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Nurse Shifts View Modal */}
      {viewingNurseShifts && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={viewingNurseShifts.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                  alt={viewingNurseShifts.fullNameKu}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    شیفتەکانی پەرستار: {viewingNurseShifts.fullNameKu} ({viewingNurseShifts.id})
                  </h3>
                  <p className="text-xs text-slate-500">
                    بەشی {getDepartment(viewingNurseShifts.departmentId)?.nameKu || 'بەش'} | کۆدی چوونەژوورەوە: {viewingNurseShifts.pin}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingNurseShifts(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {shifts.filter(s => s.nurseId === viewingNurseShifts.id).map((sh) => {
                const netHours = (Number(sh.hours) || 0) + (Number(sh.extraHours) || 0);
                return (
                  <div key={sh.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{sh.date}</span>
                      <span className="mr-2 font-medium text-slate-600 dark:text-slate-300">
                        ({sh.shiftType} - <strong className="font-bold text-slate-900 dark:text-slate-100">{netHours} کاتژمێر</strong>
                        {sh.extraHours ? (
                          sh.extraHours > 0 
                            ? <span className="text-amber-600 dark:text-amber-400 font-bold mr-1"> (+{sh.extraHours}h ئۆڤەرتایم، بنیات: {sh.hours}h)</span>
                            : <span className="text-rose-600 dark:text-rose-400 font-bold mr-1"> ({sh.extraHours}h سالیب، بنیات: {sh.hours}h)</span>
                        ) : ''})
                      </span>
                      {sh.patientBedRoom && <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">شوێن: {sh.patientBedRoom}</p>}
                      {sh.notes && <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">تێبینی: {sh.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        sh.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        sh.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sh.status === 'approved' ? 'پەسەندکراو' : sh.status === 'pending' ? 'چاوەڕوانکراو' : 'ڕەتکراوە'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShiftToDelete(sh)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="سڕینەوەی ئەم شیفتە"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {shifts.filter(s => s.nurseId === viewingNurseShifts.id).length === 0 && (
                <p className="text-center text-slate-500 text-xs py-8">هیچ شیفتێک بۆ ئەم پەرستارە تۆمار نەکراوە.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Nurse Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {editingNurse ? 'دەستکاریکردنی زانیاری پەرستار' : t.addNewNurse}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              {editingNurse && isSystemAdminNurse(editingNurse) && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-900">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-indigo-700" />
                  </div>
                  <div>
                    <div className="font-black text-xs text-indigo-950">
                      هەژماری هێد نێرس (Head Nurse): Mohammed Ziad Mohammed
                    </div>
                    <div className="text-[11px] text-indigo-700 mt-0.5">
                      ئەم هەژمارە سەرپەرشتیاری باڵای گشتیی نەخۆشخانەیە. پێگەی ئەم هەژمارە هێد نێرسە و بەڕێوەبەری سەرجەم بەشەکانە.
                    </div>
                  </div>
                </div>
              )}

              {/* Nurse Avatar / Photo Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    وێنەی پرۆفایلی پەرستار (Profile Photo)
                  </label>
                  <span className="text-[10px] text-slate-400">ئارەزوومەندانە</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={avatarUrl.trim() || DEFAULT_AVATAR}
                      alt="Avatar"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-teal-500 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => nursePhotoInputRef.current?.click()}
                      className="absolute -bottom-1 -left-1 p-1 bg-teal-600 hover:bg-teal-700 text-white rounded-full border border-white shadow-xs cursor-pointer"
                      title="بارکردنی وێنە"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      ref={nursePhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdminPhotoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => nursePhotoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-teal-600" />
                        <span>{isUploadingPhoto ? 'باردەکرێت...' : 'بارکردنی وێنە'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          سڕینەوە
                        </button>
                      )}
                    </div>

                    {/* Presets Row */}
                    <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1">
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>ئامادەکراو:</span>
                      </span>
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`w-7 h-7 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                            avatarUrl === preset.url ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-slate-200 hover:border-slate-400'
                          }`}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ئایدی تایبەتی (Nurse ID)
                  </label>
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="نموونە: NUR-109 (ئارەزوومەندانە)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">بە بەتاڵی بهێڵەوە بۆ ژمارەی خۆکار</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کۆدی نهێنی (PIN) بۆ داغڵبوون *
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    placeholder="نموونە: 1234"
                    maxLength={8}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ناوی تەواو (بە کوردی) *
                </label>
                <input
                  type="text"
                  value={fullNameKu}
                  onChange={(e) => setFullNameKu(e.target.value)}
                  required
                  placeholder="نموونە: هۆزان عوسمان حەمە"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>بەشەکان {editingNurse && isSystemAdminNurse(editingNurse) ? '' : '(دەتوانیت زیاتر لە بەشێک دیاریبکەیت بۆ پەرستار) *'}</span>
                  {!editingNurse || !isSystemAdminNurse(editingNurse) ? (
                    <span className="text-[11px] font-bold text-teal-700">
                      {departmentIds.length} بەش هەڵبژێردراوە
                    </span>
                  ) : null}
                </label>
                {editingNurse && isSystemAdminNurse(editingNurse) ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 flex items-center gap-2.5">
                    <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>سەرپەرشتیاری باڵای گشتییە و بەڕێوەبەری سەرجەم بەشەکانی نەخۆشخانەیە (تەرخاننەکراو بۆ تاکە بەشێک).</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-300 rounded-xl max-h-36 overflow-y-auto">
                    {departments.map(d => {
                      const isChecked = departmentIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDeptId(d.id)}
                          className={`p-2 rounded-lg border text-right text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="truncate">{d.nameKu}</span>
                          <span className="text-[10px] font-mono opacity-70">({d.code})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    پلە و پۆست (Designation)
                  </label>
                  {editingNurse && isSystemAdminNurse(editingNurse) ? (
                    <div className="w-full p-2.5 bg-indigo-50 border border-indigo-300 rounded-xl text-xs font-black text-indigo-950 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>{t.rankHeadNurse} (سەرپەرشتیاری باڵا)</span>
                    </div>
                  ) : (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as NurseRank)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="team_leader">{(t as any).rankTeamLeader || 'تیم لیدەر (Team Leader)'}</option>
                      <option value="senior_nurse">{t.rankSeniorNurse}</option>
                      <option value="registered_nurse">{t.rankRegisteredNurse}</option>
                      <option value="practical_nurse">{t.rankPracticalNurse}</option>
                      <option value="trainee">{t.rankTrainee}</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ژمارەی تەلەفۆن *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0770 000 0000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ئامانجی کاتژمێری مانگانە
                  </label>
                  <input
                    type="number"
                    value={maxMonthlyHours}
                    onChange={(e) => setMaxMonthlyHours(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {editingNurse && isSystemAdminNurse(editingNurse) ? (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div>دەسەڵاتی باڵای کارگێڕیی نەخۆشخانە (هێد نێرس)</div>
                    <div className="text-[10px] text-indigo-700 font-normal">ئەم هەژمارە سەرپەرشتیاری گشتییە و ڕاستەوخۆ دەسەڵاتی بەسەر تەواوی بەشەکاندا هەیە.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="supervisor-check"
                    checked={isSupervisor}
                    onChange={(e) => setIsSupervisor(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="supervisor-check" className="text-xs font-bold text-slate-700 cursor-pointer">
                    ئەم پەرستارە بەرپرسی ستافی بەشەکەیە (تیم لیدەر / Team Leader)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تێبینی یان پسپۆڕی
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="تێبینی دەربارەی تایبەتمەندی و تواناکان..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20"
                >
                  {editingNurse ? 'نوێکردنەوەی پەرستار' : 'تۆمارکردنی پەرستار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Credentials (ID & PIN) Modal */}
      {isAdminCredsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    گۆڕینی ئایدی و پاسۆردی بەڕێوەبەر
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    ڕێکخستن و پاراستنی هەژماری ئەدمینی نەخۆشخانە
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminCredsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminCreds} className="p-6 space-y-4 text-right">
              
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
                بەڕێوەبەری بەڕێز، لێرەدا دەتوانیت ئایدی ئەدمین و وشەی نهێنی نوێ دابنێیت. دوای گۆڕین دەتوانیت بە هەمان زانیاری لە لاپەڕەی چوونەژوورەوە داغڵ بیت.
              </div>

              {adminCredsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminCredsError}</span>
                </div>
              )}

              {adminCredsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminCredsSuccess}</span>
                </div>
              )}

              {/* Admin ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ئایدی بەڕێوەبەر (Admin ID)
                </label>
                <input
                  type="text"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  placeholder="وەک ADMIN یان A001"
                  required
                  className="w-full text-left px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono uppercase text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  dir="ltr"
                />
              </div>

              {/* Admin PIN Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  وشەی نهێنی نوێ (PIN / Password)
                </label>
                <div className="relative">
                  <input
                    type={showAdminPinInModal ? 'text' : 'password'}
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="نموونە: 7891"
                    required
                    maxLength={16}
                    className="w-full text-left pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPinInModal(!showAdminPinInModal)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminPinInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Admin PIN Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  دووبارەکردنەوەی وشەی نهێنی
                </label>
                <input
                  type={showAdminPinInModal ? 'text' : 'password'}
                  value={confirmAdminPinInput}
                  onChange={(e) => setConfirmAdminPinInput(e.target.value)}
                  placeholder="دووبارە وشە نهێنییەکە بنووسەوە"
                  required
                  maxLength={16}
                  className="w-full text-left px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdminCredsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  پەشیمانبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  پاشەکەوتکردن
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      {/* Delete Nurse Confirmation Modal */}
      {nurseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-black text-base text-slate-900 mb-2">
              دڵنیایت لە سڕینەوەی پەرستار؟
            </h3>
            <p className="text-center text-xs text-slate-600 mb-6 leading-relaxed">
              ئایا دڵنیایت لە سڕینەوەی <strong className="text-slate-900 font-bold">{nurseToDelete.fullNameKu}</strong> (ئایدی: <span className="font-mono font-bold text-teal-700">{nurseToDelete.id}</span>)؟
              ئەم پەرستارە بە تەواوی لە سیستەمەکە دەسڕدرێتەوە.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNurseToDelete(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteNurse(nurseToDelete.id);
                  setNurseToDelete(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer transition-all"
              >
                بەڵێ، پەرستار بسڕەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shift Confirmation Modal */}
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
              سڕینەوەی شیفتی بەرواری <span className="font-mono font-bold text-slate-900">{shiftToDelete.date}</span> بۆ پەرستار <strong className="text-slate-900">{shiftToDelete.nurseNameKu}</strong> (جۆری شیفت: {shiftToDelete.shiftType}).
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
