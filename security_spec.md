# ELARB FitPro Ultra — Security Specification & Threat Model

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`workouts`, `meals`, `measurements`, `prs`, `leagueEntries`) must enforce `uid == request.auth.uid` on creation and immutability of `uid` and `createdAt` on updates.
2. **No Self-Assigned Admin/Role Escalation**: Users creating `/users/{userId}` can only set `role == 'member'` and `status == 'active'`. Only verified Admins (`elarbvip@gmail.com` with `email_verified == true` or existing `/admins/{uid}`) may promote/demote roles or suspend accounts.
3. **PII Isolation**: User email and consent telemetry live strictly inside `/users/{userId}/private/pii`, accessible only to the owning user (`request.auth.uid == userId`) or a verified Admin.
4. **Temporal Integrity**: All `createdAt`, `updatedAt`, and `addedAt` timestamps must strictly equal `request.time`.
5. **No Blanket List Scraping**: All `allow list` rules explicitly evaluate `resource.data.uid == request.auth.uid`, participant membership (`request.auth.uid in resource.data.participants`), or verified league membership (`leagueEntries` with zero PII).
6. **Immutable Audit Trail & Action Enforcement**: `/auditLogs/{logId}` entries cannot be updated or deleted by any client. Non-admin users may only create `ACCOUNT_DATA_DELETED` logs scoped to `targetId == request.auth.uid`.
7. **Participant-Scoped Direct Messaging**: `/directMessages/{messageId}` documents require 2 distinct participants, `senderUid == request.auth.uid`, and can only be read by a participant in `resource.data.participants`.

## 2. The "Dirty Dozen+" Attack Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Read `/users/u1` without `request.auth`.
2. **Unverified Email Write**: Create `/workouts/w1` with `email_verified: false`.
3. **Self-Privilege Escalation**: Create `/users/u1` with `role: "admin"` as a normal user.
4. **Role Update Bypass**: Update own `/users/u1` changing `role` from `"member"` to `"admin"`.
5. **Shadow Field Injection**: Create `/meals/m1` with extra ghost field `isPremiumOverride: true`.
6. **Cross-Tenant Spoofing**: Create `/workouts/w2` with `uid: "victim_uid"` while authenticated as `attacker_uid`.
7. **PII Cross-Read**: Get `/users/victim_uid/private/pii` as `attacker_uid`.
8. **ID Poisoning**: Create `/prs/../../evil_id_1234` with invalid characters or >128 chars.
9. **String Exhaustion (DoW)**: Create `/workouts/w3` with `notes` exceeding 300 characters.
10. **Client Timestamp Forgery**: Create `/measurements/b1` with backdated `createdAt` not equal to `request.time`.
11. **Admin Registry Tampering**: Non-admin user writes `/admins/attacker_uid`.
12. **Audit Log Tampering**: Any user attempts `update` or `delete` on `/auditLogs/log1`.
13. **Audit Action Forgery**: Non-admin user creates `/auditLogs/log2` claiming `action: "USER_RBAC_UPDATED"`.
14. **League Point Inflation**: Verified user writes `/leagueEntries/u1` with `score` exceeding computed workouts+PR cap.
15. **Direct Message Eavesdrop**: Third-party user reads `/directMessages/dm1` where their UID is absent from `participants`.
