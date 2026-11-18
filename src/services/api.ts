import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  ProjectItem,
  BUDGET_SOURCES,
  PROJECT_STATUS_OPTIONS,
  BudgetSource,
  ItemType,
  GuaranteeStatus,
  DisbursementStatus,
  ProjectStatus,
} from '../types/project';
import { INITIAL_PROJECTS } from '../data/initialData';
import {
  auth,
  db,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from '../firebase';

export const PROJECTS_COLLECTION = 'ProcurementandAssetsDepartment';
const STORAGE_KEY = 'mhk_projects_db_v1';

// Validation constants synced verbatim with firebase-blueprint.json
const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
const MAX_ID_LEN = 128;
const MAX_NAME_LEN = 500;
const MAX_CONTRACT_NO_LEN = 120;
const MAX_CONTRACTOR_LEN = 250;
const MAX_DATE_LEN = 40;
const MAX_REMARKS_LEN = 1000;
const MAX_UPDATED_BY_LEN = 150;
const MAX_MEMBER_UIDS = 20;

const seededUids = new Set<string>();

export function sanitizeId(rawId?: string): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, MAX_ID_LEN);
  if (cleaned && ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `prj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function sanitizeString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : fallback;
  return str.slice(0, maxLength);
}

function sanitizeNonNegativeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function sanitizeSignedNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeProjectFields(project: ProjectItem, uid: string) {
  const safeId = sanitizeId(project.id);
  const safeOwnerUid =
    project.ownerUid && ID_PATTERN.test(project.ownerUid) && project.ownerUid.length <= MAX_ID_LEN
      ? project.ownerUid
      : uid;

  const rawMembers = Array.isArray(project.memberUids) ? project.memberUids : [];
  const validMembers = rawMembers.filter(
    (m): m is string => typeof m === 'string' && m.length >= 1 && m.length <= MAX_ID_LEN && ID_PATTERN.test(m)
  );
  const memberUids = Array.from(new Set([safeOwnerUid, uid, ...validMembers])).slice(0, MAX_MEMBER_UIDS);

  const safeName = sanitizeString(project.name, MAX_NAME_LEN) || 'โครงการไม่ระบุชื่อ';
  const guaranteeYearsRaw = Number(project.guaranteeReturnYears);
  const guaranteeReturnYears = Number.isFinite(guaranteeYearsRaw)
    ? Math.min(50, Math.max(0, Math.round(guaranteeYearsRaw)))
    : 2;

  return {
    id: safeId,
    fiscalYear: sanitizeEnum<'2570' | 'ก่อนปี 2570'>(
      project.fiscalYear,
      ['2570', 'ก่อนปี 2570'],
      '2570'
    ),
    itemType: sanitizeEnum<ItemType>(project.itemType, ['โครงการ', 'ครุภัณฑ์'], 'โครงการ'),
    name: safeName,
    allocatedBudget: sanitizeNonNegativeNumber(project.allocatedBudget, 0),
    transferBudget: sanitizeSignedNumber(project.transferBudget, 0),
    contractNo: sanitizeString(project.contractNo, MAX_CONTRACT_NO_LEN),
    contractor: sanitizeString(project.contractor, MAX_CONTRACTOR_LEN),
    contractAmount: sanitizeNonNegativeNumber(project.contractAmount, 0),
    contractAdjust: sanitizeSignedNumber(project.contractAdjust, 0),
    startDate: sanitizeString(project.startDate, MAX_DATE_LEN),
    endDate: sanitizeString(project.endDate, MAX_DATE_LEN),
    guaranteeAmount: sanitizeNonNegativeNumber(project.guaranteeAmount, 0),
    guaranteeReturnYears,
    guaranteeDueDate: sanitizeString(project.guaranteeDueDate, MAX_DATE_LEN),
    guaranteeStatus: sanitizeEnum<GuaranteeStatus>(
      project.guaranteeStatus,
      ['ยังไม่คืนเงิน', 'คืนเงินแล้ว'],
      'ยังไม่คืนเงิน'
    ),
    deliveryDate: sanitizeString(project.deliveryDate, MAX_DATE_LEN),
    acceptanceDate: sanitizeString(project.acceptanceDate, MAX_DATE_LEN),
    projectStatus: sanitizeEnum<ProjectStatus>(
      project.projectStatus,
      PROJECT_STATUS_OPTIONS,
      'ยังไม่เริ่มดำเนินการ'
    ),
    disbursementStatus: sanitizeEnum<DisbursementStatus>(
      project.disbursementStatus,
      ['อยู่ระหว่างดำเนินการ', 'ชำระเงินแล้ว'],
      'อยู่ระหว่างดำเนินการ'
    ),
    budgetSource: sanitizeEnum<BudgetSource>(
      project.budgetSource,
      BUDGET_SOURCES,
      'เงินงบประมาณ'
    ),
    remainingBudget: sanitizeNonNegativeNumber(project.remainingBudget, 0),
    remarks: sanitizeString(project.remarks, MAX_REMARKS_LEN),
    ownerUid: safeOwnerUid,
    memberUids,
    updatedBy: sanitizeString(project.updatedBy, MAX_UPDATED_BY_LEN) || 'เจ้าหน้าที่พัสดุ',
  };
}

function formatTimestampField(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string' && val) {
    return val;
  }
  return new Date().toISOString();
}

function docToProjectItem(docSnap: QueryDocumentSnapshot<DocumentData>): ProjectItem {
  const d = docSnap.data();
  return {
    id: typeof d.id === 'string' ? d.id : docSnap.id,
    fiscalYear: d.fiscalYear === 'ก่อนปี 2570' ? 'ก่อนปี 2570' : '2570',
    itemType: d.itemType === 'ครุภัณฑ์' ? 'ครุภัณฑ์' : 'โครงการ',
    name: String(d.name || ''),
    allocatedBudget: Number(d.allocatedBudget) || 0,
    transferBudget: Number(d.transferBudget) || 0,
    contractNo: String(d.contractNo || ''),
    contractor: String(d.contractor || ''),
    contractAmount: Number(d.contractAmount) || 0,
    contractAdjust: Number(d.contractAdjust) || 0,
    startDate: String(d.startDate || ''),
    endDate: String(d.endDate || ''),
    guaranteeAmount: Number(d.guaranteeAmount) || 0,
    guaranteeReturnYears: Number(d.guaranteeReturnYears) || 2,
    guaranteeDueDate: String(d.guaranteeDueDate || ''),
    guaranteeStatus: d.guaranteeStatus === 'คืนเงินแล้ว' ? 'คืนเงินแล้ว' : 'ยังไม่คืนเงิน',
    deliveryDate: String(d.deliveryDate || ''),
    acceptanceDate: String(d.acceptanceDate || ''),
    projectStatus: sanitizeEnum<ProjectStatus>(
      d.projectStatus,
      PROJECT_STATUS_OPTIONS,
      'ยังไม่เริ่มดำเนินการ'
    ),
    disbursementStatus: d.disbursementStatus === 'ชำระเงินแล้ว' ? 'ชำระเงินแล้ว' : 'อยู่ระหว่างดำเนินการ',
    budgetSource: sanitizeEnum<BudgetSource>(d.budgetSource, BUDGET_SOURCES, 'เงินงบประมาณ'),
    remainingBudget: Number(d.remainingBudget) || 0,
    remarks: String(d.remarks || ''),
    createdAt: formatTimestampField(d.createdAt),
    updatedAt: formatTimestampField(d.updatedAt),
    updatedBy: typeof d.updatedBy === 'string' ? d.updatedBy : undefined,
    ownerUid: typeof d.ownerUid === 'string' ? d.ownerUid : undefined,
    memberUids: Array.isArray(d.memberUids) ? d.memberUids : undefined,
  };
}

export function isBootstrappedAdminUser(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL);
}

function getProjectsQuery(user: User) {
  const colRef = collection(db, PROJECTS_COLLECTION);
  if (isBootstrappedAdminUser(user)) {
    return colRef;
  }
  return query(colRef, where('memberUids', 'array-contains', user.uid));
}

async function fetchLocalOrServerProjects(): Promise<ProjectItem[]> {
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend server fallback unavailable, using local cache:', err);
  }

  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PROJECTS));
  return INITIAL_PROJECTS;
}

async function seedInitialProjects(user: User): Promise<void> {
  if (seededUids.has(user.uid)) return;
  seededUids.add(user.uid);

  const seedSource = await fetchLocalOrServerProjects();
  const batch = writeBatch(db);
  for (const item of seedSource) {
    const sanitized = sanitizeProjectFields(
      { ...item, ownerUid: user.uid, memberUids: [user.uid] },
      user.uid
    );
    const ref = doc(db, PROJECTS_COLLECTION, sanitized.id);
    batch.set(ref, {
      ...sanitized,
      ownerUid: user.uid,
      memberUids: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PROJECTS_COLLECTION);
  }
}

export function subscribeToProjects(
  user: User,
  onData: (projects: ProjectItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = getProjectsQuery(user);

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty && !seededUids.has(user.uid)) {
        try {
          await seedInitialProjects(user);
        } catch (err) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }

      const items = snapshot.docs
        .map(docToProjectItem)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
      } catch (formattedError) {
        onError(formattedError instanceof Error ? formattedError : new Error(String(formattedError)));
      }
    }
  );
}

export async function fetchProjects(user?: User | null): Promise<ProjectItem[]> {
  const activeUser = user || auth.currentUser;
  if (!activeUser || !activeUser.emailVerified) {
    return await fetchLocalOrServerProjects();
  }

  try {
    const snapshot = await getDocs(getProjectsQuery(activeUser));
    if (snapshot.empty && !seededUids.has(activeUser.uid)) {
      await seedInitialProjects(activeUser);
      const seededSnap = await getDocs(getProjectsQuery(activeUser));
      const seededItems = seededSnap.docs
        .map(docToProjectItem)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seededItems));
      return seededItems;
    }
    const items = snapshot.docs
      .map(docToProjectItem)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PROJECTS_COLLECTION);
  }
}

export async function saveProject(
  project: ProjectItem,
  isNew: boolean,
  existingProject?: ProjectItem | null
): Promise<ProjectItem> {
  // Always update local cache & server API mirror for instant responsiveness
  const cached = localStorage.getItem(STORAGE_KEY);
  let list: ProjectItem[] = cached ? JSON.parse(cached) : [];
  if (isNew) {
    list = [project, ...list];
  } else {
    list = list.map((p) => (p.id === project.id ? project : p));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  fetch(isNew ? '/api/projects' : `/api/projects/${project.id}`, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  }).catch(() => {});

  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return project;
  }

  const sanitized = sanitizeProjectFields(project, user.uid);
  const docPath = `${PROJECTS_COLLECTION}/${sanitized.id}`;
  const docRef = doc(db, PROJECTS_COLLECTION, sanitized.id);

  try {
    if (isNew) {
      await setDoc(docRef, {
        ...sanitized,
        ownerUid: user.uid,
        memberUids: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const isAdmin = isBootstrappedAdminUser(user);
      const isAlreadyCompleted = existingProject?.projectStatus === 'ดำเนินการแล้วเสร็จ';

      if (isAlreadyCompleted && !isAdmin) {
        await updateDoc(docRef, {
          guaranteeStatus: sanitized.guaranteeStatus,
          disbursementStatus: sanitized.disbursementStatus,
          remarks: sanitized.remarks,
          updatedBy: sanitized.updatedBy,
          updatedAt: serverTimestamp(),
        });
      } else {
        const {
          id: _id,
          ownerUid: _ownerUid,
          ...updatableFields
        } = sanitized;
        await updateDoc(docRef, {
          ...updatableFields,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      docPath
    );
  }

  return {
    ...project,
    ...sanitized,
  };
}

export async function removeProject(id: string): Promise<void> {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const list: ProjectItem[] = JSON.parse(cached);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((p) => p.id !== id)));
  }

  fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});

  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return;
  }

  const safeId = sanitizeId(id);
  const docPath = `${PROJECTS_COLLECTION}/${safeId}`;
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function bulkSaveProjects(
  projects: ProjectItem[],
  mode: 'append' | 'replace'
): Promise<ProjectItem[]> {
  const cached = localStorage.getItem(STORAGE_KEY);
  let list: ProjectItem[] = cached ? JSON.parse(cached) : [];
  if (mode === 'replace') {
    list = projects;
  } else {
    const existingIds = new Set(list.map((p) => p.id));
    const toAdd = projects.filter((p) => !existingIds.has(p.id));
    list = [...toAdd, ...list];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  fetch('/api/projects/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, mode }),
  }).catch(() => {});

  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return list;
  }

  try {
    if (mode === 'replace') {
      const existingSnap = await getDocs(getProjectsQuery(user));
      const docsToDelete = existingSnap.docs;
      for (let i = 0; i < docsToDelete.length; i += 400) {
        const delBatch = writeBatch(db);
        for (const d of docsToDelete.slice(i, i + 400)) {
          delBatch.delete(d.ref);
        }
        await delBatch.commit();
      }
    }

    const sanitizedList = projects.map((p) => {
      const s = sanitizeProjectFields(p, user.uid);
      return {
        ...s,
        ownerUid: user.uid,
        memberUids: [user.uid],
      };
    });

    for (let i = 0; i < sanitizedList.length; i += 400) {
      const writeBatchChunk = writeBatch(db);
      for (const item of sanitizedList.slice(i, i + 400)) {
        const ref = doc(db, PROJECTS_COLLECTION, item.id);
        writeBatchChunk.set(ref, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await writeBatchChunk.commit();
    }

    return await fetchProjects(user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PROJECTS_COLLECTION);
  }
}
