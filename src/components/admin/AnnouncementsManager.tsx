import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Send
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { DepartmentBadge } from '../common/Badges';

export const AnnouncementsManager: React.FC = () => {
  const { 
    t, 
    notices, 
    departments, 
    addNotice, 
    deleteNotice, 
    getDepartment 
  } = useHospital();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [titleKu, setTitleKu] = useState('');
  const [contentKu, setContentKu] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('all');
  const [priority, setPriority] = useState<'urgent' | 'important' | 'info'>('important');
  const [authorNameKu, setAuthorNameKu] = useState('سەرپەرشتیاری گشتی نەخۆشخانە');
  const [error, setError] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleKu.trim() || !contentKu.trim()) {
      setError('تکایە ناونیشان و دەقی ئاگادارییەکە بنووسە');
      return;
    }

    addNotice({
      titleKu: titleKu.trim(),
      titleEn: titleKu.trim(),
      contentKu: contentKu.trim(),
      contentEn: contentKu.trim(),
      targetDepartmentId: targetDeptId,
      priority,
      authorNameKu: authorNameKu.trim() || 'بەڕێوەبەرایەتی',
    });

    setIsAddOpen(false);
    setTitleKu('');
    setContentKu('');
    setError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>{t.announcements} ({notices.length} ئاگاداری)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            بڵاوکردنەوەی بڕیار، گۆڕانکاری لە خشتە و ڕێنماییەکان بۆ سەرجەم بەشەکان یان بەشێکی تایبەت
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.postNotice}</span>
        </button>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {notices.map((notice) => {
          const targetDept = notice.targetDepartmentId !== 'all' ? getDepartment(notice.targetDepartmentId) : null;

          return (
            <div
              key={notice.id}
              className={`p-5 rounded-2xl border transition-all ${
                notice.priority === 'urgent'
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-850 shadow-xs'
                  : notice.priority === 'important'
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-850 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      notice.priority === 'urgent'
                        ? 'bg-rose-600 text-white'
                        : notice.priority === 'important'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {notice.priority === 'urgent' ? t.urgencyUrgent : notice.priority === 'important' ? t.urgencyImportant : t.urgencyInfo}
                  </span>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {notice.titleKu}
                  </h3>

                  {targetDept ? (
                    <DepartmentBadge department={targetDept} size="sm" />
                  ) : (
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                      گشت بەشەکان
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{notice.createdAt}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('دڵنیایت لە سڕینەوەی ئەم ئاگادارییە؟')) {
                        deleteNotice(notice.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    title="سڕینەوە"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {notice.contentKu}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>نووسەری فەرمان: <strong className="text-slate-800 dark:text-slate-200">{notice.authorNameKu}</strong></span>
              </div>
            </div>
          );
        })}

        {notices.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-12 text-center text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            هیچ ئاگادارییەک لە سیستەمدا نییە.
          </div>
        )}
      </div>

      {/* Post Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t.postNotice}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePost} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-850 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ناونیشانی ئاگاداری *
                </label>
                <input
                  type="text"
                  value={titleKu}
                  onChange={(e) => setTitleKu(e.target.value)}
                  required
                  placeholder="نموونە: ئاگاداری دەوامی شەوانی بەشی منداڵان"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    بەشی مەبەست
                  </label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">هەموو بەشەکانی نەخۆشخانە</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameKu}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    پلەی گرنگی
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="important">گرنگ (Important)</option>
                    <option value="urgent">بەپەلە (Urgent)</option>
                    <option value="info">زانیاری ئاسایی (Info)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  دەقی ڕوونکردنەوە و ڕێنماییەکان *
                </label>
                <textarea
                  value={contentKu}
                  onChange={(e) => setContentKu(e.target.value)}
                  required
                  rows={4}
                  placeholder="دەقی تەواوی ئاگادارییەکە لێرە بنووسە..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ناوی بڵاوکەرەوە / بەڕێوەبەر
                </label>
                <input
                  type="text"
                  value={authorNameKu}
                  onChange={(e) => setAuthorNameKu(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>بڵاوکردنەوە</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
