import React, { useState } from 'react';
import { ProjectItem, BudgetSource, BUDGET_SOURCES } from '../types/project';
import {
  formatCurrency,
  formatThaiDate,
  toThaiNumerals,
  getCurrentThaiDateFull,
} from '../utils/dateAndCalc';
import { Printer, FileText, Download, Calendar, ArrowLeft } from 'lucide-react';

interface OfficialMemoReportProps {
  projects: ProjectItem[];
  selectedFiscalYear: '2570' | 'ก่อนปี 2570' | 'all';
  onBack: () => void;
}

export const OfficialMemoReport: React.FC<OfficialMemoReportProps> = ({
  projects,
  selectedFiscalYear,
  onBack,
}) => {
  const [reportDate, setReportDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [memoNo, setMemoNo] = useState('มค ๕๒๐๐๓/       ');
  const [subject, setSubject] = useState(
    'รายงานผลการดำเนินงานและติดตามการใช้จ่ายงบลงทุน ฝ่ายพัสดุและทรัพย์สิน กองคลัง ประจำปีงบประมาณ พ.ศ. ๒๕๗๐'
  );
  const [reporterPosition] = useState('เจ้าหน้าที่ฝ่ายพัสดุและทรัพย์สิน');

  const filteredProjects = projects.filter((p) => {
    if (selectedFiscalYear === 'all') return true;
    return p.fiscalYear === selectedFiscalYear;
  });

  const totalAllocated = filteredProjects.reduce(
    (sum, p) => sum + (Number(p.allocatedBudget) || 0) + (Number(p.transferBudget) || 0),
    0
  );
  const totalContract = filteredProjects.reduce(
    (sum, p) => sum + (Number(p.contractAmount) || 0) + (Number(p.contractAdjust) || 0),
    0
  );
  const totalDisbursed = filteredProjects
    .filter((p) => p.disbursementStatus === 'ชำระเงินแล้ว')
    .reduce((sum, p) => sum + (Number(p.contractAmount) || Number(p.allocatedBudget) || 0), 0);
  const totalRemaining = filteredProjects.reduce((sum, p) => sum + (Number(p.remainingBudget) || 0), 0);

  const completedCount = filteredProjects.filter((p) => p.projectStatus === 'ดำเนินการแล้วเสร็จ').length;
  const inProgressCount = filteredProjects.filter((p) =>
    p.projectStatus.includes('อยู่ระหว่าง')
  ).length;
  const notStartedCount = filteredProjects.filter((p) => p.projectStatus === 'ยังไม่เริ่มดำเนินการ').length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    const memoElement = document.getElementById('official-memo-document');
    if (!memoElement) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>บันทึกข้อความ</title>
        <style>
          body { font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', Tahoma, sans-serif; font-size: 16pt; line-height: 1.35; margin: 20mm; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; }
          th, td { border: 1px solid #333; padding: 6px; font-size: 14pt; }
          th { background-color: #f2f2f2; text-align: center; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .memo-title { font-size: 29pt; font-weight: bold; text-align: center; margin-bottom: 20px; }
          .sign-grid { margin-top: 40px; width: 100%; border: none; }
          .sign-grid td { border: none; text-align: center; vertical-align: top; width: 33.33%; padding: 15px; }
        </style>
      </head>
      <body>
        ${memoElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `บันทึกข้อความ_รายงานผลพัสดุ_${selectedFiscalYear}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar (No-Print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้ารายการ</span>
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              แบบรายงานทางการราชการ (Official Memorandum)
            </h3>
            <p className="text-xs text-slate-500">
              บันทึกข้อความราชการ เทศบาลเมืองมหาสารคาม พร้อมช่องลงนาม 3 ตำแหน่ง
            </p>
          </div>
        </div>

        {/* Date Selector and Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-medium text-slate-600">วันที่รายงาน:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleDownloadWord}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            title="บันทึกเป็นเอกสาร Word (.doc)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>บันทึกเป็น Word (.doc)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            title="พิมพ์ออกเครื่องพิมพ์ หรือ บันทึกเป็น PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* Official Government Memorandum Paper Document (A4 format) */}
      <div className="flex justify-center">
        <div
          id="official-memo-document"
          className="memo-container bg-white w-full max-w-[850px] p-8 md:p-14 shadow-lg border border-slate-300 rounded-sm text-slate-900 font-sans leading-relaxed"
          style={{ fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif" }}
        >
          {/* Memorandum Title - NO LOGO as specified */}
          <div className="text-center pb-4 mb-4 border-b border-black">
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1">
              บันทึกข้อความ
            </h1>
          </div>

          {/* Header Metadata Block */}
          <div className="space-y-1.5 text-sm md:text-base border-b border-black pb-4 mb-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold">ส่วนราชการ : </span>
                <span>ฝ่ายพัสดุและทรัพย์สิน กองคลัง เทศบาลเมืองมหาสารคาม โทร. ๐-๔๓๗๑-๑๑๗๘</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="font-bold">ที่ : </span>
                <span>{memoNo}</span>
              </div>
              <div className="md:text-right">
                <span className="font-bold">วันที่ : </span>
                <span>{formatThaiDate(reportDate, true)}</span>
              </div>
            </div>

            <div>
              <span className="font-bold">เรื่อง : </span>
              <span>{subject}</span>
            </div>

            <div className="pt-1">
              <span className="font-bold">เรียน : </span>
              <span>นายกเทศมนตรีเมืองมหาสารคาม (ผ่าน ผู้อำนวยการกองคลัง)</span>
            </div>
          </div>

          {/* Memo Body */}
          <div className="text-sm md:text-base space-y-4 text-justify indent-8">
            <p>
              ตามที่ฝ่ายพัสดุและทรัพย์สิน กองคลัง เทศบาลเมืองมหาสารคาม ได้ดำเนินการจัดซื้อจัดจ้างและบริหารสัญญาโครงการงบลงทุน (โครงการพัฒนาโครงสร้างพื้นฐานและจัดซื้อครุภัณฑ์) {selectedFiscalYear === 'all' ? 'ทุกปีงบประมาณ' : `ประจำปีงบประมาณ พ.ศ. ${selectedFiscalYear}`} เพื่อให้เป็นไปตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ และแผนการดำเนินงานของเทศบาลเมืองมหาสารคาม นั้น
            </p>

            <p>
              ในการนี้ ฝ่ายพัสดุและทรัพย์สิน กองคลัง ได้รวบรวมและสรุปผลการดำเนินงานงบลงทุน จำนวนทั้งสิ้น{' '}
              <span className="font-bold tabular-nums">{toThaiNumerals(filteredProjects.length)}</span> โครงการ/รายการ งบประมาณที่ได้รับตั้งไว้รวมทั้งสิ้น{' '}
              <span className="font-bold tabular-nums">{toThaiNumerals(formatCurrency(totalAllocated))}</span> บาท วงเงินตามสัญญาจัดซื้อจัดจ้างรวม{' '}
              <span className="font-bold tabular-nums">{toThaiNumerals(formatCurrency(totalContract))}</span> บาท ดำเนินการเบิกจ่ายชำระเงินแล้วจำนวน{' '}
              <span className="font-bold tabular-nums">{toThaiNumerals(formatCurrency(totalDisbursed))}</span> บาท และมีงบประมาณคงเหลือทั้งสิ้น{' '}
              <span className="font-bold tabular-nums">{toThaiNumerals(formatCurrency(totalRemaining))}</span> บาท โดยมีรายละเอียดจำแนกตามประเภทแหล่งงบประมาณ ๖ แหล่งเงิน ดังนี้
            </p>
          </div>

          {/* Summary Table inside memo */}
          <div className="my-5 overflow-x-auto">
            <table className="w-full text-xs md:text-sm border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100/90 text-black font-semibold text-center">
                  <th className="border border-black p-2 w-10">ลำดับ</th>
                  <th className="border border-black p-2">แหล่งงบประมาณ</th>
                  <th className="border border-black p-2 text-right">จำนวนโครงการ</th>
                  <th className="border border-black p-2 text-right">งบประมาณที่ได้รับ (บาท)</th>
                  <th className="border border-black p-2 text-right">วงเงินตามสัญญา (บาท)</th>
                  <th className="border border-black p-2 text-right">งบประมาณคงเหลือ (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_SOURCES.map((source, idx) => {
                  const sProjects = filteredProjects.filter((p) => p.budgetSource === source);
                  const sAllocated = sProjects.reduce(
                    (sum, p) => sum + (Number(p.allocatedBudget) || 0) + (Number(p.transferBudget) || 0),
                    0
                  );
                  const sContract = sProjects.reduce(
                    (sum, p) => sum + (Number(p.contractAmount) || 0) + (Number(p.contractAdjust) || 0),
                    0
                  );
                  const sRemaining = sProjects.reduce(
                    (sum, p) => sum + (Number(p.remainingBudget) || 0),
                    0
                  );

                  return (
                    <tr key={source}>
                      <td className="border border-black p-1.5 text-center">{toThaiNumerals(idx + 1)}</td>
                      <td className="border border-black p-1.5">{source}</td>
                      <td className="border border-black p-1.5 text-right tabular-nums">
                        {toThaiNumerals(sProjects.length)}
                      </td>
                      <td className="border border-black p-1.5 text-right tabular-nums">
                        {toThaiNumerals(formatCurrency(sAllocated))}
                      </td>
                      <td className="border border-black p-1.5 text-right tabular-nums">
                        {toThaiNumerals(formatCurrency(sContract))}
                      </td>
                      <td className="border border-black p-1.5 text-right tabular-nums">
                        {toThaiNumerals(formatCurrency(sRemaining))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-100 text-black">
                  <td colSpan={2} className="border border-black p-2 text-center">
                    รวมทั้งสิ้น
                  </td>
                  <td className="border border-black p-2 text-right tabular-nums">
                    {toThaiNumerals(filteredProjects.length)}
                  </td>
                  <td className="border border-black p-2 text-right tabular-nums">
                    {toThaiNumerals(formatCurrency(totalAllocated))}
                  </td>
                  <td className="border border-black p-2 text-right tabular-nums">
                    {toThaiNumerals(formatCurrency(totalContract))}
                  </td>
                  <td className="border border-black p-2 text-right tabular-nums">
                    {toThaiNumerals(formatCurrency(totalRemaining))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status summary list */}
          <div className="text-sm md:text-base space-y-1 indent-8">
            <p>
              ด้านความก้าวหน้าการดำเนินงาน: ดำเนินการแล้วเสร็จจำนวน{' '}
              <span className="font-bold">{toThaiNumerals(completedCount)}</span> โครงการ, อยู่ระหว่างดำเนินงาน/บริหารสัญญา/จัดซื้อจัดจ้างจำนวน{' '}
              <span className="font-bold">{toThaiNumerals(inProgressCount)}</span> โครงการ และยังไม่เริ่มดำเนินการจำนวน{' '}
              <span className="font-bold">{toThaiNumerals(notStartedCount)}</span> โครงการ
            </p>
            <p className="pt-2">
              จึงเรียนมาเพื่อโปรดทราบและพิจารณา
            </p>
          </div>

          {/* Signature Block: Exactly 3 Positions as requested by User */}
          <div className="mt-12 pt-4 border-t border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs md:text-sm">
              {/* Position 1: ผู้รายงาน */}
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">ผู้รายงาน</p>
                <div className="pt-10">
                  <p>(ลงชื่อ).......................................................</p>
                  <p className="font-medium mt-1">(.......................................................)</p>
                  <p className="text-slate-600 text-xs">{reporterPosition}</p>
                  <p className="text-slate-600 text-xs mt-1">วันที่ ......../......../........</p>
                </div>
              </div>

              {/* Position 2: ผู้ตรวจสอบ (ผู้อำนวยการกองคลัง) */}
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">ผู้ตรวจสอบ</p>
                <div className="pt-10">
                  <p>(ลงชื่อ).......................................................</p>
                  <p className="font-medium mt-1">(.......................................................)</p>
                  <p className="text-slate-600 text-xs">ผู้อำนวยการกองคลัง</p>
                  <p className="text-slate-600 text-xs mt-1">วันที่ ......../......../........</p>
                </div>
              </div>

              {/* Position 3: ผู้พิจารณาอนุมัติ (นายกเทศมนตรีเมืองมหาสารคาม) */}
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">ผู้พิจารณาอนุมัติ</p>
                <div className="pt-10">
                  <p>(ลงชื่อ).......................................................</p>
                  <p className="font-medium mt-1">(.......................................................)</p>
                  <p className="text-slate-600 text-xs">นายกเทศมนตรีเมืองมหาสารคาม</p>
                  <p className="text-slate-600 text-xs mt-1">วันที่ ......../......../........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
