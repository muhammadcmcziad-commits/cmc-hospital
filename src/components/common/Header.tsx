import React, { useState } from 'react';
import { 
  Building2, 
  UserCircle2, 
  ShieldCheck, 
  LogOut, 
  Globe, 
  RefreshCw, 
  Sparkles,
  ChevronDown,
  Clock,
  CalendarCheck,
  FileSpreadsheet,
  Moon,
  Sun
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Language } from '../../types';
import { GoogleSheetsSyncModal } from '../admin/GoogleSheetsSyncModal';
import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC<{
  onOpenLoginModal?: () => void;
  onOpenLogShift?: () => void;
  onOpenPrintModal?: () => void;
}> = () => {
  const { 
    t, 
    language, 
    setLanguage, 
    theme,
    toggleTheme,
    currentRole, 
    currentNurse, 
    adminCredentials,
    nurses,
    logout, 
    loginAsAdmin, 
    loginAsNurse, 
    getDepartment, 
    resetAllData 
  } = useHospital();

  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);

  const assignedDeptNames = currentNurse
    ? (currentNurse.departmentIds && currentNurse.departmentIds.length > 0
        ? currentNurse.departmentIds
        : [currentNurse.departmentId]
      )
        .map(dId => getDepartment(dId)?.nameKu)
        .filter(Boolean)
        .join('، ')
    : '';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Hospital Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-600/20 dark:ring-teal-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight leading-tight">
                  {t.hospitalName}
                </h1>
                <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 hidden sm:inline-flex">
                  CareShift v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                {t.hospitalSub}
              </p>
            </div>
          </div>

          {/* Center / Role Badge */}
          <div className="hidden lg:flex items-center gap-3">
            {currentRole === 'admin' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold">Mohammed Ziad Mohammed</span>
                <span className="bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">Head Nurse</span>
              </div>
            )}

            {currentRole === 'nurse' && currentNurse && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800/60 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                <span className="font-bold">{currentNurse.fullNameKu}</span>
                <span className="font-mono bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[11px] px-1.5 py-0.5 rounded font-bold">{currentNurse.id}</span>
                {assignedDeptNames && (
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] border-r border-slate-300 dark:border-slate-700 pr-2">
                    {assignedDeptNames}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Install App Button */}
            <PWAInstallButton compact={true} />

            {/* Dark Mode / Night Shift Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
                  <span className="hidden sm:inline font-medium text-amber-300">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline font-medium text-slate-700">{t.darkMode}</span>
                </>
              )}
            </button>

            {/* Quick Demo Switcher Button - Strictly ADMIN ONLY */}
            {currentRole === 'admin' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowDemoMenu(!showDemoMenu);
                    setShowLangMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 rounded-lg transition-colors cursor-pointer"
                  title="گۆڕینی هەژمار بۆ تاقیکردنەوەی خێرا (تەنها بەڕێوەبەر)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden sm:inline">تاقیکردنەوەی خێرا</span>
                  <ChevronDown className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                </button>

                {showDemoMenu && (
                  <div className="absolute left-0 sm:right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                      {t.quickDemoLogin}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        loginAsAdmin(adminCredentials.id, adminCredentials.pin);
                        setShowDemoMenu(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors ${currentRole === 'admin' ? 'bg-purple-50 dark:bg-purple-950/70 font-bold text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Mohammed Ziad Mohammed (Admin)</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-1.5 py-0.5 rounded">{adminCredentials.id}</span>
                    </button>

                    <div className="px-3 py-1 text-[10px] text-slate-400 dark:text-slate-400 font-medium">پەرستاران بەپێی بەشەکان:</div>

                    <button
                      type="button"
                      onClick={() => {
                        const n = nurses.find(item => item.id === 'A003');
                        loginAsNurse('A003', n?.pin || '2233');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-slate-700 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span>Karwan karim (ER / Gen)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">T003 / A003</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const n = nurses.find(item => item.id === 'A002');
                        loginAsNurse('A002', n?.pin || '1122');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors text-slate-700 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span>Ishraq shukri (General)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">A002</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const n = nurses.find(item => item.id === 'A008' || item.id === 'E008');
                        loginAsNurse('A008', n?.pin || '11223344');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors text-slate-700 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        <span>Elaf Rajab (Cardiac / ER)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">E008 / A008</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const n = nurses.find(item => item.id === 'A029');
                        loginAsNurse('A029', n?.pin || '1419');
                        setShowDemoMenu(false);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors text-slate-700 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span>Helin Anwar (Ped / NICU)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">A029</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('دڵنیایت لە گەڕاندنەوەی سەرجەم داتاکان بۆ باری سەرەتا؟')) {
                            resetAllData();
                            setShowDemoMenu(false);
                          }
                        }}
                        className="w-full text-center py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t.resetDefaultData}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Google Drive & Sheets Sync Button - Strictly ADMIN ONLY */}
            {currentRole === 'admin' && (
              <button
                type="button"
                onClick={() => setShowSheetsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 rounded-lg transition-colors cursor-pointer"
                title="هاوکاتکردن و خەزنکردن لە Google Drive & Sheets (تەنها بەڕێوەبەر)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Google Drive & Sheets</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowDemoMenu(false);
                }}
                className="flex items-center gap-1 p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                title="Change Language"
              >
                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="uppercase font-mono text-xs">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('ku');
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${language === 'ku' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    کوردی (سۆرانی)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${language === 'en' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('ar');
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${language === 'ar' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    العربية
                  </button>
                </div>
              )}
            </div>

            {/* User Profile / Logout */}
            {currentRole ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 rounded-lg transition-colors cursor-pointer"
                  title={t.logout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.logout}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <UserCircle2 className="w-4 h-4 text-slate-400" />
                  <span>تکایە داخڵ بە</span>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {currentRole === 'admin' && (
        <GoogleSheetsSyncModal
          isOpen={showSheetsModal}
          onClose={() => setShowSheetsModal(false)}
        />
      )}
    </header>
  );
};

