import React from 'react';
import { ProjectItem, BudgetSource, BUDGET_SOURCES } from '../types/project';
import { formatCurrency, formatNumber } from '../utils/dateAndCalc';
import { exportSingleSheet } from '../utils/excelService';
import { Download, PieChart, CheckCircle2, Clock, AlertTriangle, Layers, Wallet, CheckSquare } from 'lucide-react';

interface SummaryReportProps {
  projects: ProjectItem[];
  selectedFiscalYear: '2570' | 'ก่อนปี 2570' | 'all';
  onSelectFiscalYear: (fy: '2570' | 'ก่อนปี 2570' | 'all') => void;
  onFilterBySource?: (source: BudgetSource | 'all') => void;
  showExcelExport?: boolean;
}

export const SummaryReport: React.FC<SummaryReportProps> = ({
  projects,
  selectedFiscalYear,
  onSelectFiscalYear,
  onFilterBySource,
  showExcelExport = true,
}) => {
  // Filter projects by fiscal year
  const filteredProjects = projects.filter((p) => {
    if (selectedFiscalYear === 'all') return true;
    return p.fiscalYear === selectedFiscalYear;
  });

  // Calculate table data for each of the 6 budget sources
  const summaryRows = BUDGET_SOURCES.map((source) => {
    const list = filteredProjects.filter((p) => p.budgetSource === source);
    const totalCount = list.length;
    const totalAllocated = list.reduce(
      (sum, p) => sum + (Number(p.allocatedBudget) || 0) + (Number(p.transferBudget) || 0),
      0
    );

    const completed = list.filter((p) => p.projectStatus === 'ดำเนินการแล้วเสร็จ');
    const completedAmount = completed.reduce(
      (sum, p) => sum + (Number(p.contractAmount) || Number(p.allocatedBudget) || 0),
      0
    );

    const inProgress = list.filter(
      (p) =>
        p.projectStatus === 'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)' ||
        p.projectStatus === 'อยู่ระหว่างประกาศจัดซื้อจัดจ้าง' ||
        p.projectStatus === 'อยู่ระหว่างการจัดทำ TOR /ราคากลาง'
    );
    const inProgressAmount = inProgress.reduce(
      (sum, p) => sum + (Number(p.contractAmount) || Number(p.allocatedBudget) || 0),
      0
    );

    const notStarted = list.filter((p) => p.projectStatus === 'ยังไม่เริ่มดำเนินการ');
    const notStartedAmount = notStarted.reduce(
      (sum, p) => sum + (Number(p.allocatedBudget) || 0),
      0
    );

    const disbursed = list.filter((p) => p.disbursementStatus === 'ชำระเงินแล้ว');
    const disbursedAmount = disbursed.reduce(
      (sum, p) => sum + (Number(p.contractAmount) || Number(p.allocatedBudget) || 0),
      0
    );

    const pendingDisbursed = list.filter((p) => p.disbursementStatus === 'อยู่ระหว่างดำเนินการ');
    const pendingDisbursedAmount = pendingDisbursed.reduce(
      (sum, p) => sum + (Number(p.contractAmount) || Number(p.allocatedBudget) || 0),
      0
    );

    const remainingBudget = list.reduce((sum, p) => sum + (Number(p.remainingBudget) || 0), 0);

    return {
      source,
      totalCount,
      totalAllocated,
      completedCount: completed.length,
      completedAmount,
      inProgressCount: inProgress.length,
      inProgressAmount,
      notStartedCount: notStarted.length,
      notStartedAmount,
      disbursedCount: disbursed.length,
      disbursedAmount,
      pendingDisbursedCount: pendingDisbursed.length,
      pendingDisbursedAmount,
      remainingBudget,
    };
  });

  // Calculate Grand Totals
  const grandTotal = summaryRows.reduce(
    (acc, row) => ({
      totalCount: acc.totalCount + row.totalCount,
      totalAllocated: acc.totalAllocated + row.totalAllocated,
      completedCount: acc.completedCount + row.completedCount,
      completedAmount: acc.completedAmount + row.completedAmount,
      inProgressCount: acc.inProgressCount + row.inProgressCount,
      inProgressAmount: acc.inProgressAmount + row.inProgressAmount,
      notStartedCount: acc.notStartedCount + row.notStartedCount,
      notStartedAmount: acc.notStartedAmount + row.notStartedAmount,
      disbursedCount: acc.disbursedCount + row.disbursedCount,
      disbursedAmount: acc.disbursedAmount + row.disbursedAmount,
      pendingDisbursedCount: acc.pendingDisbursedCount + row.pendingDisbursedCount,
      pendingDisbursedAmount: acc.pendingDisbursedAmount + row.pendingDisbursedAmount,
      remainingBudget: acc.remainingBudget + row.remainingBudget,
    }),
    {
      totalCount: 0,
      totalAllocated: 0,
      completedCount: 0,
      completedAmount: 0,
      inProgressCount: 0,
      inProgressAmount: 0,
      notStartedCount: 0,
      notStartedAmount: 0,
      disbursedCount: 0,
      disbursedAmount: 0,
      pendingDisbursedCount: 0,
      pendingDisbursedAmount: 0,
      remainingBudget: 0,
    }
  );

  const handleExportSummaryExcel = () => {
    exportSingleSheet(
      filteredProjects,
      `สรุป_${selectedFiscalYear}`,
      `ตารางสรุปผลดำเนินงาน_งบลงทุน_${selectedFiscalYear}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Year Filter & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              รายงานผลภาพรวม
            </span>
            <span className="text-xs text-slate-500">
              เทศบาลเมืองมหาสารคาม
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            รายงานสรุปผลการดำเนินงานและการเบิกจ่าย งบลงทุน
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จำแนกตามประเภทแหล่งงบประมาณ ๖ แหล่งเงิน สถานะโครงการ และสถานะการเบิกจ่าย
          </p>
        </div>

        {/* Year Filter Tabs */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => onSelectFiscalYear('2570')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all cursor-pointer ${
                selectedFiscalYear === '2570'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปีงบประมาณ 2570
            </button>
            <button
              onClick={() => onSelectFiscalYear('ก่อนปี 2570')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all cursor-pointer ${
                selectedFiscalYear === 'ก่อนปี 2570'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ก่อนปี 2570
            </button>
            <button
              onClick={() => onSelectFiscalYear('all')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all cursor-pointer ${
                selectedFiscalYear === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมดทุกปี
            </button>
          </div>

          {showExcelExport && (
            <button
              onClick={handleExportSummaryExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs"
              title="ดาวน์โหลดตารางสรุปเป็น Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">งบประมาณรวมที่ตั้งไว้</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(grandTotal.totalAllocated)} บาท
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>จำนวนทั้งสิ้น</span>
            <span className="font-semibold text-indigo-700 tabular-nums">{grandTotal.totalCount} โครงการ/รายการ</span>
          </div>
        </div>

        {/* Completed Projects Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">เสร็จสิ้นแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums">
            {formatCurrency(grandTotal.completedAmount)} บาท
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>จำนวนโครงการ</span>
            <span className="font-semibold text-emerald-700 tabular-nums">{grandTotal.completedCount} โครงการ</span>
          </div>
        </div>

        {/* In Progress Projects Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">อยู่ระหว่างดำเนินการ</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 tabular-nums">
            {formatCurrency(grandTotal.inProgressAmount)} บาท
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>บริหารสัญญา / ประกาศจัดซื้อ</span>
            <span className="font-semibold text-amber-700 tabular-nums">{grandTotal.inProgressCount} โครงการ</span>
          </div>
        </div>

        {/* Remaining Budget Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">งบประมาณคงเหลือ</span>
            <PieChart className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700 tabular-nums">
            {formatCurrency(grandTotal.remainingBudget)} บาท
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>ชำระเงินเบิกจ่ายแล้ว</span>
            <span className="font-semibold text-blue-700 tabular-nums">{grandTotal.disbursedCount} โครงการ</span>
          </div>
        </div>
      </div>

      {/* Main Breakdown Table as requested by User */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              ตารางแสดงผลการดำเนินงาน จำแนกตาม ๖ แหล่งงบประมาณ
            </h3>
            <span className="text-xs text-slate-500 font-normal">
              ({selectedFiscalYear === 'all' ? 'ทุกปีงบประมาณ' : `ปี ${selectedFiscalYear}`})
            </span>
          </div>
          <span className="text-xs text-slate-500">
            หน่วย: บาท / โครงการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4 min-w-[200px]">
                  แหล่งงบประมาณ
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  จำนวนทั้งหมด
                  <span className="block text-[10px] font-normal text-slate-500">(โครงการ | เป็นเงิน)</span>
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  เสร็จสิ้น
                  <span className="block text-[10px] font-normal text-emerald-600">(โครงการ | เป็นเงิน)</span>
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  อยู่ระหว่างดำเนินการ
                  <span className="block text-[10px] font-normal text-amber-600">(โครงการ | เป็นเงิน)</span>
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  ยังไม่ดำเนินการ
                  <span className="block text-[10px] font-normal text-slate-500">(โครงการ | เป็นเงิน)</span>
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  สถานะการเบิกจ่าย
                  <span className="block text-[10px] font-normal text-blue-600">(ชำระแล้ว | เป็นเงิน)</span>
                </th>
                <th scope="col" className="py-3 px-3 text-right min-w-[120px]">
                  งบประมาณคงเหลือ
                  <span className="block text-[10px] font-normal text-slate-500">(บาท)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row) => (
                <tr
                  key={row.source}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <button
                      onClick={() => onFilterBySource && onFilterBySource(row.source)}
                      className="text-left hover:text-indigo-600 transition flex items-center gap-1.5 cursor-pointer group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition" />
                      <span>{row.source}</span>
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="font-semibold text-slate-800">{row.totalCount} โครงการ</span>
                    <span className="block text-[11px] text-slate-500">{formatCurrency(row.totalAllocated)}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="font-medium text-emerald-700">{row.completedCount} โครงการ</span>
                    <span className="block text-[11px] text-emerald-600">{formatCurrency(row.completedAmount)}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="font-medium text-amber-700">{row.inProgressCount} โครงการ</span>
                    <span className="block text-[11px] text-amber-600">{formatCurrency(row.inProgressAmount)}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="font-medium text-slate-600">{row.notStartedCount} โครงการ</span>
                    <span className="block text-[11px] text-slate-500">{formatCurrency(row.notStartedAmount)}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className="font-medium text-blue-700">{row.disbursedCount} โครงการ</span>
                    <span className="block text-[11px] text-blue-600">{formatCurrency(row.disbursedAmount)}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900">
                    {formatCurrency(row.remainingBudget)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Grand Total Footer */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="py-3.5 px-4 text-slate-900">
                  รวมทั้งสิ้น (Grand Total)
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <span className="text-indigo-900">{grandTotal.totalCount} โครงการ</span>
                  <span className="block text-[11px] text-indigo-700 font-semibold">{formatCurrency(grandTotal.totalAllocated)}</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-emerald-800">
                  <span>{grandTotal.completedCount} โครงการ</span>
                  <span className="block text-[11px] text-emerald-700">{formatCurrency(grandTotal.completedAmount)}</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-amber-800">
                  <span>{grandTotal.inProgressCount} โครงการ</span>
                  <span className="block text-[11px] text-amber-700">{formatCurrency(grandTotal.inProgressAmount)}</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-700">
                  <span>{grandTotal.notStartedCount} โครงการ</span>
                  <span className="block text-[11px] text-slate-600">{formatCurrency(grandTotal.notStartedAmount)}</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-blue-800">
                  <span>{grandTotal.disbursedCount} โครงการ</span>
                  <span className="block text-[11px] text-blue-700">{formatCurrency(grandTotal.disbursedAmount)}</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-indigo-950 font-bold text-sm">
                  {formatCurrency(grandTotal.remainingBudget)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
