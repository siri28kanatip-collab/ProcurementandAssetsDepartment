import * as XLSX from 'xlsx';
import { ProjectItem, BudgetSource, BUDGET_SOURCES, PROJECT_STATUS_OPTIONS } from '../types/project';
import { calculateGuaranteeDueDate, calculateRemainingBudget } from './dateAndCalc';

// Column mapping for Thai Excel headers
export const EXCEL_COLUMNS = [
  { key: 'fiscalYear', label: 'ปีงบประมาณ' },
  { key: 'itemType', label: 'ประเภท (โครงการ/ครุภัณฑ์)' },
  { key: 'name', label: 'รายการ (ชื่อโครงการ)' },
  { key: 'budgetSource', label: 'แหล่งงบประมาณ' },
  { key: 'allocatedBudget', label: 'งบประมาณที่ได้รับตั้งไว้ (บาท)' },
  { key: 'transferBudget', label: 'โอนลด/โอนเพิ่ม (บาท)' },
  { key: 'contractNo', label: 'เลขที่สัญญา' },
  { key: 'contractor', label: 'คู่สัญญา' },
  { key: 'contractAmount', label: 'วงเงินตามสัญญา (บาท)' },
  { key: 'contractAdjust', label: 'การลด/การเพิ่มวงเงินสัญญา (บาท)' },
  { key: 'startDate', label: 'วันที่เริ่มสัญญา (ปปปป-ดด-วว)' },
  { key: 'endDate', label: 'วันที่สิ้นสุดสัญญา (ปปปป-ดด-วว)' },
  { key: 'guaranteeAmount', label: 'ค่าหลักประกันสัญญา (บาท)' },
  { key: 'guaranteeReturnYears', label: 'ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)' },
  { key: 'acceptanceDate', label: 'วันที่ตรวจรับงาน (ปปปป-ดด-วว)' },
  { key: 'guaranteeDueDate', label: 'วันที่ครบกำหนดคืนเงินหลักประกันสัญญา (คำนวณอัตโนมัติ)' },
  { key: 'guaranteeStatus', label: 'สถานะหลักประกันสัญญา (คืนเงินแล้ว/ยังไม่คืนเงิน)' },
  { key: 'deliveryDate', label: 'วันส่งมอบงาน (ปปปป-ดด-วว)' },
  { key: 'projectStatus', label: 'สถานะของโครงการ' },
  { key: 'disbursementStatus', label: 'การเบิกจ่าย (ชำระเงินแล้ว/อยู่ระหว่างดำเนินการ)' },
  { key: 'remainingBudget', label: 'งบประมาณคงเหลือ (บาท)' },
  { key: 'remarks', label: 'หมายเหตุ' },
];

export function projectToRow(p: ProjectItem): Record<string, any> {
  return {
    'ปีงบประมาณ': p.fiscalYear,
    'ประเภท (โครงการ/ครุภัณฑ์)': p.itemType,
    'รายการ (ชื่อโครงการ)': p.name,
    'แหล่งงบประมาณ': p.budgetSource,
    'งบประมาณที่ได้รับตั้งไว้ (บาท)': p.allocatedBudget,
    'โอนลด/โอนเพิ่ม (บาท)': p.transferBudget,
    'เลขที่สัญญา': p.contractNo || '-',
    'คู่สัญญา': p.contractor || '-',
    'วงเงินตามสัญญา (บาท)': p.contractAmount,
    'การลด/การเพิ่มวงเงินสัญญา (บาท)': p.contractAdjust,
    'วันที่เริ่มสัญญา': p.startDate || '-',
    'วันที่สิ้นสุดสัญญา': p.endDate || '-',
    'ค่าหลักประกันสัญญา (บาท)': p.guaranteeAmount,
    'ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)': p.guaranteeReturnYears,
    'วันที่ตรวจรับงาน': p.acceptanceDate || '-',
    'วันที่ครบกำหนดคืนเงินหลักประกันสัญญา': p.guaranteeDueDate || '-',
    'สถานะหลักประกันสัญญา': p.guaranteeStatus,
    'วันส่งมอบงาน': p.deliveryDate || '-',
    'สถานะของโครงการ': p.projectStatus,
    'การเบิกจ่าย': p.disbursementStatus,
    'งบประมาณคงเหลือ (บาท)': p.remainingBudget,
    'หมายเหตุ': p.remarks || '',
  };
}

