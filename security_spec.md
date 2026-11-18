# Security Specification — ProcurementandAssetsDepartment Firestore

## 1. Data Invariants
1. **Zero-Trust Default Deny**: All unmatched Firestore paths deny both reads and writes (`allow read, write: if false;`).
2. **Verified Identity Required**: Every read and write operation requires an authenticated Firebase user with `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(docId)` (`^[a-zA-Z0-9_-]+$`, max length 128) and enforces `incoming().id == projectId` (or `incoming().uid == userId`).
4. **Ownership & Query Isolation**: Every document in `/ProcurementandAssetsDepartment/{projectId}` has an immutable `ownerUid` strictly equal to `request.auth.uid` on creation, plus a bounded `memberUids` array (`1..20` items) containing `request.auth.uid`. `allow list` validates `isAdmin() || resource.data.ownerUid == request.auth.uid || request.auth.uid in resource.data.memberUids` with zero `get()` or `exists()` calls inside `allow list`.
5. **PII Isolation & Anti-Self-Escalation**: `/users/{userId}` stores only non-privileged profile fields (`uid`, `email`, `displayName`, `createdAt`, `updatedAt`) with no `role`/`isAdmin` field, readable and writable only by `isOwner(userId)` or `isAdmin()`. `/admins/{userId}` is readable/writable only by verified admins (`siri28kanatip@gmail.com` or existing `/admins/{uid}` entry).
6. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on every create and update.
7. **Terminal State Locking**: Once a project reaches full completion (`projectStatus == 'ดำเนินการแล้วเสร็จ' && disbursementStatus == 'ชำระเงินแล้ว' && guaranteeStatus == 'คืนเงินแล้ว'`), non-admin updates are blocked; admins can still override to correct records. Post-completion non-admin updates before full closure are limited strictly to `['guaranteeStatus', 'disbursementStatus', 'remarks', 'updatedAt', 'updatedBy']`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Request with `auth == null` reading or creating `/ProcurementandAssetsDepartment/prj-1`.
2. **Unverified Email Spoof**: Request with `auth.token.email == 'siri28kanatip@gmail.com'` and `auth.token.email_verified == false`.
3. **Shadow / Ghost Field Injection (Create)**: Creating a project with an extra undeclared field `isVerified: true` or `role: 'admin'`.
4. **Identity Spoofing (Owner Hijack)**: Creating a project where `ownerUid` does not match `request.auth.uid`.
5. **Path ID Poisoning**: Creating `/ProcurementandAssetsDepartment/bad$id..with..spaces` or a 200-char document ID.
6. **Client Timestamp Forgery**: Creating or updating a project with a client-supplied string/date for `createdAt` or `updatedAt` instead of `request.time`.
7. **Immutable Field Tampering**: Updating an existing project to change `ownerUid`, `id`, or `createdAt`.
8. **Enum & Value Poisoning**: Updating `name` to a 600-character string or `budgetSource` to an invalid string not in the 6 municipal sources.
9. **Unbounded Array Exhaustion**: Creating a project with `memberUids` having 25 UIDs (`> 20`) or an empty `memberUids: []`.
10. **Terminal State Bypass**: Non-admin attempting to edit `allocatedBudget` or `name` after a project is in `'ดำเนินการแล้วเสร็จ'` + `'ชำระเงินแล้ว'` + `'คืนเงินแล้ว'`.
11. **User Self-Privilege Escalation**: Non-admin creating `/users/{uid}` with extra field `isAdmin: true` or `role: 'admin'`, or creating `/admins/{uid}`.
12. **Cross-User PII & Blanket List Scraping**: Non-admin user querying `/users` list or reading `/users/{otherUid}` or listing `/ProcurementandAssetsDepartment` documents where they are neither `ownerUid` nor in `memberUids`.
