import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  Bed, 
  Phone, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  Shield,
  Check,
  Award
} from 'lucide-react';
import { useHospital, isSystemAdminNurse } from '../../context/HospitalContext';
import { Department } from '../../types';
import { DepartmentBadge, getDepartmentIcon } from '../common/Badges';

export const DepartmentManager: React.FC = () => {
  const { 
    t, 
    departments, 
    nurses, 
    shifts, 
    addDepartment, 
    updateDepartment, 
    deleteDepartment,
    getDepartmentSupervisors,
    getDepartmentHeadNurseDisplay,
    toggleNurseSupervisorStatus,
    updateNurse
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Form State
  const [nameKu, setNameKu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState('');
  const [bedCapacity, setBedCapacity] = useState(20);
  const [phoneExtension, setPhoneExtension] = useState('');
  const [color, setColor] = useState('teal');
  const [iconName, setIconName] = useState('Activity');
  const [descriptionKu, setDescriptionKu] = useState('');
  const [headNurseNameKu, setHeadNurseNameKu] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setNameKu('');
    setNameEn('');
    setCode('');
    setFloor('');
    setBedCapacity(20);
    setPhoneExtension('');
    setColor('teal');
    setIconName('Activity');
    setDescriptionKu('');
    setHeadNurseNameKu('');
    setSelectedSupervisorId('');
    setError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingDept(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setNameKu(dept.nameKu);
    setNameEn(dept.nameEn);
    setCode(dept.code);
    setFloor(dept.floor);
    setBedCapacity(dept.bedCapacity);
    setPhoneExtension(dept.phoneExtension);
    setColor(dept.color);
    setIconName(dept.iconName);
    setDescriptionKu(dept.descriptionKu);
    
    // Auto-detect supervisor if not explicitly set
    const deptSupervisors = getDepartmentSupervisors(dept.id);
    const primarySup = deptSupervisors[0];
    const autoSupName = deptSupervisors.length > 0 
      ? deptSupervisors.map(s => s.fullNameKu).join(' ، ')
      : (dept.headNurseNameKu || '');

    setHeadNurseNameKu(dept.headNurseNameKu || autoSupName || '');
    setSelectedSupervisorId(primarySup?.id || dept.headNurseId || '');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKu.trim() || !code.trim()) {
      setError('تکایە ناوی بەش و کۆدی کورتکراوە بنووسە');
      return;
    }

    let finalHeadNurseName = headNurseNameKu.trim();
    let finalHeadNurseId = selectedSupervisorId;

    if (selectedSupervisorId) {
      const supNurse = nurses.find(n => n.id === selectedSupervisorId);
      if (supNurse) {
        if (!finalHeadNurseName) {
          finalHeadNurseName = supNurse.fullNameKu;
        }
        if (!supNurse.isSupervisor) {
          updateNurse(supNurse.id, { isSupervisor: true });
        }
      }
    }

    if (editingDept) {
      updateDepartment(editingDept.id, {
        nameKu,
        nameEn: nameEn || nameKu,
        code: code.toUpperCase(),
        floor,
        bedCapacity: Number(bedCapacity) || 0,
        phoneExtension,
        color,
        iconName,
        descriptionKu,
        headNurseId: finalHeadNurseId || undefined,
        headNurseNameKu: finalHeadNurseName || undefined,
      });
    } else {
      addDepartment({
        nameKu,
        nameEn: nameEn || nameKu,
        nameAr: nameKu,
        code: code.toUpperCase(),
        floor: floor || 'نهۆمی ١',
        bedCapacity: Number(bedCapacity) || 15,
        phoneExtension: phoneExtension || '100',
        color,
        iconName,
        descriptionKu: descriptionKu || 'بەشی خزمەتگوزاری نەخۆشخانە',
        descriptionEn: 'Hospital clinical department',
        headNurseId: finalHeadNurseId || undefined,
        headNurseNameKu: finalHeadNurseName || undefined,
      });
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const filteredDepts = departments.filter(d =>
    d.nameKu.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const deptNurses = selectedDeptId 
    ? nurses.filter(n => !isSystemAdminNurse(n) && (n.departmentId === selectedDeptId || (Array.isArray(n.departmentIds) && n.departmentIds.includes(selectedDeptId)))) 
    : [];
  const deptTodayShifts = selectedDeptId 
    ? shifts.filter(s => s.departmentId === selectedDeptId && s.date === todayStr && s.status === 'approved') 
    : [];

  const filteredModalNurses = deptNurses.filter(n => 
    !modalSearchQuery.trim() || 
    n.fullNameKu.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    n.fullNameEn.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    n.id.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    n.phone.includes(modalSearchQuery)
  );

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>{t.departmentSeparation} ({departments.length} بەش)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ڕێکخستن و جیاکردنەوەی پەرستاران بەپێی بەش و نهۆم و قەرەوێڵەکان
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان لە بەشەکان..."
              className="pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-60"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewDepartment}</span>
          </button>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepts.map((dept) => {
          const deptNursesCount = nurses.filter(
            n => !isSystemAdminNurse(n) && (n.departmentId === dept.id || (Array.isArray(n.departmentIds) && n.departmentIds.includes(dept.id)))
          ).length;
          const onDutyCount = shifts.filter(
            s => s.departmentId === dept.id && s.date === todayStr && s.status === 'approved'
          ).length;
          const deptSupervisors = getDepartmentSupervisors(dept.id);
          const supervisorDisplay = deptSupervisors.length > 0 
            ? deptSupervisors.map(s => s.fullNameKu).join(' ، ')
            : (dept.headNurseNameKu?.trim() || 'دیارینەکراوە');
          const hasActiveSupervisor = deptSupervisors.length > 0 || (!!dept.headNurseNameKu?.trim() && dept.headNurseNameKu !== 'دیارینەکراوە');

          return (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl border ${
                      dept.color === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                      dept.color === 'teal' ? 'bg-teal-50 border-teal-200 text-teal-700' :
                      dept.color === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                      dept.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      dept.color === 'pink' ? 'bg-pink-50 border-pink-200 text-pink-700' :
                      'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      {getDepartmentIcon(dept.iconName, 'w-5 h-5')}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {dept.nameKu}
                      </h3>
                      <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                        کۆد: {dept.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      title="دەستکاریکردن"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`دڵنیایت لە سڕینەوەی بەشی "${dept.nameKu}"؟`)) {
                          deleteDepartment(dept.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="سڕینەوە"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                  {dept.descriptionKu}
                </p>

                {/* Metadata badges */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3">
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{dept.floor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Bed className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{dept.bedCapacity} قەرەوێڵە</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>داخڵی: {dept.phoneExtension}</span>
                  </div>
                </div>

                {/* Leadership: Head Nurse & Team Leader */}
                <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 mb-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>هێد نێرس:</span>
                    </span>
                    <span className="font-bold text-indigo-950 bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200/90 text-[11px]">
                      Mohammed Ziad Mohammed
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${hasActiveSupervisor ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>تیم لیدەر:</span>
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-md border truncate max-w-[170px] text-[11px] ${
                      hasActiveSupervisor
                        ? 'bg-amber-100/90 text-amber-950 border-amber-300 font-bold'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {supervisorDisplay}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom statistics & Drilldown */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-800">{deptNursesCount} پەرستار</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {onDutyCount} لە دەوام
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeptId(dept.id);
                    setModalSearchQuery('');
                  }}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  بینینی ستاف &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drilldown Modal (Nurses in Selected Department) */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedDept.nameKu} ({selectedDept.code})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {deptNurses.length} پەرستاری تەرخانکراو | {deptTodayShifts.length} پەرستار لە دەوامی ئەمڕۆ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeptId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Leadership Banner */}
            {(() => {
              const deptModalSupervisors = getDepartmentSupervisors(selectedDept.id);
              const deptModalSupDisplay = deptModalSupervisors.length > 0 
                ? deptModalSupervisors.map(s => s.fullNameKu).join(' ، ')
                : (selectedDept.headNurseNameKu?.trim() || 'دیارینەکراوە');
              const hasActiveSup = deptModalSupervisors.length > 0 || (!!selectedDept.headNurseNameKu?.trim() && selectedDept.headNurseNameKu !== 'دیارینەکراوە');

              return (
                <div className="mt-3 p-3.5 rounded-xl border bg-slate-50 border-slate-200/90 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 divide-x divide-x-reverse divide-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-600">هێد نێرس:</span>
                        <span className="font-bold text-indigo-950 bg-indigo-100/90 px-2 py-0.5 rounded-md border border-indigo-200 text-xs">
                          Mohammed Ziad Mohammed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pe-3">
                        <ShieldCheck className={`w-4 h-4 shrink-0 ${hasActiveSup ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="font-medium text-slate-600">تیم لیدەر (Team Leader):</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md border text-xs ${
                          hasActiveSup ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          {deptModalSupDisplay}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      hasActiveSup ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                      {hasActiveSup ? 'تیم لیدەری چالاک' : 'تیم لیدەر دیارینەکراوە'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Modal search bar if more than 4 nurses */}
            {deptNurses.length > 4 && (
              <div className="mt-4 relative">
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="گەڕان لە پەرستارانی ئەم بەشە (ناو یان ئایدی)..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">لیستی پەرستارانی ئەم بەشە:</h4>
                <span className="text-[11px] text-slate-400">{filteredModalNurses.length} پەرستار</span>
              </div>

              {filteredModalNurses.map((nurse) => {
                const nurseTodayShift = shifts.find(
                  s => s.nurseId === nurse.id && s.date === todayStr && s.status === 'approved'
                );
                const isPrimary = nurse.departmentId === selectedDept.id;
                const otherDepts = (nurse.departmentIds || [nurse.departmentId]).filter(id => id !== selectedDept.id);
                const isNurseSupervisor = Boolean(nurse.isSupervisor || nurse.role === 'team_leader');

                return (
                  <div key={nurse.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={nurse.avatarUrl || 'https://images.unsplash.com/photo-1594824813590-78500c410c5a?w=150&auto=format&fit=crop&q=80'}
                        alt={nurse.fullNameKu}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{nurse.fullNameKu}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {nurse.id}
                          </span>
                          {isPrimary ? (
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              بەشی سەرەکی
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              پشتیوانی / هاوبەش
                            </span>
                          )}
                          {isNurseSupervisor && (
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              تیم لیدەر (Team Leader)
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500">{nurse.phone}</span>
                          {otherDepts.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                              (بەشەکانی تر: {otherDepts.map(dId => departments.find(d => d.id === dId)?.code || dId).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Quick team leader toggle */}
                      <button
                        type="button"
                        onClick={() => toggleNurseSupervisorStatus(nurse.id)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isNurseSupervisor 
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300' 
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                        title={isNurseSupervisor ? 'لابردنی دەسەڵاتی تیم لیدەر' : 'دیاریکردن وەک تیم لیدەری ئەم بەشە'}
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${isNurseSupervisor ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span>{isNurseSupervisor ? 'تیم لیدەرە' : 'دانان وەک تیم لیدەر'}</span>
                      </button>

                      {nurseTodayShift ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                          لە دەوامە ({nurseTodayShift.shiftType})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">پشوو</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {deptNurses.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  هیچ پەرستارێک بۆ ئەم بەشە دیارینەکراوە.
                </div>
              )}

              {deptNurses.length > 0 && filteredModalNurses.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  هیچ پەرستارێک بەپێی گەڕانەکەت نەدۆزرایەوە.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDeptId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {editingDept ? 'دەستکاریکردنی بەش' : t.addNewDepartment}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ناوی بەش (کوردی) *
                  </label>
                  <input
                    type="text"
                    value={nameKu}
                    onChange={(e) => setNameKu(e.target.value)}
                    required
                    placeholder="نموونە: بەشی چاودێری چڕ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کۆدی بەش (Code) *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="نموونە: ICU یان ER"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نهۆم / شوێن
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="نموونە: نهۆمی دووەم"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    توانای قەرەوێڵە
                  </label>
                  <input
                    type="number"
                    value={bedCapacity}
                    onChange={(e) => setBedCapacity(Number(e.target.value))}
                    min={1}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ژمارەی ناوخۆیی (Extension)
                  </label>
                  <input
                    type="text"
                    value={phoneExtension}
                    onChange={(e) => setPhoneExtension(e.target.value)}
                    placeholder="نموونە: 104"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ناوی تیم لیدەری بەش (Team Leader)
                  </label>
                  <input
                    type="text"
                    value={headNurseNameKu}
                    onChange={(e) => setHeadNurseNameKu(e.target.value)}
                    placeholder="ناوی تیم لیدەری بەش..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Head Nurse Fixed Info Banner */}
              <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-600">هێد نێرس (Head Nurse): </span>
                    <span className="font-extrabold text-indigo-950">Mohammed Ziad Mohammed</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-300 shrink-0">
                  سەرپەرشتیاری گشتی پەرستاران
                </span>
              </div>

              {/* Team Leader Auto-Detected Alert & Selection */}
              {editingDept && (() => {
                const detectedSups = getDepartmentSupervisors(editingDept.id);
                if (detectedSups.length === 0) return null;
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">تیم لیدەری چالاککراو لە ستافی ئەم بەشە: </span>
                        <span className="font-bold underline decoration-amber-400">
                          {detectedSups.map(s => s.fullNameKu).join(' ، ')}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHeadNurseNameKu(detectedSups.map(s => s.fullNameKu).join(' ، '));
                        setSelectedSupervisorId(detectedSups[0].id);
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      دانانی خۆکار
                    </button>
                  </div>
                );
              })()}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    هەڵبژاردنی تیم لیدەر لە لیستی پەرستاران (Team Leader)
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">خۆکارانە ناوی پەرستار وەک تیم لیدەر دادەنێت</span>
                </label>
                {(() => {
                  const eligibleNurses = nurses.filter(n => !isSystemAdminNurse(n));
                  const deptNursesForSelect = editingDept
                    ? eligibleNurses.filter(n => n.departmentId === editingDept.id || (Array.isArray(n.departmentIds) && n.departmentIds.includes(editingDept.id)))
                    : eligibleNurses;
                  const otherNursesForSelect = eligibleNurses.filter(n => !deptNursesForSelect.some(dn => dn.id === n.id));

                  return (
                    <select
                      value={selectedSupervisorId}
                      onChange={(e) => {
                        const nurseId = e.target.value;
                        setSelectedSupervisorId(nurseId);
                        if (nurseId) {
                          const nurse = nurses.find(n => n.id === nurseId);
                          if (nurse) {
                            setHeadNurseNameKu(nurse.fullNameKu);
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="">-- هەڵبژاردنی پەرستار وەک تیم لیدەر (خۆکار) --</option>
                      {deptNursesForSelect.length > 0 && (
                        <optgroup label={`پەرستارانی ئەم بەشە (${deptNursesForSelect.length})`}>
                          {deptNursesForSelect.map(n => (
                            <option key={n.id} value={n.id}>
                              {n.fullNameKu} ({n.id}) {n.isSupervisor ? '★ (تیم لیدەر)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="پەرستارانی دیکە">
                        {otherNursesForSelect.map(n => (
                          <option key={n.id} value={n.id}>
                            {n.fullNameKu} ({n.id}) {n.isSupervisor ? '★ (تیم لیدەر)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ڕەنگی ناسێنەر
                </label>
                <div className="flex items-center gap-2">
                  {['teal', 'rose', 'indigo', 'amber', 'emerald', 'pink', 'cyan', 'purple'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        c === 'teal' ? 'bg-teal-500' :
                        c === 'rose' ? 'bg-rose-500' :
                        c === 'indigo' ? 'bg-indigo-500' :
                        c === 'amber' ? 'bg-amber-500' :
                        c === 'emerald' ? 'bg-emerald-500' :
                        c === 'pink' ? 'bg-pink-500' :
                        c === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'
                      } ${color === c ? 'ring-4 ring-slate-400 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کورتەیەک دەربارەی بەش
                </label>
                <textarea
                  value={descriptionKu}
                  onChange={(e) => setDescriptionKu(e.target.value)}
                  rows={2}
                  placeholder="ئەرک و بەرپرسیاریەتییەکانی ئەم بەشە..."
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
                  {editingDept ? 'نوێکردنەوەی بەش' : 'زیادکردنی بەش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
