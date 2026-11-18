import React, { useState, useRef } from 'react';
import { ProjectItem, BudgetSource, BUDGET_SOURCES } from '../types/project';
import {
  exportFullWorkbook,
  exportSingleSheet,
  downloadExcelTemplate,
  parseExcelFile,
  ParseResult,
} from '../utils/excelService';
import { formatCurrency, formatThaiDate } from '../utils/dateAndCalc';
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileDown,
  Layers,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FolderArchive,
  RefreshCw,
  Info,
  Calendar,
  Building,
  Check,
} from 'lucide-react';

interface ExcelManagerPageProps {
  projects: ProjectItem[];
  onImportComplete: (projects: ProjectItem[], mode: 'append' | 'replace') => void;
  onNavigateToProjects: () => void;
}

export const ExcelManagerPage: React.FC<ExcelManagerPageProps> = ({
  projects,
  onImportComplete,
  onNavigateToProjects,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Import Options States
  const [importItemType, setImportItemType] = useState<
    'all' | 'project_only' | 'equipment_only' | 'force_project' | 'force_equipment'
  >('all');
  const [importFiscalYear, setImportFiscalYear] = useState<'auto' | '2570' | 'ก่อนปี 2570'>('auto');
  const [importBudgetSource, setImportBudgetSource] = useState<'auto' | BudgetSource>('auto');
  const [importMode, setImportMode] = useState<'append' | 'replace_selected' | 'replace'>('append');

  // File parsing states
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute processed projects according to user-selected import types
  const getProcessedProjects = (): ProjectItem[] => {
    if (!parseResult || !parseResult.projects) return [];
    let list = [...parseResult.projects];

    // 1. Filter or override Item Type
    if (importItemType === 'project_only') {
      list = list.filter((p) => p.itemType === 'โครงการ');
    } else if (importItemType === 'equipment_only') {
      list = list.filter((p) => p.itemType === 'ครุภัณฑ์');
    } else if (importItemType === 'force_project') {
      list = list.map((p) => ({ ...p, itemType: 'โครงการ' as const }));
    } else if (importItemType === 'force_equipment') {
      list = list.map((p) => ({ ...p, itemType: 'ครุภัณฑ์' as const }));
    }

    // 2. Override Fiscal Year if chosen
    if (importFiscalYear === '2570') {
      list = list.map((p) => ({ ...p, fiscalYear: '2570' as const }));
    } else if (importFiscalYear === 'ก่อนปี 2570') {
      list = list.map((p) => ({ ...p, fiscalYear: 'ก่อนปี 2570' as const }));
    }

    // 3. Override Budget Source if chosen
    if (importBudgetSource !== 'auto') {
      list = list.map((p) => ({ ...p, budgetSource: importBudgetSource }));
    }

    return list;
  };

  const processedProjects = getProcessedProjects();

  const handleFileProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setIsSuccess(false);

    try {
      const result = await parseExcelFile(selectedFile);
      if (result.validRows === 0) {
        setParseError('ไม่พบแถวข้อมูลโครงการที่ถูกต้อง หรือไม่พบหัวคอลัมน์ชื่อโครงการในไฟล์');
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setParseError(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'โปรดตรวจสอบรูปแบบไฟล์'}`);
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileProcess(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileProcess(f);
  };

  const handleConfirmImport = () => {
    if (processedProjects.length === 0) {
      alert('ไม่พบรายการที่ตรงกับประเภทการนำเข้าที่เลือก');
      return;
    }

    if (importMode === 'replace') {
      if (
        !window.confirm(
          `คำเตือน: โหมดแทนที่ทั้งหมดจะล้างข้อมูลโครงการเดิม (${projects.length} รายการ) และแทนที่ด้วย ${processedProjects.length} รายการจากไฟล์ Excel นี้\n\nต้องการดำเนินการต่อหรือไม่?`
        )
      ) {
        return;
      }
      onImportComplete(processedProjects, 'replace');
    } else if (importMode === 'replace_selected') {
      // Selective replace: remove existing items that match the selected category and replace them
      let updatedList = [...projects];

      if (importFiscalYear !== 'auto') {
        updatedList = updatedList.filter((p) => p.fiscalYear !== importFiscalYear);
      } else if (importItemType === 'project_only') {
        updatedList = updatedList.filter((p) => p.itemType !== 'โครงการ');
      } else if (importItemType === 'equipment_only') {
        updatedList = updatedList.filter((p) => p.itemType !== 'ครุภัณฑ์');
      } else if (importBudgetSource !== 'auto') {
        updatedList = updatedList.filter((p) => p.budgetSource !== importBudgetSource);
      } else {
        // If no filter selected, replace all
        updatedList = [];
      }

      const combined = [...processedProjects, ...updatedList];
      if (
        !window.confirm(
          `ยืนยันแทนที่เฉพาะข้อมูลประเภทที่เลือก (${processedProjects.length} รายการ) โดยคงข้อมูลหมวดอื่นไว้ (${updatedList.length} รายการ)?`
        )
      ) {
        return;
      }
      onImportComplete(combined, 'replace');
    } else {
      // Append mode
      onImportComplete(processedProjects, 'append');
    }

    setIsSuccess(true);
    setTimeout(() => {
      onNavigateToProjects();
    }, 1200);
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setParseError(null);
    setIsSuccess(false);
    setImportItemType('all');
    setImportFiscalYear('auto');
    setImportBudgetSource('auto');
    setImportMode('append');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Counts for export categories
  const count2570 = projects.filter((p) => p.fiscalYear === '2570').length;
  const countPre = projects.filter((p) => p.fiscalYear === 'ก่อนปี 2570').length;
  const countProjects = projects.filter((p) => p.itemType === 'โครงการ').length;
  const countEquipments = projects.filter((p) => p.itemType === 'ครุภัณฑ์').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>ระบบจัดเก็บและเชื่อมโยง Excel (.xlsx / .xls / .csv)</span>
            </span>
            <span className="text-xs text-slate-500">เทศบาลเมืองมหาสารคาม</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">
            ระบบดาวน์โหลดและนำเข้าข้อมูลเป็น Excel
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ดาวน์โหลดเล่มรายงานฉบับสมบูรณ์ครบทุกชีต หรือนำเข้าข้อมูลโครงการผ่านแบบฟอร์มมาตรฐานภาษาไทย
          </p>
        </div>

        {/* Template Quick Download Button */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={downloadExcelTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>ดาวน์โหลด Template (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-t-xl shadow-xs">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'export'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>๑. ดาวน์โหลดข้อมูลเป็น Excel (Export)</span>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'import'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>๒. นำเข้าข้อมูล Excel เข้าสู่ระบบ (Import)</span>
        </button>
      </div>

      {/* TAB 1: EXPORT TAB */}
      {activeTab === 'export' && (
        <div className="bg-white p-6 rounded-b-xl border-x border-b border-slate-200 shadow-xs space-y-8 animate-fadeIn">
          {/* Main Full Workbook Export Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 rounded-2xl border border-emerald-200/90 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>ตัวเลือกแนะนำ: เล่มรายงานทางการสมบูรณ์</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  ดาวน์โหลดทั้งเล่มรายงานครบทุกชีต (Full Workbook)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สร้างไฟล์ Microsoft Excel (.xlsx) ฉบับสมบูรณ์ รวมข้อมูลทั้งหมด <strong>{projects.length}</strong> รายการ โดยจัดโครงสร้างเป็นหลายชีต (Multi-sheet) อัตโนมัติ:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span><strong>ชีตที่ ๑:</strong> สรุปภาพรวม ๖ แหล่งเงิน (ยอดตั้งไว้, เสร็จสิ้น, เบิกจ่าย, คงเหลือ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span><strong>ชีตที่ ๒:</strong> โครงการประจำปีงบประมาณ ๒๕๗๐ ({count2570} รายการ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span><strong>ชีตที่ ๓:</strong> โครงการก่อนปี ๒๕๗๐ ({countPre} รายการ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span><strong>ชีตที่ ๔:</strong> รวมข้อมูลทั้งหมด และชีตแยกราย ๖ แหล่งเงิน</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => exportFullWorkbook(projects)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-600/20 transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดทั้งเล่มรายงานครบทุกชีต (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: ดาวน์โหลดแยกตารางตามหมวดหมู่ / ปีงบประมาณ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  ตัวเลือกดาวน์โหลดแยกตารางตามหมวดหมู่ / ปีงบประมาณ
                </h4>
                <p className="text-xs text-slate-500">
                  ส่งออกเฉพาะหมวดหมู่หรือกลุ่มข้อมูลที่ต้องการในรูปแบบไฟล์ Excel เดี่ยว
                </p>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Year 2570 */}
              <div className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-indigo-700">ปีงบประมาณ</span>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    เฉพาะโครงการปี 2570
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    โครงการและครุภัณฑ์ที่ตั้งไว้ในปีงบประมาณ 2570 ทั้งหมด
                  </p>
                  <div className="mt-2 text-xs font-semibold text-slate-700 tabular-nums">
                    จำนวน {count2570} โครงการ
                  </div>
                </div>
                <button
                  onClick={() =>
                    exportSingleSheet(
                      projects.filter((p) => p.fiscalYear === '2570'),
                      'โครงการปี 2570',
                      `โครงการ_ปี2570_${new Date().toISOString().slice(0, 10)}.xlsx`
                    )
                  }
                  className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดาวน์โหลดไฟล์ปี 2570</span>
                </button>
              </div>

              {/* Prior to 2570 */}
              <div className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-indigo-700">ปีงบประมาณ</span>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    เฉพาะโครงการก่อนปี 2570
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    โครงการผูกพันและครุภัณฑ์ก่อนปีงบประมาณ 2570
                  </p>
                  <div className="mt-2 text-xs font-semibold text-slate-700 tabular-nums">
                    จำนวน {countPre} โครงการ
                  </div>
                </div>
                <button
                  onClick={() =>
                    exportSingleSheet(
                      projects.filter((p) => p.fiscalYear === 'ก่อนปี 2570'),
                      'โครงการก่อนปี 2570',
                      `โครงการ_ก่อนปี2570_${new Date().toISOString().slice(0, 10)}.xlsx`
                    )
                  }
                  className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดาวน์โหลดก่อนปี 2570</span>
                </button>
              </div>

              {/* By Item Type: Projects */}
              <div className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-blue-700">จำแนกประเภท</span>
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    เฉพาะงานโครงการ (งานก่อสร้าง/ปรับปรุง)
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    งานโครงสร้างพื้นฐาน ถนน สะพาน ท่อระบายน้ำ และอาคาร
                  </p>
                  <div className="mt-2 text-xs font-semibold text-slate-700 tabular-nums">
                    จำนวน {countProjects} รายการ
                  </div>
                </div>
                <button
                  onClick={() =>
                    exportSingleSheet(
                      projects.filter((p) => p.itemType === 'โครงการ'),
                      'รายการโครงการ',
                      `งบลงทุน_ประเภทโครงการ_${new Date().toISOString().slice(0, 10)}.xlsx`
                    )
                  }
                  className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดาวน์โหลดเฉพาะโครงการ</span>
                </button>
              </div>

              {/* By Item Type: Equipments */}
              <div className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-purple-700">จำแนกประเภท</span>
                    <Layers className="w-4 h-4 text-purple-600" />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    เฉพาะงานจัดซื้อครุภัณฑ์
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    ยานพาหนะ, ระบบเทคโนโลยีคอมพิวเตอร์, ครุภัณฑ์การแพทย์
                  </p>
                  <div className="mt-2 text-xs font-semibold text-slate-700 tabular-nums">
                    จำนวน {countEquipments} รายการ
                  </div>
                </div>
                <button
                  onClick={() =>
                    exportSingleSheet(
                      projects.filter((p) => p.itemType === 'ครุภัณฑ์'),
                      'รายการครุภัณฑ์',
                      `งบลงทุน_ประเภทครุภัณฑ์_${new Date().toISOString().slice(0, 10)}.xlsx`
                    )
                  }
                  className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดาวน์โหลดเฉพาะครุภัณฑ์</span>
                </button>
              </div>

              {/* By Budget Sources 6 */}
              <div className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition shadow-2xs flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-amber-700">จำแนกตามแหล่งเงิน</span>
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    ดาวน์โหลดแยกรายแหล่งงบประมาณ (๖ แหล่งเงิน)
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    เลือกดาวน์โหลดเฉพาะแหล่งเงินที่ต้องการส่งรายงานต้นสังกัด
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    {BUDGET_SOURCES.map((src) => {
                      const count = projects.filter((p) => p.budgetSource === src).length;
                      return (
                        <button
                          key={src}
                          onClick={() =>
                            exportSingleSheet(
                              projects.filter((p) => p.budgetSource === src),
                              src,
                              `โครงการ_${src.replace(/\s+/g, '_')}.xlsx`
                            )
                          }
                          className="p-2 text-left bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg transition text-[11px] group cursor-pointer"
                        >
                          <div className="font-semibold text-slate-800 truncate group-hover:text-amber-800">
                            {src}
                          </div>
                          <div className="text-slate-400 text-[10px] tabular-nums">
                            {count} รายการ · ดาวน์โหลด
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="bg-white p-6 rounded-b-xl border-x border-b border-slate-200 shadow-xs space-y-6 animate-fadeIn">
          {/* Instructions and Template Link */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  แบบฟอร์ม Template มาตรฐานภาษาไทย
                </h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  ระบบมีอัลกอริทึม Smart Mapping สามารถตรวจจับหัวคอลัมน์ภาษาไทยได้หลากหลายรูปแบบ แนะนำให้ใช้แบบฟอร์มแม่แบบเพื่อผลลัพธ์ที่แม่นยำที่สุด
                </p>
              </div>
            </div>
            <button
              onClick={downloadExcelTemplate}
              className="px-3.5 py-2 bg-white border border-blue-300 hover:bg-blue-100/50 text-blue-800 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>ดาวน์โหลด Template (.xlsx)</span>
            </button>
          </div>

          {/* Interactive Import Type & Category Selection */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>กำหนดตัวเลือกและประเภทการนำเข้าข้อมูล (Import Configuration)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกประเภทรายการ ปีงบประมาณ แหล่งเงิน และรูปแบบการจัดเก็บ เพื่อให้ข้อมูลถูกจัดหมวดหมู่อย่างถูกต้อง
                </p>
              </div>
              <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md font-medium">
                เลือกประเภทได้ก่อนหรือหลังเลือกไฟล์
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Option 1: ประเภทรายการ */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block font-bold text-slate-800">
                  ๑. เลือกประเภทรายการที่นำเข้า:
                </label>
                <select
                  value={importItemType}
                  onChange={(e) => setImportItemType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">ทั้งหมดตามไฟล์ (ทั้งโครงการและครุภัณฑ์)</option>
                  <option value="project_only">กรองเฉพาะประเภท "โครงการ" (งานก่อสร้าง)</option>
                  <option value="equipment_only">กรองเฉพาะประเภท "ครุภัณฑ์" (ยานพาหนะ/อุปกรณ์)</option>
                  <option value="force_project">บังคับกำหนดทุกรายการเป็น "โครงการ"</option>
                  <option value="force_equipment">บังคับกำหนดทุกรายการเป็น "ครุภัณฑ์"</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {importItemType === 'all'
                    ? 'อ่านประเภทจากคอลัมน์ในไฟล์อัตโนมัติ'
                    : importItemType.includes('only')
                    ? 'คัดกรองเฉพาะแถวที่ตรงกับประเภทที่เลือก'
                    : 'ปรับทุกรายการที่นำเข้าให้เป็นประเภทนี้'}
                </p>
              </div>

              {/* Option 2: ปีงบประมาณ */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block font-bold text-slate-800">
                  ๒. เลือกประเภทปีงบประมาณ:
                </label>
                <select
                  value={importFiscalYear}
                  onChange={(e) => setImportFiscalYear(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="auto">ตรวจจับตามไฟล์อัตโนมัติ (ปี 2570 / ก่อนปี 2570)</option>
                  <option value="2570">กำหนดเข้าสู่ "ปีงบประมาณ 2570" ทั้งหมด</option>
                  <option value="ก่อนปี 2570">กำหนดเข้าสู่ "ก่อนปี 2570" ทั้งหมด</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {importFiscalYear === 'auto'
                    ? 'ตรวจจับจากคอลัมน์ปีงบประมาณในไฟล์'
                    : `ระบุให้ทุกแถวในไฟล์นี้เป็นโครงการ ${importFiscalYear}`}
                </p>
              </div>

              {/* Option 3: แหล่งงบประมาณ ๖ แหล่งเงิน */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block font-bold text-slate-800">
                  ๓. เลือกประเภทแหล่งงบประมาณ:
                </label>
                <select
                  value={importBudgetSource}
                  onChange={(e) => setImportBudgetSource(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="auto">ตรวจจับตามไฟล์อัตโนมัติ (ตาม ๖ แหล่งเงิน)</option>
                  {BUDGET_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      กำหนดเป็น "{src}" ทั้งหมด
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {importBudgetSource === 'auto'
                    ? 'จัดเข้าตาม ๖ แหล่งเงินที่ระบุในไฟล์'
                    : `กำหนดให้ทุกแถวในไฟล์นี้มาจาก ${importBudgetSource}`}
                </p>
              </div>
            </div>

            {/* Storage Mode Selection */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ๔. เลือกรูปแบบการจัดเก็บฐานข้อมูล:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    importMode === 'append'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      เพิ่มต่อท้ายข้อมูลเดิม (Append)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      คงข้อมูลเดิม ({projects.length} รายการ) และเพิ่มข้อมูลใหม่เข้าไป
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    importMode === 'replace_selected'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace_selected"
                    checked={importMode === 'replace_selected'}
                    onChange={() => setImportMode('replace_selected')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      แทนที่เฉพาะประเภทที่เลือก (Selective)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      ล้างเฉพาะประเภท/ปีที่เลือก แล้วแทนที่ โดยไม่กระทบหมวดอื่น
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    importMode === 'replace'
                      ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      แทนที่ข้อมูลเดิมทั้งหมด (Replace All)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      ล้างข้อมูลเดิมในระบบทั้งหมด แล้วใช้ข้อมูลจากไฟล์นี้
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
              อัปโหลดไฟล์ (.xlsx, .xls หรือ .csv):
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleInputChange}
              className="hidden"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-7 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500 mb-2">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <h5 className="text-sm font-bold text-slate-800">
                คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
              </h5>
              <p className="text-xs text-slate-500 mt-0.5">
                รองรับไฟล์ Microsoft Excel (.xlsx, .xls) หรือไฟล์ข้อความ CSV (.csv)
              </p>
              {file && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-800 rounded-lg text-xs font-medium shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {isParsing && (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>กำลังอ่านและวิเคราะห์โครงสร้างคอลัมน์ Excel...</span>
            </div>
          )}

          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Section & Column Mapping Validation */}
          {parseResult && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              {/* Summary of parsing and active type filters */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>พร้อมนำเข้าตามประเภทที่เลือก: {processedProjects.length} รายการ</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (จากทั้งหมด {parseResult.validRows} รายการในไฟล์)
                      </span>
                    </h5>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                      <span className="text-slate-500">ประเภทที่เลือก:</span>
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {importItemType === 'all'
                          ? 'ทุกประเภทตามไฟล์'
                          : importItemType === 'project_only'
                          ? 'เฉพาะโครงการ'
                          : importItemType === 'equipment_only'
                          ? 'เฉพาะครุภัณฑ์'
                          : importItemType === 'force_project'
                          ? 'กำหนดเป็นโครงการทั้งหมด'
                          : 'กำหนดเป็นครุภัณฑ์ทั้งหมด'}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {importFiscalYear === 'auto' ? 'ปีงบฯ ตามไฟล์' : `ปีงบฯ ${importFiscalYear}`}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {importBudgetSource === 'auto' ? 'แหล่งเงินตามไฟล์' : importBudgetSource}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-emerald-800 tabular-nums">
                        งบประมาณรวม:{' '}
                        {formatCurrency(
                          processedProjects.reduce(
                            (sum, p) => sum + (Number(p.allocatedBudget) || 0) + (Number(p.transferBudget) || 0),
                            0
                          )
                        )}{' '}
                        บาท
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    ล้างการเลือก
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={processedProjects.length === 0}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      ยืนยันการนำเข้า {processedProjects.length} รายการ (
                      {importMode === 'append'
                        ? 'ต่อท้าย'
                        : importMode === 'replace_selected'
                        ? 'แทนที่เฉพาะประเภทที่เลือก'
                        : 'แทนที่ทั้งหมด'}
                      )
                    </span>
                  </button>
                </div>
              </div>

              {/* Detected columns badge cloud */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">
                  หัวคอลัมน์ที่ตรวจพบจากไฟล์ Excel:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parseResult.detectedColumns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data Table Preview according to selected options */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    ตัวอย่างข้อมูลที่จะนำเข้า (แสดง {Math.min(processedProjects.length, 8)} รายการแรก):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    แสดงตามประเภทและตัวกรองที่เลือกด้านบน
                  </span>
                </div>

                {processedProjects.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                    ไม่พบรายการที่ตรงกับประเภทการนำเข้าที่เลือก กรุณาปรับเปลี่ยนตัวเลือกด้านบน
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                        <tr>
                          <th className="py-2 px-3">ลำดับ</th>
                          <th className="py-2 px-3">ปีงบฯ</th>
                          <th className="py-2 px-3">ประเภท</th>
                          <th className="py-2 px-3 min-w-[200px]">รายการ (ชื่อโครงการ)</th>
                          <th className="py-2 px-3">แหล่งงบประมาณ</th>
                          <th className="py-2 px-3 text-right">งบประมาณที่ตั้งไว้</th>
                          <th className="py-2 px-3 text-right">วงเงินตามสัญญา</th>
                          <th className="py-2 px-3">วันคืนหลักประกัน (คำนวณอัตโนมัติ)</th>
                          <th className="py-2 px-3">สถานะโครงการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processedProjects.slice(0, 8).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">{p.fiscalYear}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  p.itemType === 'ครุภัณฑ์'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {p.itemType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900 max-w-[220px] truncate">{p.name}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{p.budgetSource}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-800">
                              {formatCurrency(p.allocatedBudget)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                              {p.contractAmount > 0 ? formatCurrency(p.contractAmount) : '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-amber-800">
                              {p.guaranteeDueDate ? formatThaiDate(p.guaranteeDueDate) : '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-600">{p.projectStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {processedProjects.length > 8 && (
                  <p className="text-[11px] text-slate-500 text-center pt-1">
                    ...และโครงการอื่น ๆ อีก {processedProjects.length - 8} รายการ
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success Notification */}
          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">นำเข้าข้อมูลสำเร็จ!</p>
                <p className="mt-0.5">ระบบได้บันทึกข้อมูลและอัปเดตลงสู่ฐานข้อมูลเรียบร้อยแล้ว กำลังนำท่านกลับสู่หน้ารายการ...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
