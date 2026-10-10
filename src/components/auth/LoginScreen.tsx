import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCircle2, 
  KeyRound, 
  AlertCircle,
  Hospital,
  Eye,
  EyeOff,
  User,
  Shield
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const LoginScreen: React.FC = () => {
  const { loginAsNurse, loginAsAdmin } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'nurse' | 'admin'>('nurse');
  
  // Nurse login form
  const [nurseIdInput, setNurseIdInput] = useState('');
  const [nursePin, setNursePin] = useState('');
  const [showNursePassword, setShowNursePassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Admin login form
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Errors
  const [errorMessage, setErrorMessage] = useState('');

  const handleNurseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const idToUse = nurseIdInput.trim();
    if (!idToUse) {
      setErrorMessage('تکایە ئایدی پەرستار (Nurse ID) بنووسە');
      return;
    }

    const pinToUse = nursePin.trim();
    if (!pinToUse) {
      setErrorMessage('تکایە وشەی تێپەڕبوون (PIN) بنووسە');
      return;
    }

    const success = loginAsNurse(idToUse, pinToUse);
    if (!success) {
      setErrorMessage('ئایدی یان وشەی تێپەڕبوون (PIN) هەڵەیە. تکایە دڵنیابەرەوە لە دروستی زانیارییەکانت.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const idToUse = adminIdInput.trim();
    if (!idToUse) {
      setErrorMessage('تکایە ئایدی بەڕێوەبەر (Admin ID) بنووسە (وەک ADMIN یان A001)');
      return;
    }

    const pinToUse = adminPin.trim();
    if (!pinToUse) {
      setErrorMessage('تکایە وشەی نهێنی / پاسۆردی بەڕێوەبەر بنووسە');
      return;
    }

    const success = loginAsAdmin(idToUse, pinToUse);
    if (!success) {
      setErrorMessage('ئایدی یان پاسۆردی بەڕێوەبەر هەڵەیە. تکایە دڵنیابەرەوە لە ئایدی و وشەی نهێنی نوێکراوەت.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 bg-slate-100/60 dark:bg-slate-950 font-sans">
      
      {/* Hospital Official Branding Header */}
      <div className="max-w-md mx-auto w-full text-center pt-2 pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30 mb-3.5">
          <Hospital className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          نەخۆشخانەی تایبەتی CMC
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
          پۆڕتاڵی فەرمی پەرستاران و بەڕێوەبردنی شیفتەکان
        </p>
        <div className="mt-3.5 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* Portal Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('nurse');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'nurse'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>چوونەژوورەوەی پەرستار</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>بەڕێوەبەرایەتی (Admin)</span>
            </button>
          </div>

          <div className="p-6 sm:p-7">
            
            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nurse Login Form */}
            {activeTab === 'nurse' ? (
              <form onSubmit={handleNurseSubmit} className="space-y-4">
                
                <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200/70 dark:border-teal-800/50 text-teal-900 dark:text-teal-200 text-xs leading-relaxed">
                  پەرستاری بەڕێز، تکایە <strong>ئایدی تایبەتی خۆت</strong> و <strong>وشەی تێپەڕبوون (PIN)</strong> بنووسە بۆ چوونەژوورەوەی پارێزراو.
                </div>

                {/* Nurse ID Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ئایدی پەرستار (Nurse ID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nurseIdInput}
                      onChange={(e) => setNurseIdInput(e.target.value)}
                      placeholder="وەک T003، A003 یان ئایدییەکەت"
                      required
                      autoFocus
                      className="w-full text-left pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      dir="ltr"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Nurse PIN Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    کۆدی تێپەڕبوون / وشەی نهێنی (PIN)
                  </label>

                  <div className="relative">
                    <input
                      type={showNursePassword ? 'text' : 'password'}
                      value={nursePin}
                      onChange={(e) => setNursePin(e.target.value)}
                      placeholder="وشەی نهێنی تایبەت بە خۆت بنووسە"
                      required
                      maxLength={16}
                      className="w-full text-left pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono tracking-widest focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      dir="ltr"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNursePassword(!showNursePassword)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showNursePassword ? 'شاردنەوە' : 'پیشاندان'}
                    >
                      {showNursePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                    لەبیرم مەچۆ لەسەر ئەم ئامێرە
                  </label>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCircle2 className="w-4 h-4" />
                  <span>چوونەژوورەوە بۆ ئەژمارەکەم</span>
                </button>
              </form>
            ) : (
              /* Admin Login Form */
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-xs leading-relaxed">
                  <strong>بەشی بەڕێوەبەرایەتی گشتی:</strong> پێویستە ئایدی بەڕێوەبەر و پاسۆردی دیاریکراو بنووسیت بۆ چوونەژوورەوەی سەلامەت.
                </div>

                {/* Admin ID Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ئایدی بەڕێوەبەر (Admin ID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminIdInput}
                      onChange={(e) => setAdminIdInput(e.target.value)}
                      placeholder="وەک ADMIN یان A001"
                      required
                      autoFocus
                      className="w-full text-left pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      dir="ltr"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Admin Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وشەی نهێنی / پاسۆردی بەڕێوەبەر (Admin Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="پاسۆردی بەڕێوەبەر بنووسە"
                      required
                      className="w-full text-left pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      dir="ltr"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showAdminPassword ? 'شاردنەوە' : 'پیشاندان'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md shadow-purple-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>چوونەژوورەوەی بەڕێوەبەرایەتی</span>
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Hospital Departments Overview */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            سیستەمی لاوەکی شیفتات
          </p>
        </div>

      </div>

      <div />
    </div>
  );
};

