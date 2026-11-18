/**
 * Utility functions for date calculations, Thai Buddhist era, and budget math
 */

export function calculateGuaranteeDueDate(acceptanceDateStr: string, years: number): string {
  if (!acceptanceDateStr || !years || years <= 0) return '';
  try {
    const parts = acceptanceDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parts[1];
      const day = parts[2];
      const targetYear = year + Number(years);
      return `${targetYear}-${month}-${day}`;
    }
  } catch (err) {
    console.error('Error calculating guarantee due date:', err);
  }
  return '';
}

export function calculateRemainingBudget(
  allocatedBudget: number,
  transferBudget: number,
  contractAmount: number,
  contractAdjust: number
): number {
  const netAllocated = (Number(allocatedBudget) || 0) + (Number(transferBudget) || 0);
  const netContract = (Number(contractAmount) || 0) + (Number(contractAdjust) || 0);
  if (netContract > 0) {
    return Math.max(0, netAllocated - netContract);
  }
  return Math.max(0, netAllocated);
}

export function formatCurrency(amount: number | undefined | null, includeUnit = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return includeUnit ? '0.00 บาท' : '0.00';
  }
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return includeUnit ? `${formatted} บาท` : formatted;
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('th-TH').format(val);
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function formatThaiDate(dateStr: string, isFull = false): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const gYear = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      // If year is Gregorian (e.g. 2026/2027), convert to Buddhist Era (+543)
      const bYear = gYear < 2400 ? gYear + 543 : gYear;
      const monthName = isFull ? THAI_MONTHS_FULL[monthIdx] : THAI_MONTHS_SHORT[monthIdx];
      return `${day} ${monthName} ${bYear}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function toThaiNumerals(str: string | number): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(str).replace(/[0-9]/g, (match) => thaiDigits[parseInt(match, 10)]);
}

export function getCurrentThaiDateFull(): string {
  const now = new Date();
  const day = now.getDate();
  const monthName = THAI_MONTHS_FULL[now.getMonth()];
  const bYear = now.getFullYear() + 543;
  return `${day} ${monthName} พ.ศ. ${bYear}`;
}
