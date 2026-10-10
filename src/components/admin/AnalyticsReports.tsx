import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  Users, 
  Building2, 
  FileSpreadsheet, 
  Award,
  Calendar,
  Search,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Layers,
  FileText
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { DepartmentBadge, ShiftTypeBadge, StatusBadge } from '../common/Badges';
import { ShiftRecord, ShiftType, ShiftStatus } from '../../types';

type ViewMode = 'summary' | 'detailed';
type SortField = 'id' | 'name' | 'dept' | 'morning' | 'evening' | 'night' | 'totalShifts' | 'hours' | 'overtime' | 'date';
type SortOrder = 'asc' | 'desc';

export const AnalyticsReports: React.FC = () => {
  const { 
    t, 
    departments, 
    nurses, 
    shifts, 
    getDepartment 
  } = useHospital();

  // Filters State
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [allMonths, setAllMonths] = useState<boolean>(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedNurseId, setSelectedNurseId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('approved'); // 'all' | 'approved' | 'pending'
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('hours');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Copy state feedback
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Filtered raw shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      // Month filter
      if (!allMonths && selectedMonth && !shift.date.startsWith(selectedMonth)) {
        return false;
      }

      // Department filter
      if (selectedDeptId !== 'all' && shift.departmentId !== selectedDeptId) {
        return false;
      }

      // Nurse filter
      if (selectedNurseId !== 'all' && shift.nurseId !== selectedNurseId) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && shift.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nurse = nurses.find(n => n.id === shift.nurseId);
        const dept = getDepartment(shift.departmentId);
        const matchName = (shift.nurseNameKu || nurse?.fullNameKu || '').toLowerCase().includes(query);
        const matchId = shift.nurseId.toLowerCase().includes(query);
        const matchDept = (dept?.nameKu || '').toLowerCase().includes(query) || (dept?.code || '').toLowerCase().includes(query);
        const matchDate = shift.date.includes(query);
        const matchRoom = (shift.patientBedRoom || '').toLowerCase().includes(query);
        const matchNotes = (shift.notes || '').toLowerCase().includes(query);
        if (!matchName && !matchId && !matchDept && !matchDate && !matchRoom && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [shifts, selectedMonth, allMonths, selectedDeptId, selectedNurseId, selectedStatus, searchQuery, nurses, getDepartment]);

  // 2. Summary per nurse calculations
  const nurseSummaryList = useMemo(() => {
    // Determine which nurses to show:
    // If a specific nurse is selected, filter by that nurse.
    // If a specific department is selected, filter nurses assigned to that department.
    let eligibleNurses = nurses.filter(n => !isSystemAdminNurse(n));
    if (selectedNurseId !== 'all') {
      eligibleNurses = eligibleNurses.filter(n => n.id === selectedNurseId);
    }
    if (selectedDeptId !== 'all') {
      eligibleNurses = eligibleNurses.filter(n => 
        n.departmentId === selectedDeptId || (Array.isArray(n.departmentIds) && n.departmentIds.includes(selectedDeptId))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      eligibleNurses = eligibleNurses.filter(n => 
        n.fullNameKu.toLowerCase().includes(q) || 
        n.id.toLowerCase().includes(q) ||
        n.phone.includes(q)
      );
    }

    return eligibleNurses.map((nurse) => {
      const nurseShifts = filteredShifts.filter(s => s.nurseId === nurse.id);
      const totalHours = nurseShifts.reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
      const extraHoursNet = nurseShifts.reduce((acc, curr) => acc + (Number(curr.extraHours) || 0), 0);
      const morningCount = nurseShifts.filter(s => s.shiftType === 'morning').length;
      const eveningCount = nurseShifts.filter(s => s.shiftType === 'evening').length;
      const nightCount = nurseShifts.filter(s => s.shiftType === 'night' || s.shiftType === 'support_night').length;
      const otherCount = nurseShifts.filter(s => s.shiftType !== 'morning' && s.shiftType !== 'evening' && s.shiftType !== 'night' && s.shiftType !== 'support_night').length;
      const totalShiftsCount = nurseShifts.length;
      
      const targetHours = nurse.maxMonthlyHours || 160;
      const overtime = Math.max(0, totalHours - targetHours);
      const completionPercent = Math.min(100, Math.round((totalHours / targetHours) * 100));

      const primaryDept = getDepartment(nurse.departmentId);
      const allDepts = (nurse.departmentIds || [nurse.departmentId])
        .map(dId => getDepartment(dId))
        .filter(Boolean);

      return {
        nurse,
        primaryDept,
        allDepts,
        morningCount,
        eveningCount,
        nightCount,
        otherCount,
        totalShiftsCount,
        totalHours,
        extraHoursNet,
        targetHours,
        overtime,
        completionPercent,
      };
    });
  }, [nurses, filteredShifts, selectedNurseId, selectedDeptId, searchQuery, getDepartment]);

  // 3. Sorted summary list
  const sortedSummaryList = useMemo(() => {
    return [...nurseSummaryList].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'id':
          valA = a.nurse.id;
          valB = b.nurse.id;
          break;
        case 'name':
          valA = a.nurse.fullNameKu;
          valB = b.nurse.fullNameKu;
          break;
        case 'dept':
          valA = a.primaryDept?.nameKu || '';
          valB = b.primaryDept?.nameKu || '';
          break;
        case 'morning':
          valA = a.morningCount;
          valB = b.morningCount;
          break;
        case 'evening':
          valA = a.eveningCount;
          valB = b.eveningCount;
          break;
        case 'night':
          valA = a.nightCount;
          valB = b.nightCount;
          break;
        case 'totalShifts':
          valA = a.totalShiftsCount;
          valB = b.totalShiftsCount;
          break;
        case 'hours':
          valA = a.totalHours;
          valB = b.totalHours;
          break;
        case 'overtime':
          valA = a.overtime;
          valB = b.overtime;
          break;
        default:
          valA = a.totalHours;
          valB = b.totalHours;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [nurseSummaryList, sortField, sortOrder]);

  // 4. Sorted detailed shifts list
  const sortedDetailedShifts = useMemo(() => {
    return [...filteredShifts].sort((a, b) => {
      if (sortField === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      }
      if (sortField === 'hours') {
        const hA = (Number(a.hours) || 0) + (Number(a.extraHours) || 0);
        const hB = (Number(b.hours) || 0) + (Number(b.extraHours) || 0);
        return sortOrder === 'asc' ? hA - hB : hB - hA;
      }
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.nurseNameKu.localeCompare(b.nurseNameKu) : b.nurseNameKu.localeCompare(a.nurseNameKu);
      }
      // Default sort by date desc, then start time
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.startTime.localeCompare(a.startTime);
    });
  }, [filteredShifts, sortField, sortOrder]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // KPIs
  const totalFilteredHours = useMemo(() => {
    return filteredShifts.reduce((acc, curr) => acc + (Number(curr.hours) || 0) + (Number(curr.extraHours) || 0), 0);
  }, [filteredShifts]);

  const totalFilteredShifts = filteredShifts.length;
  
  const activeNursesCount = useMemo(() => {
    const activeIds = new Set(filteredShifts.map(s => s.nurseId));
    return activeIds.size;
  }, [filteredShifts]);

  const totalOvertimeHours = useMemo(() => {
    return nurseSummaryList.reduce((acc, curr) => acc + curr.overtime, 0);
  }, [nurseSummaryList]);

  // Export to Excel / CSV with UTF-8 BOM
  const exportToExcelCSV = () => {
    const dateStr = allMonths ? 'all_time' : selectedMonth;
    const deptStr = selectedDeptId === 'all' ? 'all_depts' : (departments.find(d => d.id === selectedDeptId)?.code || selectedDeptId);
    
    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic/Kurdish support in Excel

    if (viewMode === 'summary') {
      // Summary Export
      const headers = [
        'ڕیزبەندی',
        'کۆدی پەرستار (ID)',
        'ناوی تەواو',
        'پلەی وەزیفی',
        'بەشی سەرەکی',
        'هەموو بەشەکان',
        'ژمارەی مۆبایل',
        'شیفتی بەیانیان (6h)',
        'شیفتی ئێواران (6h)',
        'شیفتی شەوان (12h)',
        'شیفتەکانی تر',
        'کۆی گشتی شیفتەکان',
        'کاتژمێری ئەنجامدراو',
        'ئامانجی مانگانە',
        'ڕێژەی تەواوکردن %',
        'زیادەکاری (Overtime)',
      ];

      const rows = sortedSummaryList.map((item, idx) => {
        let roleKu = 'پەرستاری بڕوانامەدار';
        if (isSystemAdminNurse(item.nurse)) {
          roleKu = 'هێد نێرس (Head Nurse)';
        } else if (item.nurse.role === 'team_leader' || item.nurse.isSupervisor) {
          roleKu = 'تیم لیدەر (Team Leader)';
        } else if (item.nurse.role === 'senior_nurse') {
          roleKu = 'پەرستاری پێشکەوتوو';
        } else if (item.nurse.role === 'practical_nurse') {
          roleKu = 'پەرستاری پراکتیکی';
        } else if (item.nurse.role === 'trainee') {
          roleKu = 'ڕاهێنراو';
        }
        const deptsKu = (item.allDepts || []).map(d => d?.nameKu).filter(Boolean).join(' - ');

        return [
          idx + 1,
          `"${item.nurse.id}"`,
          `"${item.nurse.fullNameKu}"`,
          `"${roleKu}"`,
          `"${item.primaryDept?.nameKu || ''}"`,
          `"${deptsKu}"`,
          `"${item.nurse.phone}"`,
          item.morningCount,
          item.eveningCount,
          item.nightCount,
          item.otherCount,
          item.totalShiftsCount,
          item.totalHours,
          item.targetHours,
          `${item.completionPercent}%`,
          item.overtime,
        ].join(',');
      });

      // Total Row at the bottom
      const totalMorning = nurseSummaryList.reduce((a, b) => a + b.morningCount, 0);
      const totalEvening = nurseSummaryList.reduce((a, b) => a + b.eveningCount, 0);
      const totalNight = nurseSummaryList.reduce((a, b) => a + b.nightCount, 0);
      const totalShifts = nurseSummaryList.reduce((a, b) => a + b.totalShiftsCount, 0);
      const totalHours = nurseSummaryList.reduce((a, b) => a + b.totalHours, 0);
      const totalOvertime = nurseSummaryList.reduce((a, b) => a + b.overtime, 0);

      const totalRow = [
        'کۆی گشتی',
        '---',
        `"${nurseSummaryList.length} پەرستار"`,
        '---',
        '---',
        '---',
        '---',
        totalMorning,
        totalEvening,
        totalNight,
        '---',
        totalShifts,
        totalHours,
        '---',
        '---',
        totalOvertime,
      ].join(',');

      csvContent += [headers.join(','), ...rows, totalRow].join('\n');
      downloadFile(csvContent, `Nurses_Hours_Summary_${deptStr}_${dateStr}.csv`);
    } else {
      // Detailed Export
      const headers = [
        'زنجیرە',
        'ناسنامەی پەرستار (ID)',
        'ناوی پەرستار',
        'بەش',
        'کۆدی بەش',
        'بەروار',
        'جۆری شیفت',
        'ناوی شوێنی دەوام',
        'کاتی دەستپێک',
        'کاتی کۆتایی',
        'کاتژمێری بنیات',
        'زیادە یان کەمکردن',
        'کۆی کاتژمێر',
        'دۆخی پەسەندکردن',
        'ژوور / قەرەوێڵە',
        'تۆمارکراوە لەلایەن',
        'تێبینی',
        'تێبینی سەرپەرشتیار'
      ];

      const rows = sortedDetailedShifts.map((shift, idx) => {
        const dept = getDepartment(shift.departmentId);
        const shiftTypeKu = shift.shiftType === 'morning' ? 'بەیانیان' : shift.shiftType === 'evening' ? 'ئێواران' : shift.shiftType === 'night' ? 'شەوان' : shift.shiftType === 'support_night' ? 'شەوی پشتیوانی' : shift.shiftType;
        const statusKu = shift.status === 'approved' ? 'پەسەندکراو' : shift.status === 'pending' ? 'چاوەڕوانکراو' : 'ڕەتکراوە';
        const loggedByKu = shift.loggedBy === 'admin' ? 'ئەدمین' : 'پەرستار';
        const shiftNet = (Number(shift.hours) || 0) + (Number(shift.extraHours) || 0);

        return [
          idx + 1,
          `"${shift.nurseId}"`,
          `"${shift.nurseNameKu || ''}"`,
          `"${dept?.nameKu || ''}"`,
          `"${dept?.code || ''}"`,
          `"${shift.date}"`,
          `"${shiftTypeKu}"`,
          `"${shift.slotName || ''}"`,
          `"${shift.startTime}"`,
          `"${shift.endTime}"`,
          shift.hours,
          shift.extraHours || 0,
          shiftNet,
          `"${statusKu}"`,
          `"${(shift.patientBedRoom || '').replace(/"/g, '""')}"`,
          `"${loggedByKu}"`,
          `"${(shift.notes || '').replace(/"/g, '""')}"`,
          `"${(shift.supervisorNotes || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const totalHours = sortedDetailedShifts.reduce((a, b) => a + (Number(b.hours) || 0) + (Number(b.extraHours) || 0), 0);
      const totalRow = [
        'کۆی گشتی',
        '---',
        `"${sortedDetailedShifts.length} شیفت"`,
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        '---',
        totalHours,
        '---',
        '---',
        '---',
        '---',
        '---'
      ].join(',');

      csvContent += [headers.join(','), ...rows, totalRow].join('\n');
      downloadFile(csvContent, `Shifts_Detailed_Log_${deptStr}_${dateStr}.csv`);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy table to clipboard in tab-separated format for direct Excel/Google Sheets paste
  const copyToClipboard = () => {
    let tsv = '';
    if (viewMode === 'summary') {
      tsv += ['ڕیزبەندی', 'کۆد', 'ناو', 'بەش', 'بەیانیان', 'ئێواران', 'شەوان', 'کۆی شیفت', 'کاتژمێر', 'ئامانج', 'ڕێژە', 'زیادەکاری'].join('\t') + '\n';
      sortedSummaryList.forEach((item, idx) => {
        tsv += [
          idx + 1,
          item.nurse.id,
          item.nurse.fullNameKu,
          item.primaryDept?.nameKu || '',
          item.morningCount,
          item.eveningCount,
          item.nightCount,
          item.totalShiftsCount,
          item.totalHours,
          item.targetHours,
          `${item.completionPercent}%`,
          item.overtime
        ].join('\t') + '\n';
      });
    } else {
      tsv += ['زنجیرە', 'کۆد', 'پەرستار', 'بەش', 'بەروار', 'جۆری شیفت', 'دەستپێک', 'کۆتایی', 'کاتژمێر', 'دۆخ'].join('\t') + '\n';
      sortedDetailedShifts.forEach((shift, idx) => {
        const dept = getDepartment(shift.departmentId);
        tsv += [
          idx + 1,
          shift.nurseId,
          shift.nurseNameKu,
          dept?.nameKu || '',
          shift.date,
          shift.shiftType,
          shift.startTime,
          shift.endTime,
          (Number(shift.hours) || 0) + (Number(shift.extraHours) || 0),
          shift.status
        ].join('\t') + '\n';
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Mode Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  خشتەی ئەکسل و ڕاپۆرتی کاتژمێرەکان
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  فلتەرکردنی وردی کاتژمێری پەرستاران بەپێی مانگ، بەش و نێرس لەگەڵ داونلۆدی ئەکسل (Excel / CSV)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Export to Excel & Copy */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="کۆپیکردنی خشتە بۆ Paste کردن لەناو Excel یان Google Sheets"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'کۆپی کرا!' : 'کۆپیکردن بۆ ئەکسل'}</span>
            </button>

            <button
              type="button"
              onClick={exportToExcelCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>داونلۆدی خشتەی ئەکسل (Excel)</span>
            </button>
          </div>
        </div>

        {/* View Mode Toggle: Summary vs Detailed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setViewMode('summary'); setSortField('hours'); setSortOrder('desc'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>کورتەی کاتژمێری پەرستاران ({nurseSummaryList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('detailed'); setSortField('date'); setSortOrder('desc'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>تەواوی شیفتەکان بە تفاسیلی ({filteredShifts.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>داتای فلتەرکراو: <strong>{filteredShifts.length}</strong> شیفت | <strong>{totalFilteredHours}</strong> کاتژمێر</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          
          {/* 1. Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>مانگ:</span>
              </span>
              <button
                type="button"
                onClick={() => setAllMonths(!allMonths)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${allMonths ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                {allMonths ? '✓ هەموو مانگەکان' : 'هەموو'}
              </button>
            </label>
            <input
              type="month"
              disabled={allMonths}
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setAllMonths(false); }}
              className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 ${allMonths ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* 2. Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>بەش:</span>
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">هەموو بەشەکان ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nameKu} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Nurse Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>پەرستار:</span>
            </label>
            <select
              value={selectedNurseId}
              onChange={(e) => setSelectedNurseId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">هەموو پەرستاران ({nurses.filter(n => !isSystemAdminNurse(n)).length})</option>
              {nurses.filter(n => !isSystemAdminNurse(n)).map((nurse) => (
                <option key={nurse.id} value={nurse.id}>
                  {nurse.fullNameKu} ({nurse.id})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>دۆخی شیفت:</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="approved">تەنها پەسەندکراو (Approved)</option>
              <option value="all">هەموو دۆخەکان (پەسەند + چاوەڕوان)</option>
              <option value="pending">تەنها چاوەڕوانکراو (Pending)</option>
            </select>
          </div>

          {/* 5. Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-teal-600" />
              <span>گەڕان لە خشتەدا:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ناو، ئایدی، بەش، ژوور..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">کۆی کاتژمێری ئەنجامدراو</span>
            <div className="text-2xl font-black text-teal-800 font-mono">{totalFilteredHours} کاتژمێر</div>
            <p className="text-[11px] text-slate-400 mt-1">{allMonths ? 'سەرجەم مانگەکان' : `مانگی ${selectedMonth}`}</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">کۆی شیفتەکان</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalFilteredShifts} شیفت</div>
            <p className="text-[11px] text-slate-400 mt-1">{selectedStatus === 'approved' ? 'شیفتی پەسەندکراو' : 'سەرجەم دۆخەکان'}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">پەرستارانی دەوامکار</span>
            <div className="text-2xl font-black text-purple-700 font-mono">
              {activeNursesCount} / {nurses.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">پەرستاری خاوەن شیفت لەم فلتەرەدا</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">کۆی زیادەکاری (Overtime)</span>
            <div className="text-2xl font-black text-rose-700 font-mono">
              +{totalOvertimeHours} کاتژمێر
            </div>
            <p className="text-[11px] text-slate-400 mt-1">سەرووی ئامانجی دەوام</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Excel Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>
                {viewMode === 'summary' 
                  ? 'خشتەی کورتەی کاتژمێرەکانی پەرستاران (Nurse Monthly Hours Summary)' 
                  : 'خشتەی تفاسیلی شیفتەکان و کاتژمێرەکان (Detailed Shifts Log)'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              کلیک لە ناوی هەر ستوونێک بکە بۆ ڕیزبەندیکردن (Sort). هەموو داتاکان ڕاستەوخۆ دەتوانیت داونلۆدی بکەیت.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
              {viewMode === 'summary' ? `${sortedSummaryList.length} نێرس` : `${sortedDetailedShifts.length} شیفت`}
            </span>
          </div>
        </div>

        {/* View Mode 1: Summary Table (One row per nurse) */}
        {viewMode === 'summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 text-center w-12 font-mono">#</th>
                  <th 
                    onClick={() => handleSort('id')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>کۆد (ID)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('name')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>ناوی پەرستار</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('dept')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>بەشەکان</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('morning')} 
                    className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                    title="شیفتی بەیانیان (6 کاتژمێر)"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-amber-800">بەیانیان (6h)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('evening')} 
                    className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                    title="شیفتی ئێواران (6 کاتژمێر)"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-blue-800">ئێواران (6h)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('night')} 
                    className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                    title="شیفتی شەوان (12 کاتژمێر)"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-purple-800">شەوان (12h)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('totalShifts')} 
                    className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors font-mono"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>کۆی شیفت</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('hours')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors font-mono"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-teal-900 font-black">کاتژمێری تەواوکراو</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 font-mono text-slate-500">ئامانج</th>
                  <th className="p-3 w-28">ڕێژەی دەوام</th>
                  <th 
                    onClick={() => handleSort('overtime')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors font-mono"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-rose-800">زیادەکاری (Overtime)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sortedSummaryList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-slate-400 text-xs">
                      هیچ داتایەک نەدۆزرایەوە بەپێی ئەم فلتەرانە
                    </td>
                  </tr>
                ) : (
                  sortedSummaryList.map((item, idx) => {
                    return (
                      <tr key={item.nurse.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {item.nurse.id}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.nurse.fullNameKu}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {isSystemAdminNurse(item.nurse)
                              ? 'هێد نێرس (Head Nurse)'
                              : item.nurse.role === 'team_leader' || item.nurse.isSupervisor
                              ? 'تیم لیدەر (Team Leader)'
                              : item.nurse.role === 'senior_nurse'
                              ? 'پەرستاری پێشکەوتوو'
                              : item.nurse.role === 'practical_nurse'
                              ? 'پەرستاری پراکتیکی'
                              : 'پەرستاری بڕوانامەدار'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {item.allDepts.map(dept => (
                              <DepartmentBadge key={dept?.id} department={dept} size="sm" />
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-700 bg-amber-50/40">
                          {item.morningCount}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/40">
                          {item.eveningCount}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-purple-700 bg-purple-50/40">
                          {item.nightCount}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-50">
                          {item.totalShiftsCount}
                        </td>
                        <td className="p-3 font-mono font-black text-teal-800 text-sm">
                          <div>{item.totalHours} <span className="text-[10px] font-normal text-slate-500">کاتژمێر</span></div>
                          {item.extraHoursNet !== 0 && (
                            <span className={`text-[10px] font-bold block ${
                              item.extraHoursNet > 0 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {item.extraHoursNet > 0 ? `+${item.extraHoursNet}h زیادە` : `${item.extraHoursNet}h کەمکردن`}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.targetHours}h
                        </td>
                        <td className="p-3">
                          <div className="w-full">
                            <div className="flex items-center justify-between text-[10px] font-bold font-mono mb-0.5">
                              <span>{item.completionPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${item.completionPercent >= 100 ? 'bg-emerald-500' : item.completionPercent >= 70 ? 'bg-teal-500' : 'bg-amber-500'}`}
                                style={{ width: `${item.completionPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {item.overtime > 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-mono font-black border border-rose-200 text-xs">
                              +{item.overtime} کاتژمێر
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Totals Row */}
              {sortedSummaryList.length > 0 && (
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">
                      کۆی گشتی ({sortedSummaryList.length} پەرستار):
                    </td>
                    <td className="p-3 text-center font-mono text-amber-900">
                      {nurseSummaryList.reduce((a, b) => a + b.morningCount, 0)}
                    </td>
                    <td className="p-3 text-center font-mono text-blue-900">
                      {nurseSummaryList.reduce((a, b) => a + b.eveningCount, 0)}
                    </td>
                    <td className="p-3 text-center font-mono text-purple-900">
                      {nurseSummaryList.reduce((a, b) => a + b.nightCount, 0)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-900">
                      {nurseSummaryList.reduce((a, b) => a + b.totalShiftsCount, 0)}
                    </td>
                    <td className="p-3 font-mono text-teal-900 text-sm">
                      {totalFilteredHours} کاتژمێر
                    </td>
                    <td colSpan={2} className="p-3"></td>
                    <td className="p-3 font-mono text-rose-900">
                      +{totalOvertimeHours} کاتژمێر
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* View Mode 2: Detailed Shifts Table (Shift-by-shift) */}
        {viewMode === 'detailed' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 text-center w-12 font-mono">#</th>
                  <th 
                    onClick={() => handleSort('date')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>بەروار</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('name')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>پەرستار</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">بەش</th>
                  <th className="p-3">جۆری شیفت</th>
                  <th className="p-3">شوێن / ناوی شیفت</th>
                  <th className="p-3 font-mono">کاتی دەوام</th>
                  <th 
                    onClick={() => handleSort('hours')} 
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors font-mono"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-teal-900 font-black">کاتژمێر</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">ژوور / قەرەوێڵە</th>
                  <th className="p-3">دۆخ</th>
                  <th className="p-3">تێبینی</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sortedDetailedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400 text-xs">
                      هیچ شیفتێک نەدۆزرایەوە بەپێی ئەم فلتەرانە
                    </td>
                  </tr>
                ) : (
                  sortedDetailedShifts.map((shift, idx) => {
                    const dept = getDepartment(shift.departmentId);

                    return (
                      <tr key={shift.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {shift.date}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{shift.nurseNameKu}</div>
                          <span className="font-mono text-[10px] text-slate-500">{shift.nurseId}</span>
                        </td>
                        <td className="p-3">
                          <DepartmentBadge department={dept} size="sm" />
                        </td>
                        <td className="p-3">
                          <ShiftTypeBadge type={shift.shiftType} />
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {shift.slotName || '-'}
                        </td>
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap" dir="ltr">
                          {shift.startTime} - {shift.endTime}
                        </td>
                        <td className="p-3 font-mono font-black text-teal-800 text-sm">
                          <div>{(Number(shift.hours) || 0) + (Number(shift.extraHours) || 0)} <span className="text-[10px] font-normal text-slate-500">کاتژمێر</span></div>
                          {shift.extraHours ? (
                            shift.extraHours > 0 ? (
                              <span className="text-[10px] font-bold text-amber-600 block">+{shift.extraHours}h زیادە (بنیات {shift.hours}h)</span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 block">{shift.extraHours}h سالیب (بنیات {shift.hours}h)</span>
                            )
                          ) : null}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {shift.patientBedRoom || '-'}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={shift.status} />
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate" title={shift.notes}>
                          {shift.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer */}
              {sortedDetailedShifts.length > 0 && (
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={7} className="p-3 text-right">
                      کۆی گشتی ({sortedDetailedShifts.length} شیفت):
                    </td>
                    <td className="p-3 font-mono text-teal-900 text-sm">
                      {totalFilteredHours} کاتژمێر
                    </td>
                    <td colSpan={3} className="p-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
