import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Database, 
  KeyRound, 
  Sparkles,
  Layers,
  Users,
  Calendar,
  X,
  Info,
  FolderOpen,
  Mail,
  ShieldCheck,
  HardDrive,
  CloudCheck,
  ArrowRight,
  LogOut,
  Share2,
  Copy
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { 
  extractSpreadsheetId, 
  fetchSpreadsheetData, 
  parseHospitalSpreadsheet, 
  exportToGoogleSheet,
  SyncProgress 
} from '../../services/googleSheetsService';
import {
  signInWithGoogle,
  disconnectGoogle,
  clearGoogleSyncState,
  requestGoogleToken,
  getGoogleUserProfile,
  getOrCreateDriveFolder,
  getOrCreateNurseTimeSpreadsheet,
  shareDriveFileWithEmail,
  exportAllDataToGoogleDrive,
  getSavedGoogleSyncState,
  saveGoogleSyncState,
  GoogleSyncState
} from '../../services/googleDriveService';

const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JLIc-54GHadPzASFX8Fw0BtrMZhxjPjhXarMbGsfnkU/edit?usp=drivesdk';
const PRIMARY_OWNER_EMAIL = 'muhammad201498@gmail.com';
const SHARED_PARTNER_EMAIL = 'muhammadcmcziad@gmail.com';

