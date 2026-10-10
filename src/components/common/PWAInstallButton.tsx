import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2, X, Share, PlusSquare, HelpCircle, Layers } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running inside standalone app mode
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>ئەپی دامەزراو</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        title="دامەزراندنی ئەپ وەک بەرنامەی مۆبایل"
        className={`inline-flex items-center gap-2 font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
          compact
            ? 'px-3 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20'
            : 'px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-900/10'
        }`}
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>دابەزاندنی ئەپ</span>
        <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
          APK / PWA
        </span>
      </button>

      {/* Guide Modal for iOS or manual setup */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            {/* Close button */}
            <button
              onClick={() => setShowGuide(false)}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  دامەزراندنی CMC HOSPITAL لە مۆبایل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  چۆن وەک ئەپێکی ئاسایی بخرێتە سەر شاشەی مۆبایلەکەت
                </p>
              </div>
            </div>

            {/* Steps according to OS */}
            {isIOS ? (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  📱 بۆ مۆبایلی ئایفۆن (iOS / Safari):
                </p>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                  <span>لە خوارەوەی وێبگەڕی Safari دوگمەی <strong>Share</strong> (<Share className="w-3.5 h-3.5 inline mx-1 text-teal-600" />) دابگرە.</span>
                </div>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                  <span>کەمێک بۆ خوارەوە بڕۆ و هەڵبژاردنی <strong>Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-1 text-teal-600" />) لێبدە.</span>
                </div>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                  <span>ئایکۆنی CMC HOSPITAL دەکەوێتە سەر شاشەی مۆبایلەکەت وەک هەر ئەپێکی ئاسایی.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  📱 بۆ مۆبایلی ئەندرۆید (Android / Chrome):
                </p>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                  <span>لە بەشی سەرەوەی Chrome سێ خاڵەکە (⋮) دابگرە.</span>
                </div>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                  <span>هەڵبژاردنی <strong>Install app</strong> یان <strong>Add to Home screen</strong> دابگرە.</span>
                </div>
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                  <span>ئەپەکە ڕاستەوخۆ دادەمەزرێت و فول سکرین دەبێتەوە وەک ئەپی Play Store.</span>
                </div>
              </div>
            )}

            {/* Explanation about APK & Google Play */}
            <div className="mt-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/50 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              <span className="font-bold block mb-1">📦 دەتەوێت فایلی فەرمی APK هەبێت؟</span>
              دەتوانیت لە ڕێگەی ماڵپەڕی فەرمی <strong>PWABuilder.com</strong> تەنها ئەم لینکە دابنێیت بۆ ئەوەی بە یەک کلیک فایلی <strong>.apk</strong> بۆ گووگڵ پلەی ستۆر یاخود بۆ مۆبایل ئامادە بکات!
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                تێگەیشتم، داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
