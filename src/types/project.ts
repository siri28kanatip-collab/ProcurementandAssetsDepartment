export type BudgetSource =
  | 'เงินงบประมาณ'
  | 'เงินงบประมาณค้างจ่าย'
  | 'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ'
  | 'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ ค้างจ่าย'
  | 'เงินสะสม'
  | 'เงินกู้';

export const BUDGET_SOURCES: BudgetSource[] = [
  'เงินงบประมาณ',
  'เงินงบประมาณค้างจ่าย',
  'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ',
  'เงินอุดหนุนระบุวัตถุประสงค์เฉพาะกิจ ค้างจ่าย',
  'เงินสะสม',
  'เงินกู้',
];

export type ItemType = 'โครงการ' | 'ครุภัณฑ์';

export type ProjectStatus =
  | 'ยังไม่เริ่มดำเนินการ'
  | 'อยู่ระหว่างการจัดทำ TOR /ราคากลาง'
  | 'อยู่ระหว่างประกาศจัดซื้อจัดจ้าง'
  | 'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)'
  | 'ดำเนินการแล้วเสร็จ';

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'ยังไม่เริ่มดำเนินการ',
  'อยู่ระหว่างการจัดทำ TOR /ราคากลาง',
  'อยู่ระหว่างประกาศจัดซื้อจัดจ้าง',
  'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)',
  'ดำเนินการแล้วเสร็จ',
];

export type GuaranteeStatus = 'ยังไม่คืนเงิน' | 'คืนเงินแล้ว';

export type DisbursementStatus = 'อยู่ระหว่างดำเนินการ' | 'ชำระเงินแล้ว';

export interface ProjectItem {
  id: string;
  fiscalYear: '2570' | 'ก่อนปี 2570';
  itemType: ItemType;
  name: string;
  allocatedBudget: number; // งบประมาณที่ได้รับตั้งไว้
  transferBudget: number; // โอนลด (-) / โอนเพิ่ม (+) งบประมาณที่ได้รับตั้งไว้
  contractNo: string; // เลขที่สัญญา
  contractor: string; // คู่สัญญา
  contractAmount: number; // วงเงินตามสัญญา
  contractAdjust: number; // การลด (-) / การเพิ่ม (+) วงเงินตามสัญญา
  startDate: string; // วันที่เริ่มสัญญา YYYY-MM-DD
  endDate: string; // วันที่สิ้นสุดสัญญา YYYY-MM-DD
  guaranteeAmount: number; // ค่าหลักประกันสัญญา
  guaranteeReturnYears: number; // ครบกำหนดคืนค่าหลักประกันสัญญา (กี่ปี)
  guaranteeDueDate: string; // วันที่ครบกำหนดคืนเงินหลักประกันสัญญา (คำนวณอัตโนมัติ)
  guaranteeStatus: GuaranteeStatus; // คืนเงินแล้ว / ยังไม่คืนเงิน
  deliveryDate: string; // วันส่งมอบงาน YYYY-MM-DD
  acceptanceDate: string; // วันที่ตรวจรับงาน YYYY-MM-DD
  projectStatus: ProjectStatus; // สถานะของโครงการ
  disbursementStatus: DisbursementStatus; // การเบิกจ่าย
  budgetSource: BudgetSource; // มาจากแหล่งงบประมาณ
  remainingBudget: number; // งบประมาณคงเหลือ (คำนวณอัตโนมัติ)
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  ownerUid?: string;
  memberUids?: string[];
}

export type UserRole = 'officer' | 'director' | 'executive';

export interface AuthUser {
  username: 'User' | 'Director' | 'Executive';
  role: UserRole;
  displayName: string;
  positionTitle: string;
}

export interface BudgetSummaryRow {
  source: BudgetSource;
  totalProjects: number;
  totalBudget: number;
  completedProjects: number;
  completedAmount: number;
  inProgressProjects: number;
  inProgressAmount: number;
  notStartedProjects: number;
  notStartedAmount: number;
  disbursedProjects: number;
  disbursedAmount: number;
  pendingDisbursementProjects: number;
  pendingDisbursementAmount: number;
  remainingBudget: number;
}
