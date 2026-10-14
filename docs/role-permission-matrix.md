# Role-Permission Matrix (RBAC)

## 1. Role Definitions

1. **Student (`student`):** Enrolled university learner seeking or actively participating in an internship program.
2. **Company (`company`):** Verified business entity or recruiting manager publishing opportunities and hiring talent.
3. **Mentor (`mentor`):** Assigned workplace supervisor overseeing day-to-day work, reviewing task submissions, and providing evaluations.
4. **Administrator (`admin`):** Academic institution coordinator or platform system operator with global oversight and governance privileges.

---

## 2. Granular Permissions Matrix

| Domain Resource | Operation / Action | Student | Company | Mentor | Admin | Ownership Constraint |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Authentication & Profile** | Register Account | Yes | Yes | Yes | Yes | — |
| | Edit Own Profile | Yes | Yes | Yes | Yes | Own record only |
| | Deactivate / Suspend Users | No | No | No | Yes | Target != self |
| | Verify Company Credentials | No | No | No | Yes | — |
| **Internship Postings** | View Published Listings | Yes | Yes | Yes | Yes | Must be `status: published` |
| | Create New Listing | No | Yes | No | Yes | — |
| | Edit Own Listing | No | Yes | No | Yes | Company must own listing |
| | Delete / Archive Listing | No | Yes | No | Yes | Company must own listing |
| **Applications** | Submit Application | Yes | No | No | No | Cannot apply twice |
| | View Own Submissions | Yes | No | No | Yes | Student must own application |
| | View Applicants for Listing | No | Yes | No | Yes | Company must own listing |
| | Change Status (Review/Offer)| No | Yes | No | Yes | Company must own listing |
| | Assign Mentor to Intern | No | Yes | No | Yes | Company must own listing |
| **Tasks & Deliverables** | Create Task | No | No | Yes | Yes | Must be assigned mentor |
| | Submit Work Deliverable | Yes | No | No | No | Must be assigned student |
| | Review / Approve Task | No | No | Yes | Yes | Must be assigned mentor |
| **Evaluations** | Submit Periodic Appraisal | No | No | Yes | Yes | Must be assigned mentor |
| | View Own Evaluation | Yes | Yes | Yes | Yes | Student, Mentor, Company owner |
| **System Governance** | View System Health & Logs | No | No | No | Yes | Unrestricted in Phase 1 for dev |
| | Export Institutional Reports| No | No | No | Yes | — |

---

## 3. Security Enforcement Model

Access control is enforced at three distinct layers:

1. **Transport Layer (JWT Verification):**
   * Decodes and validates signature, expiration, and issuer.
   * Injects `req.user = { id, role, email }` into the Express request context.

2. **Route Guard Layer (`requireRoles` middleware):**
   * Validates whether `req.user.role` belongs to the whitelist array:
   ```javascript
   router.post("/internships", authenticateToken, requireRoles("company", "admin"), createInternship);
   ```

3. **Domain Ownership Layer (`authorizeOwnership` check):**
   * Verifies that the authenticated user actually owns or is assigned to the target document.
   * Admins bypass ownership checks for moderation and audit requirements.
