import React, { useState } from 'react';
import {
  ProjectItem,
  BudgetSource,
  BUDGET_SOURCES,
  ItemType,
  ProjectStatus,
  PROJECT_STATUS_OPTIONS,
  AuthUser,
} from '../types/project';
import {
  formatCurrency,
  formatThaiDate,
  formatNumber,
} from '../utils/dateAndCalc';
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface ProjectTableViewProps {
  projects: ProjectItem[];
  currentUser: AuthUser;
  selectedFiscalYear: '2570' | 'ก่อนปี 2570' | 'all';
  onSelectFiscalYear: (fy: '2570' | 'ก่อนปี 2570' | 'all') => void;
  onAddNewProject: () => void;
  onEditProject: (project: ProjectItem) => void;
  onDeleteProject: (id: string, name: string) => void;
  onOpenExcelModal: () => void;
}

export const ProjectTableView: React.FC<ProjectTableViewProps> = ({
  projects,
  currentUser,
  selectedFiscalYear,
  onSelectFiscalYear,
  onAddNewProject,
  onEditProject,
  onDeleteProject,
  onOpenExcelModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disburseFilter, setDisburseFilter] = useState<string>('all');
  const [guaranteeFilter, setGuaranteeFilter] = useState<string>('all');

  // Filter pipeline
  const filteredList = projects.filter((p) => {
    // 1. Fiscal Year
    if (selectedFiscalYear !== 'all' && p.fiscalYear !== selectedFiscalYear) {
      return false;
    }
    // 2. Budget Source
    if (sourceFilter !== 'all' && p.budgetSource !== sourceFilter) {
      return false;
    }
    // 3. Item Type
    if (typeFilter !== 'all' && p.itemType !== typeFilter) {
      return false;
    }
    // 4. Project Status
    if (statusFilter !== 'all' && p.projectStatus !== statusFilter) {
      return false;
    }
    // 5. Disbursement Status
    if (disburseFilter !== 'all' && p.disbursementStatus !== disburseFilter) {
      return false;
    }
    // 6. Guarantee Status
    if (guaranteeFilter !== 'all' && p.guaranteeStatus !== guaranteeFilter) {
      return false;
    }
    // 7. Search text
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchContract = (p.contractNo || '').toLowerCase().includes(q);
      const matchContractor = (p.contractor || '').toLowerCase().includes(q);
      const matchRemarks = (p.remarks || '').toLowerCase().includes(q);
      if (!matchName && !matchContract && !matchContractor && !matchRemarks) {
        return false;
      }
    }
    return true;
  });

  const canEdit = currentUser.role === 'officer';

  return (
    <div className="space-y-4">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Year Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs self-start">
            <button
              onClick={() => onSelectFiscalYear('2570')}
              className={`px-3 py-1.5 font-medium rounded-md transition cursor-pointer ${
                selectedFiscalYear === '2570'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปี 2570
            </button>
            <button
              onClick={() => onSelectFiscalYear('ก่อนปี 2570')}
              className={`px-3 py-1.5 font-medium rounded-md transition cursor-pointer ${
                selectedFiscalYear === 'ก่อนปี 2570'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ก่อนปี 2570
            </button>
            <button
              onClick={() => onSelectFiscalYear('all')}
              className={`px-3 py-1.5 font-medium rounded-md transition cursor-pointer ${
                selectedFiscalYear === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทั้งหมด
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {currentUser.role !== 'executive' && (
              <button
                onClick={onOpenExcelModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>นำเข้า / ดาวน์โหลด Excel</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={onAddNewProject}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกโครงการประจำวัน</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ, เลขที่สัญญา, คู่สัญญา..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Budget Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">แหล่งงบ: ทั้งหมด (๖ แหล่ง)</option>
              {BUDGET_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Item Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">ประเภท: ทั้งหมด</option>
              <option value="โครงการ">โครงการ</option>
              <option value="ครุภัณฑ์">ครุภัณฑ์</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">สถานะโครงการ: ทั้งหมด</option>
              {PROJECT_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.length > 25 ? st.slice(0, 25) + '...' : st}
                </option>
              ))}
            </select>
          </div>

          {/* Disbursement Filter */}
          <div>
            <select
              value={disburseFilter}
              onChange={(e) => setDisburseFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">การเบิกจ่าย: ทั้งหมด</option>
              <option value="ชำระเงินแล้ว">ชำระเงินแล้ว</option>
              <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              บัญชีรายการงบลงทุน ({filteredList.length} รายการ)
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              ฝ่ายพัสดุและทรัพย์สิน เทศบาลเมืองมหาสารคาม
            </span>
          </div>
          {canEdit && (
            <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium">
              สิทธิ์บันทึก/แก้ไขข้อมูลประจำวัน
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="py-2.5 px-3 w-12 text-center">
                  ลำดับ
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[220px]">
                  รายการ (ชื่อโครงการ/ครุภัณฑ์)
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[130px]">
                  แหล่งงบประมาณ
                </th>
                <th scope="col" className="py-2.5 px-3 text-right min-w-[120px]">
                  งบที่ตั้งไว้
                  <span className="block text-[10px] font-normal text-slate-500">(โอนลด/เพิ่ม)</span>
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[170px]">
                  สัญญา / คู่สัญญา
                </th>
                <th scope="col" className="py-2.5 px-3 text-right min-w-[120px]">
                  วงเงินสัญญา
                  <span className="block text-[10px] font-normal text-slate-500">(ลด/เพิ่ม)</span>
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[160px]">
                  หลักประกันสัญญา
                  <span className="block text-[10px] font-normal text-amber-700">(วันครบกำหนดคืนเงิน)</span>
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[150px]">
                  สถานะโครงการ / เบิกจ่าย
                </th>
                <th scope="col" className="py-2.5 px-3 text-right min-w-[110px]">
                  งบประมาณคงเหลือ
                </th>
                <th scope="col" className="py-2.5 px-3 text-center w-24">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HelpCircle className="w-6 h-6 text-slate-400" />
                      <span>ไม่พบข้อมูลโครงการตามเงื่อนไขที่เลือก</span>
                      {canEdit && (
                        <button
                          onClick={onAddNewProject}
                          className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
                        >
                          + บันทึกโครงการใหม่
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((project, index) => {
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center text-slate-500 tabular-nums font-mono">
                        {index + 1}
                      </td>

                      {/* Project Name & Item Type */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {project.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          <span
                            className={`px-1.5 py-0.2 rounded font-medium ${
                              project.itemType === 'ครุภัณฑ์'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {project.itemType}
                          </span>
                          <span>·</span>
                          <span className="text-slate-600 font-medium">ปี {project.fiscalYear}</span>
                          {project.remarks && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[180px] text-slate-400" title={project.remarks}>
                                {project.remarks}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Budget Source */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">
                          {project.budgetSource}
                        </span>
                      </td>

                      {/* Allocated Budget & Transfer */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(project.allocatedBudget)}
                        </div>
                        {project.transferBudget !== 0 && (
                          <div
                            className={`text-[11px] font-medium ${
                              project.transferBudget > 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {project.transferBudget > 0 ? '+' : ''}
                            {formatCurrency(project.transferBudget)}
                          </div>
                        )}
                      </td>

                      {/* Contract Info */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[180px]">
                          {project.contractor || <span className="text-slate-400 italic">(ยังไม่มีคู่สัญญา)</span>}
                        </div>
                        {project.contractNo && (
                          <div className="text-[11px] text-slate-500">
                            สัญญา: {project.contractNo}
                          </div>
                        )}
                        {(project.startDate || project.endDate) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {project.startDate ? formatThaiDate(project.startDate) : '-'} ถึง{' '}
                            {project.endDate ? formatThaiDate(project.endDate) : '-'}
                          </div>
                        )}
                      </td>

                      {/* Contract Amount */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        {project.contractAmount > 0 ? (
                          <>
                            <div className="font-semibold text-slate-900">
                              {formatCurrency(project.contractAmount)}
                            </div>
                            {project.contractAdjust !== 0 && (
                              <div
                                className={`text-[11px] font-medium ${
                                  project.contractAdjust > 0 ? 'text-emerald-600' : 'text-red-500'
                                }`}
                              >
                                {project.contractAdjust > 0 ? '+' : ''}
                                {formatCurrency(project.contractAdjust)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Guarantee and Auto-calculated Due Date */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between gap-1">
                          <span className="tabular-nums font-medium text-slate-800">
                            {project.guaranteeAmount > 0
                              ? formatCurrency(project.guaranteeAmount) + ' บ.'
                              : '-'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              project.guaranteeStatus === 'คืนเงินแล้ว'
                                ? 'bg-emerald-100 text-emerald-800 font-medium'
                                : 'bg-amber-100 text-amber-800 font-medium'
                            }`}
                          >
                            {project.guaranteeStatus}
                          </span>
                        </div>

                        {/* Calculated Guarantee Due Date */}
                        <div className="text-[11px] mt-1 text-slate-500">
                          {project.guaranteeDueDate ? (
                            <span className="text-amber-900 font-medium">
                              คืน: {formatThaiDate(project.guaranteeDueDate)} ({project.guaranteeReturnYears} ปี)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              {project.acceptanceDate
                                ? `ครบกำหนด ${project.guaranteeReturnYears} ปี`
                                : '(รอวันตรวจรับงาน)'}
                            </span>
                          )}
                        </div>

                        {project.acceptanceDate && (
                          <div className="text-[10px] text-slate-400">
                            ตรวจรับ: {formatThaiDate(project.acceptanceDate)}
                          </div>
                        )}
                      </td>

                      {/* Statuses */}
                      <td className="py-3 px-3">
                        <div>
                          <span
                            className={`inline-block text-[11px] font-medium leading-tight ${
                              project.projectStatus === 'ดำเนินการแล้วเสร็จ'
                                ? 'text-emerald-700'
                                : project.projectStatus === 'ยังไม่เริ่มดำเนินการ'
                                ? 'text-slate-500'
                                : 'text-amber-700'
                            }`}
                          >
                            {project.projectStatus}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              project.disbursementStatus === 'ชำระเงินแล้ว'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {project.disbursementStatus}
                          </span>
                        </div>
                      </td>

                      {/* Remaining Budget */}
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatCurrency(project.remainingBudget)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditProject(project)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                            title={canEdit ? 'แก้ไขข้อมูล' : 'ดูรายละเอียด'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => onDeleteProject(project.id, project.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                              title="ลบโครงการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
