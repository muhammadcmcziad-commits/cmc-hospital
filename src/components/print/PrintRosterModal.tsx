import React, { useState } from 'react';
import { Printer, X, Building2, Calendar } from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { ShiftType } from '../../types';

export const PrintRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { t, departments, nurses, shifts, getDepartment } = useHospital();
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  if (!isOpen) return null;

  const currentYear = parseInt(selectedMonth.split('-')[0]);
  const currentMonth = parseInt(selectedMonth.split('-')[1]);
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const filteredNurses = selectedDeptId === 'all'
    ? nurses.filter(n => !isSystemAdminNurse(n))
    : nurses.filter(n => !isSystemAdminNurse(n) && (n.departmentId === selectedDeptId || (Array.isArray(n.departmentIds) && n.departmentIds.includes(selectedDeptId))));

  const handlePrint = () => {
    window.print();
  };

  const getShiftForDay = (nurseId: string, day: number): string => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const shift = shifts.find(s => s.nurseId === nurseId && s.date === dateStr && s.status === 'approved');
    if (!shift) return '-';
    if (shift.slotName) return shift.slotName;
    switch (shift.shiftType) {
      case 'morning': return 'بەیانی (6h)';
      case 'evening': return 'ئێوارە (6h)';
      case 'night': return 'شەو (12h)';
      case 'support_night': return 'پشتیوانی شەو (8h)';
      case 'support': return 'پشتیوانی (6h)';
      case 'on_call': return 'ئۆنکۆڵ';
      case 'full_day': return '24h';
      default: return 'کار';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              چاپکردنی خشتەی فەرمی شیفتەکانی نەخۆشخانە
            </h3>
            <p className="text-xs text-slate-500">
              خشتەی چاپکراو بۆ هەڵواسین لە بەشەکان و واژۆکردنی بەڕێوەبەر
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium px-3 py-2"
            >
              <option value="all">گشت بەشەکان</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.nameKu}</option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium px-3 py-2"
            />

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپکردن (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="p-4 bg-white text-slate-900 font-sans">
          
          {/* Official Letterhead */}
          <div className="text-center pb-4 border-b-2 border-slate-900 mb-6 flex items-center justify-between">
            <div className="text-right">
              <span className="font-bold text-xs text-slate-500 block">وەزارەتی تەندروستی</span>
              <span className="font-bold text-xs text-slate-700 block">بەڕێوەبەرایەتی گشتی تەندروستی</span>
              <span className="font-extrabold text-sm text-slate-900 block">نەخۆشخانەی فێرکاری</span>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center mx-auto mb-1 text-xl">
                +
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                خشتەی فەرمی دەوامی مانگانەی پەرستاران
              </h2>
              <span className="text-xs font-bold text-teal-800 font-mono">
                مانگی: {selectedMonth}
              </span>
            </div>

            <div className="text-left text-xs font-mono text-slate-600">
              <div>بەرواری دەرهێنان: {new Date().toLocaleDateString('en-CA')}</div>
              <div>بەش: {selectedDeptId === 'all' ? 'سەرجەم بەشەکان' : getDepartment(selectedDeptId)?.nameKu}</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse border border-slate-400 text-[11px]">
              <thead className="bg-slate-100 font-bold border-b border-slate-400">
                <tr>
                  <th className="border border-slate-400 p-2">ناوی پەرستار</th>
                  <th className="border border-slate-400 p-2 font-mono">ئایدی</th>
                  <th className="border border-slate-400 p-2">بەش</th>
                  {Array.from({ length: Math.min(15, daysInMonth) }).map((_, i) => (
                    <th key={i} className="border border-slate-400 p-1 text-center font-mono">
                      {i + 1}
                    </th>
                  ))}
                  <th className="border border-slate-400 p-2 font-mono text-center">کۆی کاتژمێر</th>
                </tr>
              </thead>
              <tbody>
                {filteredNurses.map((nurse) => {
                  const dept = getDepartment(nurse.departmentId);
                  const totalHrs = shifts
                    .filter(s => s.nurseId === nurse.id && s.date.startsWith(selectedMonth) && s.status === 'approved')
                    .reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);

                  return (
                    <tr key={nurse.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 font-bold">{nurse.fullNameKu}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold">{nurse.id}</td>
                      <td className="border border-slate-300 p-2">{dept?.nameKu}</td>
                      {Array.from({ length: Math.min(15, daysInMonth) }).map((_, i) => {
                        const shiftPill = getShiftForDay(nurse.id, i + 1);
                        return (
                          <td key={i} className="border border-slate-300 p-1 text-center font-mono text-[10px]">
                            {shiftPill}
                          </td>
                        );
                      })}
                      <td className="border border-slate-300 p-2 text-center font-mono font-black">{totalHrs}k</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-6 text-center text-xs font-bold text-slate-800">
            <div>
              <p className="mb-8">سەرپەرشتیاری شیفت / بەش</p>
              <div className="w-32 border-b border-slate-400 mx-auto"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">واژۆ و مۆر</span>
            </div>
            <div>
              <p className="mb-8">بەرپرسی بەڕێوەبردنی پەرستاری (Head of Nursing)</p>
              <div className="w-32 border-b border-slate-400 mx-auto"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">واژۆ و مۆر</span>
            </div>
            <div>
              <p className="mb-8">بەڕێوەبەری نەخۆشخانە (Medical Director)</p>
              <div className="w-32 border-b border-slate-400 mx-auto"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">واژۆ و مۆر</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
