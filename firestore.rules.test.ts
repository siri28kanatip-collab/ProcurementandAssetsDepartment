/**
 * Phase 0: Security Rules Verification Suite ("Dirty Dozen" Payloads)
 * Designed for @firebase/rules-unit-testing against Firestore Emulator.
 */

export const DIRTY_DOZEN_PAYLOADS = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    auth: null,
    path: 'ProcurementandAssetsDepartment/prj-unauth-1',
    operation: 'create',
    payload: { id: 'prj-unauth-1', name: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    auth: { uid: 'spoof-uid', token: { email: 'siri28kanatip@gmail.com', email_verified: false } },
    path: 'ProcurementandAssetsDepartment/prj-spoof-1',
    operation: 'create',
    payload: { id: 'prj-spoof-1', ownerUid: 'spoof-uid', name: 'Spoofed Admin Write' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Ghost Field Injection',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-ghost-1',
    operation: 'create',
    payload: {
      id: 'prj-ghost-1',
      ownerUid: 'user-1',
      memberUids: ['user-1'],
      fiscalYear: '2570',
      itemType: 'โครงการ',
      name: 'Valid Name',
      isVerified: true, // Ghost field
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Owner UID Spoofing',
    auth: { uid: 'attacker-uid', token: { email: 'attacker@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-hijack-1',
    operation: 'create',
    payload: {
      id: 'prj-hijack-1',
      ownerUid: 'victim-uid',
      memberUids: ['attacker-uid'],
      name: 'Hijack',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID Poisoning',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/' + 'a'.repeat(150),
    operation: 'create',
    payload: { id: 'a'.repeat(150), ownerUid: 'user-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client Timestamp Forgery',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-time-1',
    operation: 'create',
    payload: {
      id: 'prj-time-1',
      ownerUid: 'user-1',
      memberUids: ['user-1'],
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Owner/CreatedAt Tampering on Update',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-existing-1',
    operation: 'update',
    payload: { ownerUid: 'user-2' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Value & Enum Poisoning (>500 chars / invalid budgetSource)',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-poison-1',
    operation: 'update',
    payload: { name: 'X'.repeat(501), budgetSource: 'งบลับ' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded memberUids Array Exhaustion',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-array-1',
    operation: 'create',
    payload: {
      id: 'prj-array-1',
      ownerUid: 'user-1',
      memberUids: Array.from({ length: 25 }, (_, i) => `uid-${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Modification by Non-Admin',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'ProcurementandAssetsDepartment/prj-terminal-1',
    operation: 'update',
    payload: { allocatedBudget: 99999999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Self-Assigned Admin Privilege Escalation',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'admins/user-1',
    operation: 'create',
    payload: { uid: 'user-1', email: 'user1@example.com' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-User PII Read & Unauthorized List Query',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    path: 'users/other-user-uid',
    operation: 'get',
    payload: null,
    expected: 'PERMISSION_DENIED',
  },
] as const;

export function verifyDirtyDozenSpec(): boolean {
  return (
    DIRTY_DOZEN_PAYLOADS.length === 12 &&
    DIRTY_DOZEN_PAYLOADS.every((p) => p.expected === 'PERMISSION_DENIED')
  );
}
