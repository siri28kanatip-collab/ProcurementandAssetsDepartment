import React, { useState, useRef } from 'react';
import { ProjectItem } from '../types/project';
import {
  exportFullWorkbook,
  exportSingleSheet,
  downloadExcelTemplate,
  parseExcelFile,
} from '../utils/excelService';
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  AlertTriangle,
  X,
  FileDown,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '../utils/dateAndCalc';

interface ExcelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  onImportComplete: (projects: ProjectItem[], mode: 'append' | 'replace') => void;
  selectedFiscalYear: string;
}

export const ExcelManagerModal: React.FC<ExcelManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  onImportComplete,
  selectedFiscalYear,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importItemType, setImportItemType] = useState<
    'all' | 'project_only' | 'equipment_only' | 'force_project' | 'force_equipment'
  >('all');
  const [importFiscalYear, setImportFiscalYear] = useState<'auto' | '2570' | 'ก่อนปี 2570'>('auto');
  const [importBudgetSource, setImportBudgetSource] = useState<'auto' | string>('auto');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedData, setParsedData] = useState<ProjectItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProcessedData = (): ProjectItem[] => {
    let list = [...parsedData];
    if (importItemType === 'project_only') {
      list = list.filter((p) => p.itemType === 'โครงการ');
    } else if (importItemType === 'equipment_only') {
      list = list.filter((p) => p.itemType === 'ครุภัณฑ์');
    } else if (importItemType === 'force_project') {
      list = list.map((p) => ({ ...p, itemType: 'โครงการ' as const }));
    } else if (importItemType === 'force_equipment') {
      list = list.map((p) => ({ ...p, itemType: 'ครุภัณฑ์' as const }));
    }

    if (importFiscalYear === '2570') {
      list = list.map((p) => ({ ...p, fiscalYear: '2570' as const }));
    } else if (importFiscalYear === 'ก่อนปี 2570') {
      list = list.map((p) => ({ ...p, fiscalYear: 'ก่อนปี 2570' as const }));
    }

    if (importBudgetSource !== 'auto') {
      list = list.map((p) => ({ ...p, budgetSource: importBudgetSource as any }));
    }

    return list;
  };

  const processedData = getProcessedData();

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrorMessage(null);
    setImportSuccess(false);

    try {
      const result = await parseExcelFile(file);
      if (!result || result.projects.length === 0) {
        setErrorMessage('ไม่พบข้อมูลโครงการในไฟล์ หรือรูปแบบคอลัมน์ไม่ตรงกับเทมเพลต');
      } else {
        setParsedData(result.projects);
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setErrorMessage(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'โปรดตรวจสอบรูปแบบไฟล์'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (processedData.length === 0) return;
    onImportComplete(processedData, importMode);
    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ระบบดาวน์โหลดและนำเข้าข้อมูลเป็น Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500">
                ฝ่ายพัสดุและทรัพย์สิน กองคลัง เทศบาลเมืองมหาสารคาม
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดข้อมูล (Export Excel)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าข้อมูล (Import Excel)</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <h4 className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <FileDown className="w-4 h-4 text-emerald-700" />
                  <span>ดาวน์โหลดทั้งเล่มรายงานครบทุกชีต (แนะนำ)</span>
                </h4>
                <p className="text-xs text-emerald-800 mb-4 leading-relaxed">
                  ดาวน์โหลดไฟล์ Excel (.xlsx) ฉบับสมบูรณ์ ประกอบด้วย ชีตสรุปภาพรวม ๖ แหล่งเงิน, ชีตโครงการปี ๒๕๗๐, ชีตโครงการก่อนปี ๒๕๗๐ และชีตรวมข้อมูลทั้งหมด พร้อมสูตรคำนวณและฟิลด์ข้อมูลครบถ้วน
                </p>
                <button
                  onClick={() => exportFullWorkbook(projects)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดทั้งเล่มรายงานครบทุกชีต (.xlsx)</span>
                </button>
              </div>

              {/* Segmented Exports */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  หรือเลือกดาวน์โหลดแยกตารางตามหมวดหมู่:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">เฉพาะโครงการปี 2570</div>
                      <div className="text-[11px] text-slate-500">
                        {projects.filter((p) => p.fiscalYear === '2570').length} โครงการ/รายการ
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        exportSingleSheet(
                          projects.filter((p) => p.fiscalYear === '2570'),
                          'โครงการปี 2570',
                          'โครงการ_งบลงทุน_ปี2570.xlsx'
                        )
                      }
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition cursor-pointer"
                    >
                      ดาวน์โหลด
                    </button>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">เฉพาะโครงการก่อนปี 2570</div>
                      <div className="text-[11px] text-slate-500">
                        {projects.filter((p) => p.fiscalYear === 'ก่อนปี 2570').length} โครงการ/รายการ
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        exportSingleSheet(
                          projects.filter((p) => p.fiscalYear === 'ก่อนปี 2570'),
                          'โครงการก่อนปี 2570',
                          'โครงการ_งบลงทุน_ก่อนปี2570.xlsx'
                        )
                      }
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition cursor-pointer"
                    >
                      ดาวน์โหลด
                    </button>
                  </div>
                </div>
              </div>

              {/* Template Download Card */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-800">
                    แบบฟอร์มเปล่าสำหรับนำเข้าข้อมูล (Excel Template)
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    มีหัวคอลัมน์มาตรฐานครบทุกช่อง พร้อมตัวอย่างข้อมูลเพื่อให้สามารถกรอกแล้วอัปโหลดกลับได้
                  </p>
                </div>
                <button
                  onClick={downloadExcelTemplate}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ดาวน์โหลด Template</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Template notice */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-700">
                    แนะนำให้ใช้แบบฟอร์ม Template มาตรฐานเพื่อความถูกต้องของการจัดเก็บฐานข้อมูล
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="text-xs text-indigo-600 hover:underline font-medium shrink-0"
                >
                  ดาวน์โหลด Template (.xlsx)
                </button>
              </div>

              {/* Import Options / Type Selection */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  เลือกประเภทและตัวกรองการนำเข้า:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ประเภทรายการ:
                    </label>
                    <select
                      value={importItemType}
                      onChange={(e) => setImportItemType(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    >
                      <option value="all">ทั้งหมดตามไฟล์ (โครงการ/ครุภัณฑ์)</option>
                      <option value="project_only">กรองเฉพาะ "โครงการ"</option>
                      <option value="equipment_only">กรองเฉพาะ "ครุภัณฑ์"</option>
                      <option value="force_project">กำหนดเป็นโครงการทั้งหมด</option>
                      <option value="force_equipment">กำหนดเป็นครุภัณฑ์ทั้งหมด</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ปีงบประมาณ:
                    </label>
                    <select
                      value={importFiscalYear}
                      onChange={(e) => setImportFiscalYear(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    >
                      <option value="auto">ตามไฟล์อัตโนมัติ</option>
                      <option value="2570">ปีงบประมาณ 2570 ทั้งหมด</option>
                      <option value="ก่อนปี 2570">ก่อนปี 2570 ทั้งหมด</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      แหล่งงบประมาณ:
                    </label>
                    <select
                      value={importBudgetSource}
                      onChange={(e) => setImportBudgetSource(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    >
                      <option value="auto">ตามไฟล์อัตโนมัติ (๖ แหล่งเงิน)</option>
                      <option value="เงินงบประมาณ">เงินงบประมาณ</option>
                      <option value="เงินงบประมาณค้างจ่าย">เงินงบประมาณค้างจ่าย</option>
                      <option value="เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ">เงินอุดหนุนเฉพาะกิจ</option>
                      <option value="เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ ค้างจ่าย">เงินอุดหนุนเฉพาะกิจ ค้างจ่าย</option>
                      <option value="เงินสะสม">เงินสะสม</option>
                      <option value="เงินกู้">เงินกู้</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    รูปแบบการจัดเก็บ:
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="modalImportMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-indigo-600"
                      />
                      <span>เพิ่มต่อท้ายข้อมูลเดิม</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="modalImportMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-amber-600"
                      />
                      <span>แทนที่ข้อมูลเดิมทั้งหมด</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* File Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  อัปโหลดไฟล์ (.xlsx, .xls หรือ .csv)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    รองรับไฟล์ Excel (.xlsx, .xls) หรือ CSV
                  </p>
                  {fileName && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-indigo-700">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{fileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {isParsing && (
                <div className="p-3 text-center text-xs text-slate-500">
                  กำลังประมวลผลไฟล์...
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Preview parsed data */}
              {processedData.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      ตัวอย่างข้อมูลตามประเภทที่เลือก ({processedData.length} รายการ):
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      พร้อมนำเข้าสู่ระบบ
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          <th className="py-2 px-3">ปี</th>
                          <th className="py-2 px-3">ประเภท</th>
                          <th className="py-2 px-3">รายการ</th>
                          <th className="py-2 px-3">แหล่งงบ</th>
                          <th className="py-2 px-3 text-right">งบประมาณ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processedData.slice(0, 5).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 whitespace-nowrap">{item.fiscalYear}</td>
                            <td className="py-1.5 px-3 whitespace-nowrap">{item.itemType}</td>
                            <td className="py-1.5 px-3 max-w-[200px] truncate">{item.name}</td>
                            <td className="py-1.5 px-3 whitespace-nowrap">{item.budgetSource}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums">
                              {formatCurrency(item.allocatedBudget)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {processedData.length > 5 && (
                    <p className="text-[11px] text-slate-500 text-center">
                      ...และอีก {processedData.length - 5} รายการ
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedData([]);
                        setFileName('');
                      }}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      ล้างไฟล์
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        ยืนยันการนำเข้า {processedData.length} รายการ (
                        {importMode === 'append' ? 'ต่อท้าย' : 'แทนที่'})
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>นำเข้าข้อมูลเรียบร้อยแล้วและบันทึกสู่ฐานข้อมูล</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