export const GoogleSheetsSyncModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { 
    currentRole,
    departments, 
    nurses, 
    shifts, 
    notices,
    bulkImportData,
    t 
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'drive' | 'manual'>('drive');
  const [syncState, setSyncState] = useState<GoogleSyncState>(getSavedGoogleSyncState());
  const [sheetUrl, setSheetUrl] = useState<string>(() => syncState.spreadsheetUrl || DEFAULT_SPREADSHEET_URL);
  const [accessToken, setAccessToken] = useState<string>(() => syncState.accessToken || '');
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [shareStatus, setShareStatus] = useState<{
    status: 'idle' | 'sharing' | 'success' | 'failed';
    message?: string;
  }>({ status: 'idle' });

  const [progress, setProgress] = useState<SyncProgress>({
    status: 'idle',
    message: '',
  });

  const [previewSummary, setPreviewSummary] = useState<{
    title?: string;
    departmentsCount: number;
    nursesCount: number;
    shiftsCount: number;
    rawRowsCount: number;
  } | null>(null);

  useEffect(() => {
    const saved = getSavedGoogleSyncState();
    setSyncState(saved);
    if (saved.spreadsheetUrl) setSheetUrl(saved.spreadsheetUrl);
    if (saved.accessToken) setAccessToken(saved.accessToken);
  }, [isOpen]);

  if (!isOpen || currentRole !== 'admin') return null;

  // 1-Click Connect to Google Drive with primary verified account
  const handleConnectGoogleDrive = async (forcedEmail?: string) => {
    setIsConnecting(true);
    const targetEmail = forcedEmail || PRIMARY_OWNER_EMAIL;
    setProgress({
      status: 'authorizing',
      message: `کردنەوەی پەنجەرەی Google... تکایە هەژماری ${targetEmail} هەڵبژێرە.`,
    });

    try {
      // 1. Sign in with Google
      const { accessToken: token, user } = await signInWithGoogle(targetEmail);
      setAccessToken(token);

      const email = user.email || targetEmail;
      const name = user.name || 'Admin';

      setProgress({
        status: 'syncing',
        message: 'دۆزینەوە یان دروستکردنی فۆڵدەری CareShift لەناو Google Drive...',
      });

      // 2. Find or create Hospital folder
      const folder = await getOrCreateDriveFolder(token, 'CareShift - CMC HOSPITAL');

      setProgress({
        status: 'syncing',
        message: 'ئامادەکردنی فایلی "nurse time" لە Google Sheets...',
      });

      // 3. Find or create "nurse time" spreadsheet in Drive
      const sheet = await getOrCreateNurseTimeSpreadsheet(token, folder.id, 'nurse time');
      setSheetUrl(sheet.url);

      const newState: GoogleSyncState = {
        isConnected: true,
        userEmail: email,
        userName: name,
        accessToken: token,
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.url,
        folderId: folder.id,
        folderName: folder.name,
        lastSyncedAt: new Date().toLocaleTimeString('ckb', { hour: '2-digit', minute: '2-digit' }),
        autoSyncEnabled: true,
      };

      setSyncState(newState);
      saveGoogleSyncState(newState);

      // 4. Automatically perform initial export to push current hospital data
      setProgress({
        status: 'exporting',
        message: 'خەزنکردنی هەموو داتاکان (پەرستاران، شیفتەکان، بەشەکان) لە Google Drive...',
      });

      await exportAllDataToGoogleDrive(token, sheet.id, {
        departments,
        nurses,
        shifts,
        notices,
      });

      // 5. Automatically share the spreadsheet with muhammadcmcziad@gmail.com
      try {
        const shareRes = await shareDriveFileWithEmail(token, sheet.id, SHARED_PARTNER_EMAIL, 'writer');
        if (shareRes.success) {
          setShareStatus({
            status: 'success',
            message: `فایلەکە بە سەرکەوتوویی لەگەڵ ${SHARED_PARTNER_EMAIL} هاوبەش کرا (Editor).`,
          });
        } else {
          setShareStatus({
            status: 'failed',
            message: shareRes.message,
          });
        }
      } catch (shareErr) {
        console.warn('Auto share error:', shareErr);
      }

      setProgress({
        status: 'success',
        message: `بە سەرکەوتوویی لەگەڵ هەژماری (${email}) بەستراوە! فایلی "nurse time" لە درایڤ خەزنکرا.`,
      });
    } catch (err: any) {
      console.error('Drive connection error:', err);
      setProgress({
        status: 'error',
        message: err?.message || 'هەڵەیەک لە کاتی بەستنەوە بە Google Drive ڕوویدا.',
        details: `تکایە پەنجەرەی گووگڵ پەسەند بکە.`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect / Clear previous connected account
  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await disconnectGoogle();
      const emptyState: GoogleSyncState = {
        isConnected: false,
        userEmail: null,
        userName: null,
        accessToken: null,
        spreadsheetId: null,
        spreadsheetUrl: null,
        folderId: null,
        folderName: null,
        lastSyncedAt: null,
        autoSyncEnabled: false,
      };
      setSyncState(emptyState);
      setAccessToken('');
      setShareStatus({ status: 'idle' });
      setProgress({
        status: 'idle',
        message: 'هەژماری پێشوو سڕایەوە.',
      });
    } catch (err: any) {
      console.error('Disconnect error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Manual Share with muhammadcmcziad@gmail.com
  const handleManualShare = async () => {
    const targetSpreadsheetId = syncState.spreadsheetId || extractSpreadsheetId(sheetUrl);
    const targetToken = syncState.accessToken || accessToken;
    if (!targetSpreadsheetId || !targetToken) {
      setProgress({
        status: 'error',
        message: 'تکایە سەرەتا بەستنەوە بە Google ئەنجام بدە.',
      });
      return;
    }

    setIsSharing(true);
    try {
      const shareRes = await shareDriveFileWithEmail(targetToken, targetSpreadsheetId, SHARED_PARTNER_EMAIL, 'writer');
      if (shareRes.success) {
        setShareStatus({
          status: 'success',
          message: `فایلی "nurse time" بە سەرکەوتوویی لەگەڵ ${SHARED_PARTNER_EMAIL} هاوبەش کرا (Editor).`,
        });
      } else {
        setShareStatus({
          status: 'failed',
          message: shareRes.message || 'گووگڵ مۆڵەتی ناردنی ڕاستەوخۆی نەدا. تکایە لە گووگڵ شیتس بە دەست دابنێ.',
        });
      }
    } catch (err: any) {
      setShareStatus({
        status: 'failed',
        message: err?.message || 'هەڵە لە ناردنی داواکاری هاوبەشکردن.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyPartnerEmail = () => {
    navigator.clipboard.writeText(SHARED_PARTNER_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Export all current hospital data to connected Google Drive Sheet
  const handleExportToConnectedDrive = async () => {
    const targetSpreadsheetId = syncState.spreadsheetId || extractSpreadsheetId(sheetUrl);
    const targetToken = syncState.accessToken || accessToken;

    if (!targetSpreadsheetId) {
      setProgress({
        status: 'error',
        message: 'تکایە سەرەتا فایلی Google Sheet دیاری بکە یان بەستنەوەی Google Drive ئەنجام بدە.',
      });
      return;
    }

    setProgress({
      status: 'exporting',
      message: 'خەزنکردن و نوێکردنەوەی تەواوی داتاکانی نەخۆشخانە لەناو Google Drive...',
    });

    try {
      if (targetToken) {
        await exportAllDataToGoogleDrive(targetToken, targetSpreadsheetId, {
          departments,
          nurses,
          shifts,
          notices,
        });
      } else {
        await exportToGoogleSheet(targetSpreadsheetId, '', nurses, departments, shifts);
      }

      const syncTime = new Date().toLocaleTimeString('ckb', { hour: '2-digit', minute: '2-digit' });
      const updated = {
        ...syncState,
        lastSyncedAt: syncTime,
      };
      setSyncState(updated);
      saveGoogleSyncState(updated);

      setProgress({
        status: 'success',
        message: `سەرجەم داتاکان (${nurses.length} پەرستار، ${shifts.length} شیفت، ${departments.length} بەش) بەسەرکەوتوویی لە Google Drive خەزن کران لە کاتژمێر ${syncTime}!`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setProgress({
        status: 'error',
        message: err?.message || 'نەتوانرا داتاکان هەناردەی Google Drive بکرێن.',
      });
    }
  };

  // Import / Sync from Google Sheets
  const handleFetchAndPreview = async () => {
    const targetSpreadsheetId = syncState.spreadsheetId || extractSpreadsheetId(sheetUrl);
    const targetToken = syncState.accessToken || accessToken;

    if (!targetSpreadsheetId) {
      setProgress({
        status: 'error',
        message: 'تکایە بەستەری Google Sheet بنووسە یان ئایدی فایلەکە.',
      });
      return;
    }

    setProgress({
      status: 'fetching',
      message: 'هێنانی نوێترین داتاکان لە Google Sheets و فایلی "nurse time"...',
    });

    try {
      const result = await fetchSpreadsheetData(targetSpreadsheetId, targetToken);
      const parsed = parseHospitalSpreadsheet(result.sheets, departments, nurses);

      setPreviewSummary({
        title: result.title,
        departmentsCount: parsed.departments.length,
        nursesCount: parsed.nurses.length,
        shiftsCount: parsed.shifts.length,
        rawRowsCount: parsed.rawRowsCount,
      });

      bulkImportData({
        departments: parsed.departments,
        nurses: parsed.nurses,
        shifts: parsed.shifts,
      });

      const syncTime = new Date().toLocaleTimeString('ckb', { hour: '2-digit', minute: '2-digit' });
      const updated = { ...syncState, lastSyncedAt: syncTime };
      setSyncState(updated);
      saveGoogleSyncState(updated);

      setProgress({
        status: 'success',
        message: `هاوردەکردن و هاوکاتکردن تەواو بوو! ${parsed.nurses.length} پەرستار و ${parsed.shifts.length} شیفت لە Google Drive هاتنە ناو سیستەم.`,
      });
    } catch (err: any) {
      console.error('Error syncing with Google Sheets:', err);
      setProgress({
        status: 'error',
        message: err?.message || 'هەڵەیەک ڕوویدا لە کاتی پەیوەندیکردن بە Google Sheets.',
        details: 'دڵنیابەرەوە لە پەسەندکردنی مۆڵەتەکە یان بەستنەوەی هەژماری Google Drive.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 backdrop-blur-xs border border-white/10 shadow-inner">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>بەستنەوە بە Google Drive & Sheets</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Live Cloud Sync
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80">
                خەزنکردنی هەمیشەیی خشتەی دەوام لە فایلی "nurse time" و هاوبەشکردن بۆ هەردوو هەژمارەکە
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CloudCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>بەستنەوەی ڕاستەوخۆی Google Drive (پێشنیارکراو)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>بەستەری دەستی (Manual Sheet URL)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Active Live Stats */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 text-center">
            <div className="p-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">بەشەکان</span>
              <span className="font-mono text-lg font-black text-slate-800 dark:text-slate-100">{departments.length}</span>
            </div>
            <div className="p-1.5 border-r border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">پەرستاران</span>
              <span className="font-mono text-lg font-black text-teal-700 dark:text-teal-400">{nurses.length}</span>
            </div>
            <div className="p-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">شیفتەکان</span>
              <span className="font-mono text-lg font-black text-indigo-700 dark:text-indigo-400">{shifts.length}</span>
            </div>
          </div>

          {activeTab === 'drive' ? (
            /* Google Drive Direct Integration Tab */
            <div className="space-y-4">
              
              {/* Account Connection Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-indigo-50/50 dark:from-teal-950/30 dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono">{syncState.isConnected && syncState.userEmail ? syncState.userEmail : PRIMARY_OWNER_EMAIL}</span>
                        {syncState.isConnected ? (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            بە سەرکەوتوویی بەستراوەتەوە
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            هەژماری ڕێگەپێدراوی کلاود
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {syncState.isConnected
                          ? (syncState.lastSyncedAt ? `دواین هاوکاتکردن: ${syncState.lastSyncedAt}` : 'بە سەرکەوتوویی لەگەڵ درایڤ بەستراوە')
                          : `هەژماری سەرەکی بۆ خەزنکردن: ${PRIMARY_OWNER_EMAIL}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {syncState.isConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={isConnecting}
                        title="دەرچوون لەم هەژمارە"
                        className="px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>سڕینەوەی بەستنەوە</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleConnectGoogleDrive(PRIMARY_OWNER_EMAIL)}
                      disabled={isConnecting}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>
                        {syncState.isConnected 
                          ? 'نوێکردنەوەی بەستنەوە' 
                          : `بەستنەوە بە ${PRIMARY_OWNER_EMAIL}`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Connected Spreadsheet and Folder Info */}
                {syncState.spreadsheetUrl && (
                  <div className="pt-3 border-t border-teal-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold">فایلی ئامادەکراو:</span>
                      <span className="font-mono text-teal-800 dark:text-teal-300 font-bold bg-teal-100/60 dark:bg-teal-900/60 px-2 py-0.5 rounded">nurse time</span>
                    </div>
                    <a
                      href={syncState.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 dark:text-teal-400 hover:underline font-bold flex items-center gap-1.5 text-xs bg-white/80 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 self-start sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>کردنەوە لە Google Sheets</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Dedicated Partner Sharing Card for muhammadcmcziad@gmail.com */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>هاوبەشکردنی شیت لەگەڵ:</span>
                        <span className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/60 px-2 py-0.5 rounded font-bold">
                          {SHARED_PARTNER_EMAIL}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        بۆ ئەوەی هەژماری دووەمیشت بتوانێت دەستکاری فایلی <strong>"nurse time"</strong> بکات، مۆڵەتەکەی پێدەبەخشین.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPartnerEmail}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="کۆپیکردنی ئیمەیڵەکە"
                  >
                    {copiedEmail ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400">کۆپیکرا!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>کۆپیکردنی ئیمەیڵ</span>
                      </>
                    )}
                  </button>
                </div>

                {shareStatus.message && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    shareStatus.status === 'success'
                      ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                  }`}>
                    {shareStatus.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <span>{shareStatus.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualShare}
                    disabled={isSharing || !syncState.isConnected}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSharing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>ناردنی مۆڵەت (Share) بۆ {SHARED_PARTNER_EMAIL}</span>
                  </button>

                  {syncState.spreadsheetUrl && (
                    <a
                      href={syncState.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-800 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>کردنەوە لە Google Sheets و کلیک لە Share</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                </div>
              </div>

              {/* Action buttons inside Drive tab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportToConnectedDrive}
                  disabled={progress.status === 'exporting' || progress.status === 'fetching' || isConnecting}
                  className="p-3.5 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-900 dark:text-teal-200 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="text-right">
                    <span className="font-black text-xs block flex items-center gap-1.5">
                      <ArrowUpFromLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>خەزنکردن لە Google Drive</span>
                    </span>
                    <span className="text-[10px] text-teal-700/80 dark:text-teal-400">
                      ناردنی هەموو شیفتەکان و پەرستاران
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:translate-x-[-3px] transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleFetchAndPreview}
                  disabled={progress.status === 'exporting' || progress.status === 'fetching' || isConnecting}
                  className="p-3.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="text-right">
                    <span className="font-black text-xs block flex items-center gap-1.5">
                      <ArrowDownToLine className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>هاوردەکردن لە Drive</span>
                    </span>
                    <span className="text-[10px] text-indigo-700/80 dark:text-indigo-400">
                      هێنانی داتای نوێی ناو فایلی شیت
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-[-3px] transition-transform" />
                </button>
              </div>

            </div>
          ) : (
            /* Manual URL & Token Tab */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>بەستەری خشتەی گووگڵ (Google Sheet URL):</span>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold flex items-center gap-1"
                  >
                    <span>کردنەوە لە پەڕەیەکی تر</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full text-left font-mono text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span>OAuth Access Token (ئارەزوومەندانە):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold cursor-pointer"
                  >
                    {showTokenHelp ? 'داخستنی ڕێنمایی' : 'ڕێنمایی کلیل'}
                  </button>
                </div>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ya29.a0AfH6..."
                  className="w-full text-left font-mono text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100"
                  dir="ltr"
                />
                {showTokenHelp && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <p className="text-[11px] leading-relaxed">
                      کاتێک لە بەشی سەرەوە «بەستنەوە لەگەڵ Google» دەکەیت، تۆکن و شیتەکە خۆکارانە دادەنرێت و پێویست بە دەستکاری ناکات.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Message */}
          {progress.status !== 'idle' && (
            <div
              className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                progress.status === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : progress.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              {progress.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : progress.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{progress.message}</p>
                {progress.details && <p className="text-[11px] opacity-80">{progress.details}</p>}
              </div>
            </div>
          )}

          {/* Preview of Imported Content */}
          {previewSummary && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>پوختەی داتاکانی خشتەکە: {previewSummary.title}</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">پەرستاران</span>
                  <span className="font-bold font-mono">{previewSummary.nursesCount} کەس</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">شیفتەکان</span>
                  <span className="font-bold font-mono">{previewSummary.shiftsCount} تۆمار</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">کۆی ڕیزەکان</span>
                  <span className="font-bold font-mono">{previewSummary.rawRowsCount} ڕیز</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            داخستن
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportToConnectedDrive}
              disabled={progress.status === 'exporting' || progress.status === 'fetching' || isConnecting}
              className="px-4 py-2.5 text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-950/80 hover:bg-teal-200 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowUpFromLine className="w-4 h-4 text-teal-700 dark:text-teal-300" />
              <span>هەناردەکردن بۆ Drive</span>
            </button>

            <button
              type="button"
              onClick={handleFetchAndPreview}
              disabled={progress.status === 'fetching' || progress.status === 'exporting' || isConnecting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>هاوردەکردن و هاوکاتکردن</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
