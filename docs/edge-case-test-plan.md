# Edge-Case Test Plan

## 1. Scope & Strategy
This document outlines explicit edge cases, security boundary conditions, and failure modes across each architectural layer. Automated unit, integration, and end-to-end tests must validate these conditions before feature sign-off.

---

## 2. Boundary Test Matrices

### A. Authentication & Session Management
| ID | Scenario | Input / Trigger | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Malformed JWT Token | Token header contains garbage or tampered signature | Returns `401 Unauthorized` with `INVALID_TOKEN` error code. |
| **TC-AUTH-02** | Expired JWT Token | Valid signature, but `exp` timestamp in the past | Returns `401 Unauthorized` with `TOKEN_EXPIRED` error code. |
| **TC-AUTH-03** | Privilege Escalation Attempt | Student attempts to access `POST /api/internships` | Returns `403 Forbidden` with `INSUFFICIENT_PERMISSIONS`. |
| **TC-AUTH-04** | Role Tampering in Registration | Payload contains arbitrary role `role: "admin"` | Returns `400 Bad Request` or defaults strictly to allowed self-registration roles. |

### B. Internship & Application Lifecycle
| ID | Scenario | Input / Trigger | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-APP-01** | Duplicate Application | Student submits second application to same posting | Returns `409 Conflict` (enforced by compound DB index and controller check). |
| **TC-APP-02** | Past-Deadline Application | Application submitted after `applicationDeadline` | Returns `400 Bad Request` (`DEADLINE_EXPIRED`). |
| **TC-APP-03** | Closed Listing Application | Student submits to an internship with `status: "closed"` | Returns `400 Bad Request` (`LISTING_NOT_ACCEPTING_APPLICATIONS`). |
| **TC-APP-04** | Cross-Company Applicant Tampering | Company A attempts to change status of applicant for Company B | Returns `403 Forbidden` (`UNAUTHORIZED_ACCESS_TO_RESOURCE`). |

### C. Tasks & Deliverable Submissions
| ID | Scenario | Input / Trigger | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-TASK-01** | Non-Assigned Student Submission | Student attempts to submit deliverable on another student's task | Returns `403 Forbidden` (`NOT_TASK_ASSIGNEE`). |
| **TC-TASK-02** | Multiple Resubmissions | Student resubmits while previous submission is pending review | Replaces pending deliverable or appends history depending on revision state. |
| **TC-TASK-03** | Invalid Deliverable URL | Payload includes invalid URI or malicious protocol scheme (e.g. `javascript:...`) | Fails schema validation, returns `400 Bad Request`. |

### D. File Storage & Resume Handling
| ID | Scenario | Input / Trigger | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Public Directory Resume Access | Client sends direct GET request to `/uploads/resume.pdf` | Direct public file serving is disabled; returns `404 Not Found`. |
| **TC-SEC-02** | MIME-Type Spoofing | Executable `.sh` or `.exe` file renamed to `.pdf` | Magic-byte file validation rejects upload with `415 Unsupported Media Type`. |
| **TC-SEC-03** | Path Traversal in Filename | Filename contains `../../../../etc/passwd` | Sanitizer strips path sequences; stores with UUID-based filename. |

### E. Database & Network Resiliency
| ID | Scenario | Input / Trigger | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-RES-01** | MongoDB Connection Outage | MongoDB cluster temporarily unreachable during `/api/health` call | Endpoint gracefully responds with `503 Service Unavailable` or `200` with `database.status: "disconnected"`. |
| **TC-RES-02** | Socket.IO Client Disconnect | Client loses network connection abruptly | Server logs clean socket cleanup without hanging active event listeners. |
| **TC-RES-03** | Malformed JSON Payload | Client sends syntactically broken JSON body | Centralized Express body parser intercepts and returns `400 Bad Request` (`INVALID_JSON_BODY`). |
