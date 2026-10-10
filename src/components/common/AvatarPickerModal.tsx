import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  RotateCcw, 
  Image as ImageIcon, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR, compressImageFile } from '../../data/avatarPresets';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  onSave: (newUrl: string) => void;
  title?: string;
  nurseName?: string;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSave,
  title = 'گۆڕینی وێنەی پرۆفایل',
  nurseName
}) => {
  const [selectedUrl, setSelectedUrl] = useState(currentAvatarUrl || DEFAULT_AVATAR);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentAvatarUrl || DEFAULT_AVATAR);
      setCustomUrlInput('');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, currentAvatarUrl]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const compressedDataUrl = await compressImageFile(file, 256);
      setSelectedUrl(compressedDataUrl);
      setSuccessMessage('وێنەکە بە سەرکەوتوویی بارکرا!');
    } catch (err: any) {
      setErrorMessage(err.message || 'هەڵە لە بارکردنی وێنە ڕوویدا');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    setSelectedUrl(customUrlInput.trim());
    setSuccessMessage('بەستەری وێنە جێبەجێکرا');
  };

  const handleResetToDefault = () => {
    setSelectedUrl(DEFAULT_AVATAR);
    setSuccessMessage('گەڕێندرایەوە بۆ وێنەی بنەڕەتی');
  };

  const handleSave = () => {
    onSave(selectedUrl || DEFAULT_AVATAR);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {title}
              </h3>
              {nurseName && (
                <p className="text-xs text-slate-500">
                  بۆ: <strong className="text-slate-800 font-semibold">{nurseName}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current / Selected Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative group">
              <img
                src={selectedUrl || DEFAULT_AVATAR}
                alt="پێشبینینی وێنەی پرۆفایل"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md ring-2 ring-teal-500/50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -left-2 p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md border-2 border-white transition-all cursor-pointer"
                title="بارکردنی وێنەی نوێ"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3">
              پێشبینینی وێنەی هەڵبژێردراو
            </p>
          </div>

          {/* Option 1: Upload from device */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-900">
              ١. بارکردنی وێنە لە مۆبایل یان کۆمپیوتەر
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-teal-50 hover:bg-teal-100/80 border border-dashed border-teal-300 rounded-xl text-teal-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-teal-600" />
              <span>
                {isProcessing ? 'وێنەکە باردەکرێت و ڕێکدەخرێت...' : 'کلیک بکە بۆ دیاریکردنی وێنە لە ئامێرەکەت'}
              </span>
            </button>
            <p className="text-[11px] text-slate-400">
              فۆرماتەکانی JPG, PNG, WEBP پشتگیری دەکرێن و بە خۆکاری قەبارەکەی بچووک دەکرێتەوە بۆ خێرایی و کارامەیی.
            </p>
          </div>

          {/* Option 2: Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-900">
                ٢. یان هەڵبژاردن لە وێنە ئامادەکراوەکانی کەرتی تەندروستی
              </label>
              <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ئامادەکراو</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(preset.url);
                      setSuccessMessage(`وێنەی ${preset.label} دیاریکرا`);
                    }}
                    className={`relative p-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1 group ${
                      isSelected 
                        ? 'border-teal-600 bg-teal-50 shadow-sm ring-2 ring-teal-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <span className="text-[10px] text-slate-600 group-hover:text-slate-900 text-center font-medium line-clamp-1">
                      {preset.label}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 left-1 w-4 h-4 bg-teal-600 text-white rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 3: Image URL */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              ٣. یان دانانی بەستەری ڕاستەوخۆ (Image URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!customUrlInput.trim()}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                جێبەجێکردن
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>وێنەی بنەڕەتی</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              پەشیمانبوونەوە
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>پاشەکەوتکردنی وێنە</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