/**
 * 1. ดาวน์โหลดทั้งเล่มรายงานครบทุกชีต
 * (ชีตสรุปภาพรวม ๖ แหล่งเงิน, ชีตโครงการปี ๒๕๗๐, ชีตโครงการก่อนปี ๒๕๗๐, ชีตรวมข้อมูลทั้งหมด และชีตแยกแต่ละแหล่งเงิน)
 */
export function exportFullWorkbook(projects: ProjectItem[], filename?: string) {
  const wb = XLSX.utils.book_new();

  // 1. ชีตสรุปภาพรวม ๖ แหล่งเงิน
  const summaryRows = BUDGET_SOURCES.map((source) => {
    const list = projects.filter((p) => p.budgetSource === source);
    const totalCount = list.length;
    const totalAllocated = list.reduce((sum, p) => sum + p.allocatedBudget + p.transferBudget, 0);
    const completed = list.filter((p) => p.projectStatus === 'ดำเนินการแล้วเสร็จ');
    const inProgress = list.filter(
      (p) =>
        p.projectStatus === 'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)' ||
        p.projectStatus === 'อยู่ระหว่างประกาศจัดซื้อจัดจ้าง' ||
        p.projectStatus === 'อยู่ระหว่างการจัดทำ TOR /ราคากลาง'
    );
    const notStarted = list.filter((p) => p.projectStatus === 'ยังไม่เริ่มดำเนินการ');
    const disbursed = list.filter((p) => p.disbursementStatus === 'ชำระเงินแล้ว');
    const pendingDisburse = list.filter((p) => p.disbursementStatus === 'อยู่ระหว่างดำเนินการ');
    const totalRemaining = list.reduce((sum, p) => sum + p.remainingBudget, 0);

    return {
      'แหล่งงบประมาณ': source,
      'จำนวนทั้งหมด (โครงการ)': totalCount,
      'งบประมาณรวมที่ได้รับ (บาท)': totalAllocated,
      'เสร็จสิ้น (โครงการ)': completed.length,
      'เงินเสร็จสิ้น (บาท)': completed.reduce((s, p) => s + (p.contractAmount || p.allocatedBudget), 0),
      'อยู่ระหว่างดำเนินการ (โครงการ)': inProgress.length,
      'เงินอยู่ระหว่างดำเนินการ (บาท)': inProgress.reduce((s, p) => s + (p.contractAmount || p.allocatedBudget), 0),
      'ยังไม่ดำเนินการ (โครงการ)': notStarted.length,
      'เงินยังไม่ดำเนินการ (บาท)': notStarted.reduce((s, p) => s + p.allocatedBudget, 0),
      'ชำระเงินแล้ว (โครงการ)': disbursed.length,
      'เงินที่ชำระแล้ว (บาท)': disbursed.reduce((s, p) => s + (p.contractAmount || p.allocatedBudget), 0),
      'รอเบิกจ่าย (โครงการ)': pendingDisburse.length,
      'เงินรอเบิกจ่าย (บาท)': pendingDisburse.reduce((s, p) => s + (p.contractAmount || p.allocatedBudget), 0),
      'งบประมาณคงเหลือรวม (บาท)': totalRemaining,
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม ๖ แหล่งเงิน');

  // 2. ชีตโครงการปี ๒๕๗๐
  const p2570 = projects.filter((p) => p.fiscalYear === '2570');
  const ws2570 = XLSX.utils.json_to_sheet(p2570.map(projectToRow));
  XLSX.utils.book_append_sheet(wb, ws2570, 'ชีตโครงการปี ๒๕๗๐');

  // 3. ชีตโครงการก่อนปี ๒๕๗๐
  const pPre = projects.filter((p) => p.fiscalYear === 'ก่อนปี 2570');
  const wsPre = XLSX.utils.json_to_sheet(pPre.map(projectToRow));
  XLSX.utils.book_append_sheet(wb, wsPre, 'ชีตโครงการก่อนปี ๒๕๗๐');

  // 4. ชีตรวมข้อมูลทั้งหมด
  const wsAll = XLSX.utils.json_to_sheet(projects.map(projectToRow));
  XLSX.utils.book_append_sheet(wb, wsAll, 'ชีตรวมข้อมูลทั้งหมด');

  // 5. ชีตแยกตามแต่ละแหล่งเงิน ๖ แหล่ง
  BUDGET_SOURCES.forEach((source) => {
    const sourceProjects = projects.filter((p) => p.budgetSource === source);
    if (sourceProjects.length > 0) {
      const sheetName = source.length > 25 ? source.slice(0, 25) : source;
      const wsSource = XLSX.utils.json_to_sheet(sourceProjects.map(projectToRow));
      XLSX.utils.book_append_sheet(wb, wsSource, sheetName);
    }
  });

  const name =
    filename ||
    `เล่มรายงานผลการดำเนินงาน_พัสดุและทรัพย์สิน_เทศบาลเมืองมหาสารคาม_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}

/**
 * 2. ดาวน์โหลดแยกตารางตามหมวดหมู่ / ปีงบประมาณ
 */
export function exportSingleSheet(projects: ProjectItem[], sheetTitle: string, filename: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(projects.map(projectToRow));
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/**
 * 3. ดาวน์โหลด Template มาตรฐานภาษาไทย พร้อมตัวอย่างข้อมูลและคำอธิบาย
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: แบบฟอร์มกรอกข้อมูล พร้อมตัวอย่างข้อมูลมาตรฐาน 3 รายการ
  const sampleData = [
    {
      'ปีงบประมาณ': '2570',
      'ประเภท (โครงการ/ครุภัณฑ์)': 'โครงการ',
      'รายการ (ชื่อโครงการ)': 'โครงการปรับปรุงผิวจราจรแอสฟัลท์ติกคอนกรีต ถนนผดุงวิถี',
      'แหล่งงบประมาณ': 'เงินงบประมาณ',
      'งบประมาณที่ได้รับตั้งไว้ (บาท)': 3500000,
      'โอนลด/โอนเพิ่ม (บาท)': 0,
      'เลขที่สัญญา': 'มค ๕๒๐๐๓/ส.๑๒/๒๕๗๐',
      'คู่สัญญา': 'ห้างหุ้นส่วนจำกัด สารคามคอนสตรัคชั่น 1999',
      'วงเงินตามสัญญา (บาท)': 3380000,
      'การลด/การเพิ่มวงเงินสัญญา (บาท)': 0,
      'วันที่เริ่มสัญญา': '2026-11-01',
      'วันที่สิ้นสุดสัญญา': '2027-03-31',
      'ค่าหลักประกันสัญญา (บาท)': 169000,
      'ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)': 2,
      'วันที่ตรวจรับงาน': '2027-04-10',
      'สถานะหลักประกันสัญญา': 'ยังไม่คืนเงิน',
      'วันส่งมอบงาน': '2027-04-05',
      'สถานะของโครงการ': 'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)',
      'การเบิกจ่าย': 'อยู่ระหว่างดำเนินการ',
      'หมายเหตุ': 'ตัวอย่าง: โครงการก่อสร้างงานทาง ปี 2570',
    },
    {
      'ปีงบประมาณ': '2570',
      'ประเภท (โครงการ/ครุภัณฑ์)': 'ครุภัณฑ์',
      'รายการ (ชื่อโครงการ)': 'จัดซื้อรถบรรทุกขยะมูลฝอยแบบอัดท้าย ขนาด 6 ตัน 6 ล้อ จำนวน 2 คัน',
      'แหล่งงบประมาณ': 'เงินงบประมาณ',
      'งบประมาณที่ได้รับตั้งไว้ (บาท)': 4800000,
      'โอนลด/โอนเพิ่ม (บาท)': 0,
      'เลขที่สัญญา': 'มค ๕๒๐๐๓/ส.๑๘/๒๕๗๐',
      'คู่สัญญา': 'บริษัท สยาม ออโต้ เทรดดิ้ง จำกัด',
      'วงเงินตามสัญญา (บาท)': 4750000,
      'การลด/การเพิ่มวงเงินสัญญา (บาท)': 0,
      'วันที่เริ่มสัญญา': '2026-12-01',
      'วันที่สิ้นสุดสัญญา': '2027-04-30',
      'ค่าหลักประกันสัญญา (บาท)': 237500,
      'ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)': 1,
      'วันที่ตรวจรับงาน': '',
      'สถานะหลักประกันสัญญา': 'ยังไม่คืนเงิน',
      'วันส่งมอบงาน': '',
      'สถานะของโครงการ': 'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)',
      'การเบิกจ่าย': 'อยู่ระหว่างดำเนินการ',
      'หมายเหตุ': 'ตัวอย่าง: ครุภัณฑ์ยานพาหนะ รอส่งมอบ',
    },
    {
      'ปีงบประมาณ': 'ก่อนปี 2570',
      'ประเภท (โครงการ/ครุภัณฑ์)': 'ครุภัณฑ์',
      'รายการ (ชื่อโครงการ)': 'โครงการติดตั้งระบบกล้องโทรทัศน์วงจรปิด (CCTV) ระยะที่ 3',
      'แหล่งงบประมาณ': 'เงินงบประมาณค้างจ่าย',
      'งบประมาณที่ได้รับตั้งไว้ (บาท)': 3800000,
      'โอนลด/โอนเพิ่ม (บาท)': 0,
      'เลขที่สัญญา': 'มค ๕๒๐๐๓/ส.๒๔/๒๕๖๙',
      'คู่สัญญา': 'บริษัท ดิจิตอล ซิสเต็ม โซลูชั่น จำกัด',
      'วงเงินตามสัญญา (บาท)': 3750000,
      'การลด/การเพิ่มวงเงินสัญญา (บาท)': 0,
      'วันที่เริ่มสัญญา': '2026-03-01',
      'วันที่สิ้นสุดสัญญา': '2026-08-31',
      'ค่าหลักประกันสัญญา (บาท)': 187500,
      'ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)': 2,
      'วันที่ตรวจรับงาน': '2026-09-05',
      'สถานะหลักประกันสัญญา': 'ยังไม่คืนเงิน',
      'วันส่งมอบงาน': '2026-08-28',
      'สถานะของโครงการ': 'ดำเนินการแล้วเสร็จ',
      'การเบิกจ่าย': 'ชำระเงินแล้ว',
      'หมายเหตุ': 'ตัวอย่าง: โครงการก่อนปี 2570 ที่เบิกจ่ายแล้วเสร็จ',
    },
  ];

  const wsForm = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, wsForm, 'แบบฟอร์มนำเข้า');

  // Sheet 2: คำอธิบายและแนวทางการกรอกข้อมูล
  const instructions = [
    {
      'หัวข้อ': 'ปีงบประมาณ',
      'ค่าที่ระบบยอมรับ': '2570 หรือ ก่อนปี 2570 (หรือระบุ 2569, 2568)',
      'คำแนะนำ': 'หากระบุปีอื่น ระบบจะจัดกลุ่มเป็น "ก่อนปี 2570" โดยอัตโนมัติ',
    },
    {
      'หัวข้อ': 'ประเภท',
      'ค่าที่ระบบยอมรับ': 'โครงการ หรือ ครุภัณฑ์',
      'คำแนะนำ': 'โครงการคืองานก่อสร้าง/ปรับปรุง, ครุภัณฑ์คือยานพาหนะ/อุปกรณ์',
    },
    {
      'หัวข้อ': 'แหล่งงบประมาณ (๖ แหล่งเงิน)',
      'ค่าที่ระบบยอมรับ': 'เงินงบประมาณ, เงินงบประมาณค้างจ่าย, เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ, เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ ค้างจ่าย, เงินสะสม, เงินกู้',
      'คำแนะนำ': 'กรอกให้ตรงตาม ๖ แหล่งเงินของเทศบาลเมืองมหาสารคาม',
    },
    {
      'หัวข้อ': 'สถานะของโครงการ',
      'ค่าที่ระบบยอมรับ': 'ยังไม่เริ่มดำเนินการ, อยู่ระหว่างการจัดทำ TOR /ราคากลาง, อยู่ระหว่างประกาศจัดซื้อจัดจ้าง, อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ), ดำเนินการแล้วเสร็จ',
      'คำแนะนำ': 'ระบบจะจัดกลุ่มสถานะอัตโนมัติแม้พิมพ์เพียงคำสำคัญ',
    },
    {
      'หัวข้อ': 'การเบิกจ่าย',
      'ค่าที่ระบบยอมรับ': 'ชำระเงินแล้ว หรือ อยู่ระหว่างดำเนินการ',
      'คำแนะนำ': 'ระบุเพื่อใช้คำนวณสถิติยอดเบิกจ่าย',
    },
    {
      'หัวข้อ': 'การคำนวณวันคืนหลักประกันสัญญา',
      'ค่าที่ระบบยอมรับ': 'คำนวณอัตโนมัติ',
      'คำแนะนำ': 'ระบบจะคำนวณจาก [วันที่ตรวจรับงาน] + [ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)] โดยอัตโนมัติ',
    },
    {
      'หัวข้อ': 'รูปแบบวันที่',
      'ค่าที่ระบบยอมรับ': 'ปปปป-ดด-วว เช่น 2026-11-01 หรือ 2027-03-31',
      'คำแนะนำ': 'ใช้รูปแบบ ค.ศ. สากลเพื่อให้ระบบแปลงเป็น พ.ศ. ได้ถูกต้อง',
    },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'คำอธิบายการกรอกข้อมูล');

  XLSX.writeFile(wb, 'Template_แบบฟอร์มนำเข้าข้อมูล_พัสดุเทศบาลเมืองมหาสารคาม.xlsx');
}

export interface ParseResult {
  projects: ProjectItem[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  detectedColumns: string[];
}

/**
 * 4. ระบบอ่านหัวคอลัมน์อัตโนมัติ (Smart Column Mapping) รองรับ .xlsx, .xls, .csv
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const detectedColumns: string[] = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const parsedProjects: ProjectItem[] = [];
  let skippedRows = 0;

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];

    // Helper to find column case-insensitively / flexibly
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      // Try fuzzy lower-case match
      for (const k of keys) {
        const lowerKey = k.toLowerCase();
        for (const actualKey of Object.keys(row)) {
          if (actualKey.toLowerCase().includes(lowerKey)) {
            const v = String(row[actualKey]).trim();
            if (v) return v;
          }
        }
      }
      return '';
    };

    const name = getVal('รายการ (ชื่อโครงการ)', 'รายการ', 'ชื่อโครงการ', 'ชื่อรายการ', 'name', 'project_name');
    if (!name) {
      skippedRows++;
      continue;
    }

    const fiscalYearRaw = getVal('ปีงบประมาณ', 'ปี', 'fiscalYear', 'fiscal_year') || '2570';
    const fiscalYear =
      fiscalYearRaw.includes('ก่อน') ||
      fiscalYearRaw.includes('2569') ||
      fiscalYearRaw.includes('2568') ||
      fiscalYearRaw.includes('2567')
        ? 'ก่อนปี 2570'
        : '2570';

    const itemTypeRaw = getVal('ประเภท (โครงการ/ครุภัณฑ์)', 'ประเภท', 'itemType', 'type');
    const itemType = itemTypeRaw.includes('ครุภัณฑ์') ? 'ครุภัณฑ์' : 'โครงการ';

    let budgetSource: BudgetSource = 'เงินงบประมาณ';
    const sourceRaw = getVal('แหล่งงบประมาณ', 'แหล่งเงิน', 'budgetSource', 'source');
    if (sourceRaw.includes('เฉพาะกิจ') && sourceRaw.includes('ค้างจ่าย')) {
      budgetSource = 'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ ค้างจ่าย';
    } else if (sourceRaw.includes('เฉพาะกิจ')) {
      budgetSource = 'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ';
    } else if (sourceRaw.includes('ค้างจ่าย')) {
      budgetSource = 'เงินงบประมาณค้างจ่าย';
    } else if (sourceRaw.includes('สะสม')) {
      budgetSource = 'เงินสะสม';
    } else if (sourceRaw.includes('กู้')) {
      budgetSource = 'เงินกู้';
    } else {
      budgetSource = 'เงินงบประมาณ';
    }

    const parseNum = (val: string): number => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/฿/g, '').replace(/บาท/g, '').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    const allocatedBudget = parseNum(
      getVal('งบประมาณที่ได้รับตั้งไว้ (บาท)', 'งบประมาณที่ได้รับตั้งไว้', 'งบประมาณ', 'allocatedBudget', 'budget')
    );
    const transferBudget = parseNum(
      getVal('โอนลด/โอนเพิ่ม (บาท)', 'โอนลด/โอนเพิ่ม', 'โอนลดโอนเพิ่ม', 'transferBudget')
    );
    const contractNo = getVal('เลขที่สัญญา', 'contractNo', 'contract_no');
    const contractor = getVal('คู่สัญญา', 'ผู้รับจ้าง', 'บริษัท', 'contractor');
    const contractAmount = parseNum(
      getVal('วงเงินตามสัญญา (บาท)', 'วงเงินตามสัญญา', 'วงเงินสัญญา', 'contractAmount')
    );
    const contractAdjust = parseNum(
      getVal('การลด/การเพิ่มวงเงินสัญญา (บาท)', 'การลด/การเพิ่ม', 'contractAdjust')
    );

    const startDate = getVal('วันที่เริ่มสัญญา', 'เริ่มสัญญา', 'startDate');
    const endDate = getVal('วันที่สิ้นสุดสัญญา', 'สิ้นสุดสัญญา', 'endDate');
    const guaranteeAmount = parseNum(
      getVal('ค่าหลักประกันสัญญา (บาท)', 'ค่าหลักประกันสัญญา', 'หลักประกันสัญญา', 'guaranteeAmount')
    );
    const guaranteeReturnYears =
      parseInt(
        getVal('ครบกำหนดคืนค่าหลักประกันสัญญา (ปี)', 'ครบกำหนดคืนค่าหลักประกันสัญญา', 'guaranteeReturnYears', 'ระยะเวลาคืน'),
        10
      ) || 2;
    const acceptanceDate = getVal('วันที่ตรวจรับงาน', 'ตรวจรับงาน', 'วันตรวจรับ', 'acceptanceDate');

    // Auto-calculate guarantee due date:
    const guaranteeDueDate = calculateGuaranteeDueDate(acceptanceDate, guaranteeReturnYears);

    const guaranteeStatusRaw = getVal('สถานะหลักประกันสัญญา', 'guaranteeStatus');
    const guaranteeStatus = guaranteeStatusRaw.includes('คืนแล้ว') ? 'คืนเงินแล้ว' : 'ยังไม่คืนเงิน';

    const deliveryDate = getVal('วันส่งมอบงาน', 'ส่งมอบงาน', 'deliveryDate');

    const statusRaw = getVal('สถานะของโครงการ', 'สถานะโครงการ', 'projectStatus', 'status');
    let projectStatus: ProjectItem['projectStatus'] =
      'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)';
    if (statusRaw.includes('เสร็จ') || statusRaw.includes('เรียบร้อย') || statusRaw.includes('ตรวจรับแล้ว')) {
      projectStatus = 'ดำเนินการแล้วเสร็จ';
    } else if (statusRaw.includes('ยังไม่เริ่ม')) {
      projectStatus = 'ยังไม่เริ่มดำเนินการ';
    } else if (statusRaw.includes('TOR') || statusRaw.includes('ราคากลาง')) {
      projectStatus = 'อยู่ระหว่างการจัดทำ TOR /ราคากลาง';
    } else if (statusRaw.includes('ประกาศ') || statusRaw.includes('จัดซื้อ')) {
      projectStatus = 'อยู่ระหว่างประกาศจัดซื้อจัดจ้าง';
    }

    const disbursementRaw = getVal('การเบิกจ่าย', 'สถานะการเบิกจ่าย', 'disbursementStatus');
    const disbursementStatus =
      disbursementRaw.includes('ชำระ') || disbursementRaw.includes('เบิกแล้ว')
        ? 'ชำระเงินแล้ว'
        : 'อยู่ระหว่างดำเนินการ';

    const remainingBudget = calculateRemainingBudget(allocatedBudget, transferBudget, contractAmount, contractAdjust);
    const remarks = getVal('หมายเหตุ', 'remarks', 'note');

    parsedProjects.push({
      id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      fiscalYear,
      itemType,
      name,
      allocatedBudget,
      transferBudget,
      contractNo,
      contractor,
      contractAmount,
      contractAdjust,
      startDate,
      endDate,
      guaranteeAmount,
      guaranteeReturnYears,
      guaranteeDueDate,
      guaranteeStatus,
      deliveryDate,
      acceptanceDate,
      projectStatus,
      disbursementStatus,
      budgetSource,
      remainingBudget,
      remarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Excel Import',
    });
  }

  return {
    projects: parsedProjects,
    totalRows: jsonData.length,
    validRows: parsedProjects.length,
    skippedRows,
    detectedColumns,
  };
}
