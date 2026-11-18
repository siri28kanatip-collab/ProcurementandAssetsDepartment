import React, { useState, useEffect } from 'react';
import {
  ProjectItem,
  BudgetSource,
  BUDGET_SOURCES,
  ItemType,
  ProjectStatus,
  PROJECT_STATUS_OPTIONS,
  GuaranteeStatus,
  DisbursementStatus,
  AuthUser,
} from '../types/project';
import {
  calculateGuaranteeDueDate,
  calculateRemainingBudget,
  formatCurrency,
} from '../utils/dateAndCalc';
import { X, Save, Calculator, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectItem, isNew: boolean) => void;
  initialProject?: ProjectItem | null;
  currentUser: AuthUser;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
  currentUser,
}) => {
  const isEditing = Boolean(initialProject);
  const isReadOnly = currentUser.role !== 'officer';

  const [fiscalYear, setFiscalYear] = useState<'2570' | 'ก่อนปี 2570'>('2570');
  const [itemType, setItemType] = useState<ItemType>('โครงการ');
  const [name, setName] = useState('');
  const [budgetSource, setBudgetSource] = useState<BudgetSource>('เงินงบประมาณ');
  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [transferBudget, setTransferBudget] = useState<number>(0);
  const [contractNo, setContractNo] = useState('');
  const [contractor, setContractor] = useState('');
  const [contractAmount, setContractAmount] = useState<number>(0);
  const [contractAdjust, setContractAdjust] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState<number>(0);
  const [guaranteeReturnYears, setGuaranteeReturnYears] = useState<number>(2);
  const [acceptanceDate, setAcceptanceDate] = useState('');
  const [guaranteeDueDate, setGuaranteeDueDate] = useState('');
  const [guaranteeStatus, setGuaranteeStatus] = useState<GuaranteeStatus>('ยังไม่คืนเงิน');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    'อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)'
  );
  const [disbursementStatus, setDisbursementStatus] = useState<DisbursementStatus>('อยู่ระหว่างดำเนินการ');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Populate form on edit or reset on new
  useEffect(() => {
    if (initialProject) {
      setFiscalYear(initialProject.fiscalYear);
      setItemType(initialProject.itemType);
      setName(initialProject.name);
      setBudgetSource(initialProject.budgetSource);
      setAllocatedBudget(initialProject.allocatedBudget || 0);
      setTransferBudget(initialProject.transferBudget || 0);
      setContractNo(initialProject.contractNo || '');
      setContractor(initialProject.contractor || '');
      setContractAmount(initialProject.contractAmount || 0);
      setContractAdjust(initialProject.contractAdjust || 0);
      setStartDate(initialProject.startDate || '');
      setEndDate(initialProject.endDate || '');
      setGuaranteeAmount(initialProject.guaranteeAmount || 0);
      setGuaranteeReturnYears(initialProject.guaranteeReturnYears || 2);
      setAcceptanceDate(initialProject.acceptanceDate || '');
      setGuaranteeDueDate(initialProject.guaranteeDueDate || '');
      setGuaranteeStatus(initialProject.guaranteeStatus || 'ยังไม่คืนเงิน');
      setDeliveryDate(initialProject.deliveryDate || '');
      setProjectStatus(initialProject.projectStatus || 'ยังไม่เริ่มดำเนินการ');
      setDisbursementStatus(initialProject.disbursementStatus || 'อยู่ระหว่างดำเนินการ');
      setRemarks(initialProject.remarks || '');
    } else {
      // Defaults for new item
      setFiscalYear('2570');
      setItemType('โครงการ');
      setName('');
      setBudgetSource('เงินงบประมาณ');
      setAllocatedBudget(0);
      setTransferBudget(0);
      setContractNo('');
      setContractor('');
      setContractAmount(0);
      setContractAdjust(0);
      setStartDate('');
      setEndDate('');
      setGuaranteeAmount(0);
      setGuaranteeReturnYears(2);
      setAcceptanceDate('');
      setGuaranteeDueDate('');
      setGuaranteeStatus('ยังไม่คืนเงิน');
      setDeliveryDate('');
      setProjectStatus('อยู่ระหว่างบริหารสัญญา (1.ส่งมอบพื้นที่ 2.ผู้รับจ้างเข้าดำเนินการ 3. ส่งมอบงาน 4. ตรวจรับพัสดุ)');
      setDisbursementStatus('อยู่ระหว่างดำเนินการ');
      setRemarks('');
    }
    setError(null);
  }, [initialProject, isOpen]);

  // Recalculate guarantee due date automatically when acceptance date or return years change
  useEffect(() => {
    if (acceptanceDate && guaranteeReturnYears) {
      const computed = calculateGuaranteeDueDate(acceptanceDate, guaranteeReturnYears);
      setGuaranteeDueDate(computed);
    } else {
      setGuaranteeDueDate('');
    }
  }, [acceptanceDate, guaranteeReturnYears]);

  // Auto calculate 5% guarantee amount if contract amount is entered and guarantee is 0
  const handleContractAmountChange = (val: number) => {
    setContractAmount(val);
    if (val > 0 && guaranteeAmount === 0) {
      setGuaranteeAmount(Math.round(val * 0.05));
    }
  };

  // Real-time remaining budget
  const liveRemaining = calculateRemainingBudget(
    allocatedBudget,
    transferBudget,
    contractAmount,
    contractAdjust
  );

  if (!isOpen || (isReadOnly && !initialProject)) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!name.trim()) {
      setError('กรุณากรอกรายการ (ชื่อโครงการหรือครุภัณฑ์)');
      return;
    }

    const calculatedDueDate = calculateGuaranteeDueDate(acceptanceDate, guaranteeReturnYears);

    const projectData: ProjectItem = {
      id: initialProject ? initialProject.id : `prj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fiscalYear,
      itemType,
      name: name.trim(),
      allocatedBudget: Number(allocatedBudget) || 0,
      transferBudget: Number(transferBudget) || 0,
      contractNo: contractNo.trim(),
      contractor: contractor.trim(),
      contractAmount: Number(contractAmount) || 0,
      contractAdjust: Number(contractAdjust) || 0,
      startDate,
      endDate,
      guaranteeAmount: Number(guaranteeAmount) || 0,
      guaranteeReturnYears: Number(guaranteeReturnYears) || 2,
      guaranteeDueDate: calculatedDueDate,
      guaranteeStatus,
      deliveryDate,
      acceptanceDate,
      projectStatus,
      disbursementStatus,
      budgetSource,
      remainingBudget: liveRemaining,
      remarks: remarks.trim(),
      createdAt: initialProject ? initialProject.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: `${currentUser.username} (${currentUser.displayName})`,
    };

    onSave(projectData, !isEditing);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isReadOnly
                  ? 'รายละเอียดโครงการ / ครุภัณฑ์ (ดูอย่างเดียว)'
                  : isEditing
                  ? 'แก้ไขข้อมูลโครงการ / ครุภัณฑ์'
                  : 'บันทึกข้อมูลโครงการประจำวัน (งบลงทุน)'}
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

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <fieldset disabled={isReadOnly} className="space-y-6">

          {/* Section 1: Classification & Name */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              ๑. ข้อมูลทั่วไปและประเภทโครงการ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ปีงบประมาณ <span className="text-red-500">*</span>
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="2570">ประจำปีงบประมาณ 2570</option>
                  <option value="ก่อนปี 2570">ก่อนปี 2570</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภท <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="โครงการ">โครงการ (งานก่อสร้าง/ปรับปรุง)</option>
                  <option value="ครุภัณฑ์">ครุภัณฑ์ (ยานพาหนะ/เครื่องมือ/อุปกรณ์)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แหล่งงบประมาณ (๖ แหล่งเงิน) <span className="text-red-500">*</span>
                </label>
                <select
                  value={budgetSource}
                  onChange={(e) => setBudgetSource(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {BUDGET_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รายการ (บอกชื่อโครงการ / ครุภัณฑ์) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น โครงการก่อสร้างปรับปรุงระบบระบายน้ำ..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Budgeting and Financials */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                ๒. งบประมาณที่ได้รับตั้งไว้และการโอนเงิน
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">งบประมาณคงเหลือสุทธิ:</span>
                <span className="font-bold text-indigo-700 tabular-nums">
                  {formatCurrency(liveRemaining)} บาท
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  งบประมาณที่ได้รับตั้งไว้ (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={allocatedBudget}
                  onChange={(e) => setAllocatedBudget(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  โอนลด (-) / โอนเพิ่ม (+) งบประมาณที่ได้รับตั้งไว้ (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  value={transferBudget}
                  onChange={(e) => setTransferBudget(parseFloat(e.target.value) || 0)}
                  placeholder="ใส่ลบ (-) สำหรับโอนลด หรือบวก (+) สำหรับโอนเพิ่ม"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contract & Contractor */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              ๓. ข้อมูลสัญญาและคู่สัญญา
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขที่สัญญา
                </label>
                <input
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  placeholder="เช่น มค ๕๒๐๐๓/ส.๑๒/๒๕๗๐"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คู่สัญญา (บอกชื่อผู้รับจ้าง/ห้าง/บริษัท)
                </label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="เช่น บริษัท สารคามคอนสตรัคชั่น จำกัด"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วงเงินตามสัญญา (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={contractAmount}
                  onChange={(e) => handleContractAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  การลด (-) / การเพิ่ม (+) วงเงินตามสัญญา (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  value={contractAdjust}
                  onChange={(e) => setContractAdjust(parseFloat(e.target.value) || 0)}
                  placeholder="ใส่ลบ (-) สำหรับลดวงเงิน หรือบวก (+) เพิ่มวงเงิน"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่เริ่มสัญญา
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่สิ้นสุดสัญญา
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Performance Guarantee & Automatic Due Date */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                ๔. หลักประกันสัญญาและการคำนวณวันครบกำหนดคืนเงินอัตโนมัติ
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าหลักประกันสัญญา (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={guaranteeAmount}
                  onChange={(e) => setGuaranteeAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">ปกติอัตราร้อยละ 5 ของวงเงินสัญญา</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ครบกำหนดคืนค่าหลักประกันสัญญา (คีย์ข้อมูลกี่ปี)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={guaranteeReturnYears}
                    onChange={(e) => setGuaranteeReturnYears(parseInt(e.target.value, 10) || 1)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-600">ปี</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะหลักประกันสัญญา
                </label>
                <select
                  value={guaranteeStatus}
                  onChange={(e) => setGuaranteeStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="ยังไม่คืนเงิน">ยังไม่คืนเงิน</option>
                  <option value="คืนเงินแล้ว">คืนเงินแล้ว</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันส่งมอบงาน
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่ตรวจรับงาน (จุดเริ่มนับประกัน)
                </label>
                <input
                  type="date"
                  value={acceptanceDate}
                  onChange={(e) => setAcceptanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                  <span>วันที่ครบกำหนดคืนเงินหลักประกันสัญญา</span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1 rounded">คำนวณอัตโนมัติ</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={guaranteeDueDate || '(ระบุวันที่ตรวจรับงานเพื่อคำนวณ)'}
                  className="w-full px-3 py-2 bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-medium text-amber-950 cursor-not-allowed"
                />
                <span className="text-[10px] text-amber-700">
                  เงื่อนไข: นับแต่วันที่ตรวจรับงาน + {guaranteeReturnYears} ปี
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Project & Disbursement Status */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              ๕. สถานะการดำเนินงานและการเบิกจ่าย
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะของโครงการ <span className="text-red-500">*</span>
                </label>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {PROJECT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  การเบิกจ่าย <span className="text-red-500">*</span>
                </label>
                <select
                  value={disbursementStatus}
                  onChange={(e) => setDisbursementStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
                  <option value="ชำระเงินแล้ว">ชำระเงินแล้ว</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม / ความก้าวหน้า
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ระบุรายละเอียดความคืบหน้า หรือปัญหาอุปสรรค..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          </fieldset>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลโครงการ'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
