# InternHub: Smart Internship Management System (SIMS)
## Comprehensive Technical Documentation & Architecture Reference Manual

> **System Version:** 1.0.0 (Accredited Production Baseline)  
> **Repository:** `Smart-Internship-Management-System`  
> **Project Root:** `C:\Users\LENOVO\Desktop\Smart-Internship-Management-System`  
> **Target Audience:** Beginner to Intermediate Full-Stack Developers, Academic Evaluators, and Engineering Reviewers  

---

## Table of Contents
1. [Chapter 1: Project Overview & Core Purpose](#chapter-1-project-overview--core-purpose)
2. [Chapter 2: High-Level System Architecture & Request Lifecycle](#chapter-2-high-level-system-architecture--request-lifecycle)
3. [Chapter 3: Monorepo Folder Structure Explained](#chapter-3-monorepo-folder-structure-explained)
4. [Chapter 4: Programming Languages, Frameworks & Tech Stack](#chapter-4-programming-languages-frameworks--tech-stack)
5. [Chapter 5: Frontend Architecture, Pages & Reusable Components](#chapter-5-frontend-architecture-pages--reusable-components)
6. [Chapter 6: Backend Architecture, Server Pipeline & Middleware](#chapter-6-backend-architecture-server-pipeline--middleware)
7. [Chapter 7: Database Schemas, Collections & Entity Relationships](#chapter-7-database-schemas-collections--entity-relationships)
8. [Chapter 8: Complete REST API Endpoint Specification](#chapter-8-complete-rest-api-endpoint-specification)
9. [Chapter 9: Real-Time WebSockets & Background Daemons](#chapter-9-real-time-websockets--background-daemons)
10. [Chapter 10: Security, Authentication & Role-Based Access Control (RBAC)](#chapter-10-security-authentication--role-based-access-control-rbac)
11. [Chapter 11: Feature Implementation Audit Matrix](#chapter-11-feature-implementation-audit-matrix)
12. [Chapter 12: Beginner-Friendly Code Walkthrough](#chapter-12-beginner-friendly-code-walkthrough)
13. [Chapter 13: College Presentation & Technical Interview Guide](#chapter-13-college-presentation--technical-interview-guide)

---

## Chapter 1: Project Overview & Core Purpose

### 1.1 The Problem It Solves
Traditional university and institutional internship workflows are notoriously fragmented. Students track applications on scattered job boards, universities record student placements on manual spreadsheets, host employers communicate over disconnected email chains, and mentors struggle to provide verifiable appraisals or daily attendance monitoring.

### 1.2 The InternHub Solution
**InternHub (Smart Internship Management System)** is an integrated, full-stack enterprise web platform designed to streamline, automate, and govern the complete university-industry internship lifecycle across five distinct stakeholder roles:
1. **Students / Interns**: Discover real-time university and external job listings, apply online with PDF/DOCX resumes, check in daily with GPS/IP-verified attendance, manage assigned task milestones, chat directly with mentors, and claim cryptographically verifiable completion certificates.
2. **Host Employers / Companies**: Post and manage internship openings, review applicants, evaluate resumes, conduct hiring decisions, assign industry mentors, and review intern deliverables.
3. **Industry Mentors**: Supervise allocated interns, assign daily/weekly milestones, grade deliverables, verify attendance check-ins, conduct midterm and final evaluations, and communicate via real-time chat.
4. **Internship Coordinators**: Oversee departmental student cohorts, track company partnerships, review placement allocations, and export audit-ready institutional reports.
5. **Institutional Administrators**: Supervise governance, enforce platform access policies, provision stakeholder accounts, inspect immutable audit trails, and maintain system health.

---

## Chapter 2: High-Level System Architecture & Request Lifecycle

### 2.1 Architectural Flow Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|   React 18 SPA (Vite)  <======>  Contexts (Auth, Socket, Theme)  <======>  Axios Client|
|   (Port 5173 / 3000)                                                  (apiClient)    |
+------------------------------------------+--------------------------------------------+
                                           | HTTP Requests (/api/...) 
                                           | & WebSocket Connections (ws://)
                                           v
+---------------------------------------------------------------------------------------+
|                                 VITE DEV REVERSE PROXY                                |
|   Target: http://127.0.0.1:5001  (Forwards all /api/* requests seamlessly to Express) |
+------------------------------------------+--------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                             EXPRESS BACKEND RUNTIME SERVER                            |
|                                      (Port 5001)                                      |
|                                                                                       |
|   [1] Helmet Security & CORS Origin Whitelist                                         |
|   [2] Express JSON Body Parser (limit: 2MB)                                           |
|   [3] NoSQL Sanitization Middleware (sanitizeInput)                                   |
|   [4] Request Rate Limiter (rateLimiter: IP / User-scoped)                            |
|   [5] JWT Bearer Token Authenticator (authenticateToken)                              |
|   [6] Role-Based Access Control Guard (requireRoles)                                  |
|   [7] Domain Routers (/api/auth, /api/internships, /api/applications, etc.)           |
|   [8] Controller Business Logic + Service Layer                                       |
|   [9] Centralized Error Handler (AppError & errorHandler)                             |
+---------------------+-----------------------------------+-----------------------------+
                      |                                   |
                      v                                   v
+------------------------------------+  +-----------------------------------------------+
|     REAL-TIME WEBSOCKET DAEMON     |  |                 MONGODB ATLAS                 |
|             (Socket.IO)            |  |              (Cloud Database Clust)           |
|                                    |  |                                               |
|  - Authenticated User Rooms        |  |  - users, internships, applications           |
|  - Real-Time Direct & Group Chat   |  |  - allocations, attendance, tasks             |
|  - Instant Push Notifications      |  |  - evaluations, certificates, audit_logs      |
|  - Online / Offline Status Ping    |  |  - external_jobs, messages, notifications     |
+------------------------------------+  +-----------------------------------------------+
```

### 2.2 Step-by-Step Request Lifecycle
1. **User Action**: A user performs an action in the browser (e.g., submits the login form).
2. **Frontend Service**: React dispatches an asynchronous call via `authService.login()` through the Axios `apiClient`.
3. **Synchronous Token Attachment**: `client.js` normalizes the endpoint URL and attaches `Authorization: Bearer <token>` to request headers.
4. **Vite Proxy**: In development, Vite intercepts `/api/*` and proxies it directly to `http://127.0.0.1:5001/api/*`.
5. **Express Pipeline**:
   - `helmet` secures headers against XSS and clickjacking.
   - `cors` verifies that origin matches allowed local development ports (`5173`, `3000`).
   - `sanitizeInput` recursively strips forbidden MongoDB query operators (`$gt`, `$ne`, etc.) and JavaScript prototype injection keys (`__proto__`).
   - `express.json` parses JSON payload into `req.body`.
6. **Authentication & RBAC**:
   - `authenticateToken` extracts the Bearer token, verifies its signature using `JWT_SECRET`, checks expiration, verifies the account is active in MongoDB, and attaches `req.user`.
   - `requireRoles('admin', 'coordinator')` verifies user permissions before controller execution.
7. **Controller & Model Execution**: The controller executes database queries via Mongoose models, executes business rules, and saves records.
8. **Real-Time Notification Dispatch**: If applicable, events are broadcast instantly to connected clients via Socket.IO.
9. **Unified JSON Response**: A standardized JSON response payload (`{ success: true, data: { ... } }`) is sent back to the frontend.

---

## Chapter 3: Monorepo Folder Structure Explained

```
Smart-Internship-Management-System/
├── .env.example                 # Root environment template
├── .gitignore                   # Monorepo-wide Git exclusion rules
├── package.json                 # Monorepo task orchestrator (npm run dev, test, build)
├── server.js                    # Root bootstrap proxy forwarding to backend/server.js
│
├── backend/                     # Express & Node.js Backend Service
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies and test scripts
│   ├── server.js                # Dual-stack HTTP & Socket.IO server initialization
│   ├── uploads/                 # Local directory for uploaded student resumes (gitignored)
│   ├── src/
│   │   ├── app.js               # Express application initialization and middleware chain
│   │   ├── socket.js            # Real-time WebSocket connection handling and chat rooms
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB Atlas connection, retry logic, and health pings
│   │   │   ├── env.js           # Validated environment configuration with fallback defaults
│   │   │   └── initAdmins.js    # Automatic bootstrap for designated administrators
│   │   ├── controllers/         # Business logic handlers (auth, users, internships, chat, etc.)
│   │   ├── middlewares/         # Interceptors (auth, errorHandler, rateLimiter, sanitize, validators)
│   │   ├── models/              # Mongoose data schemas (User, Internship, Application, etc.)
│   │   ├── routes/              # Express API route endpoints mounted under /api
│   │   ├── services/            # Background tasks (jobScheduler, jobFeedService, emailService)
│   │   └── utils/               # Helpers (jwt, security, logger, fileUpload, AppError, certificatePdf)
│   └── tests/                   # 15 Automated integration test suites (166 test cases)
│
└── frontend/                    # React 18 & Vite Frontend Client
    ├── index.html               # SPA HTML entry point
    ├── vite.config.js           # Vite dev server configuration & backend proxy target
    ├── tailwind.config.js       # Custom design system colors (Burgundy, Champagne, Warm Slate)
    ├── package.json             # Frontend dependencies (React, Lucide, Tailwind, Axios)
    └── src/
        ├── main.jsx             # React DOM root render
        ├── App.jsx              # Application router, layout wrapper, and route declarations
        ├── api/                 # Axios client, auth token helpers, and interceptors
        ├── context/             # Global state (AuthContext, SocketContext, ThemeContext)
        ├── services/            # Frontend API service layer (auth, internships, chat, etc.)
        ├── utils/               # Navigation routers, validation helpers, formatting tools
        ├── components/
        │   ├── auth/            # ProtectedRoute and role guards
        │   ├── common/          # Reusable UI widgets (Button, Input, Card, Modal, Badges)
        │   └── layout/          # Navigation (TopNavbar, Sidebar, PublicNavbar, Footer, AppLayout)
        └── pages/               # 23 Role-specific and public view pages
```

---

## Chapter 4: Programming Languages, Frameworks & Tech Stack

### 4.1 Technology Matrix

| Technology | Layer | Primary Purpose in InternHub |
| :--- | :--- | :--- |
| **JavaScript (ES2022+ / ESM)** | Full-Stack | Native language used across both frontend and backend using standard ECMAScript modules (`import`/`export`). |
| **Node.js (v20+)** | Backend Runtime | Non-blocking, event-driven runtime executing the Express server, background schedulers, and test runners. |
| **Express 4.21** | Backend Framework | Lightweight, modular web framework structuring routes, middleware pipelines, and REST endpoints. |
| **React 18.3** | Frontend Library | Component-driven UI library utilizing functional components, hooks, and responsive DOM rendering. |
| **Vite 6.0** | Frontend Build Tool | Next-generation bundler delivering sub-second dev server startup, Hot Module Replacement (HMR), and minified Rollup production builds. |
| **MongoDB Atlas** | Database | Cloud-hosted NoSQL document database providing dynamic, JSON-like schema storage. |
| **Mongoose 8.9** | ODM (Object Data Modeling) | Strict schema validation, query abstraction, cascade hooks, and index management for MongoDB. |
| **Socket.IO 4.8** | Real-Time Layer | Bidirectional WebSocket abstraction enabling instant messaging, typing indicators, and push notifications. |
| **Tailwind CSS 3.4** | UI Styling | Utility-first CSS framework customized with InternHub's Burgundy & Champagne institutional color palette. |
| **Lucide React** | Iconography | High-performance, tree-shakable SVG icons used throughout navigation, forms, and cards. |
| **Axios 1.7** | HTTP Client | Promise-based HTTP client pre-configured with interceptors, JWT token attachment, and silent auto-retry. |
| **Multer 2.4** | File Uploads | Multipart form-data parser enforcing strict MIME-type filters and 5 MB size caps for student resume uploads. |
| **PDFKit 0.20** | Document Generation | Dynamic vector PDF generator compiling cryptographically verifiable internship completion certificates. |
| **Nodemailer 10.1** | Email Dispatcher | SMTP integration dispatching 6-digit Two-Step Verification codes and password recovery tokens. |

---

## Chapter 5: Frontend Architecture, Pages & Reusable Components

### 5.1 Application Entry & Routing (`App.jsx` & `main.jsx`)
- **Location**: [`frontend/src/main.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/main.jsx) & [`frontend/src/App.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/App.jsx)
- **Role**: Wraps the React application in three primary contexts:
  1. `AuthProvider`: Holds authenticated user profile, JWT token, and session restoration.
  2. `SocketProvider`: Manages WebSocket lifecycle, message events, and notification listeners.
  3. `AppLayout`: Renders persistent top navigation, collapsible sidebar, and platform status banners.
- **Route Guarding**: Protected routes are wrapped in `<ProtectedRoute allowedRoles={[...]}>`. If unauthenticated, the user is redirected to `/login`. If unauthorized for a specific role, a clean policy restriction screen is displayed.

### 5.2 Authentication Pages

#### 1. Login Page (`LoginPage.jsx`)
- **Location**: [`frontend/src/pages/LoginPage.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/pages/LoginPage.jsx)
- **Features**:
  - Two-Step Verification (2FA): Entering valid credentials triggers an email verification code modal.
  - Strict Autofill Defense: Empty initial state on mount, `autoComplete="new-password"` on password input, and hidden decoy inputs prevent unwanted browser pre-filling.
  - Google Sign-In: Direct authentication via Firebase Google OAuth.
  - Forgot Password Link: Opens the 6-digit email recovery modal.

#### 2. Admin Login Page (`AdminLoginPage.jsx`)
- **Location**: [`frontend/src/pages/AdminLoginPage.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/pages/AdminLoginPage.jsx)
- **Features**: Dedicated, high-security login gateway strictly restricted to designated administrators and coordinators (`s.v.padmavathi2005@gmail.com` and `arshadtaiyab010@gmail.com`).

#### 3. Register Page (`RegisterPage.jsx`)
- **Location**: [`frontend/src/pages/RegisterPage.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/pages/RegisterPage.jsx)
- **Features**: Public self-registration for Students, Companies, and Mentors. Dynamically swaps form inputs based on the selected role (e.g. University/Department for students; Company Name/Industry for employers). Prevents registration of administrative roles.

#### 4. Forgot Password Modal (`ForgotPasswordModal.jsx`)
- **Location**: [`frontend/src/components/common/ForgotPasswordModal.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/ForgotPasswordModal.jsx)
- **Features**: Three-step wizard:
  1. User enters registered email &rarr; Backend generates secure 6-digit OTP code with 15-minute expiry.
  2. User enters 6-digit code with real-time digit validation and 60-second cooldown timer.
  3. User enters and confirms new password &rarr; Backend updates password hash and revokes existing sessions.

### 5.3 Unified Role Dashboard (`DashboardPage.jsx`)
- **Location**: [`frontend/src/pages/DashboardPage.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/pages/DashboardPage.jsx)
- **Role Scoping**: Automatically detects `user.role` from `AuthContext` and renders the appropriate customized console:
  - **Admin / Coordinator**: Enrolled student count, partner employer network, active allocations, placement completion rates, attendance compliance rates, milestone progress bars, and recent activity logs.
  - **Student**: Active applications, current allocation, attendance stats, upcoming deliverables, and completed certificates.
  - **Company / Employer**: Active job postings, pending applicants, assigned mentors, and intern task submissions.
  - **Mentor**: Assigned student interns, daily check-in verification queue, and pending evaluations.

### 5.4 Reusable UI Component Library (`frontend/src/components/common/`)

| Component | File Path | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **`Button.jsx`** | [`frontend/src/components/common/Button.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/Button.jsx) | Versatile button supporting variants (`primary`, `outline`, `ghost`, `danger`), loading spinners, and icon positions. |
| **`Input.jsx`** | [`frontend/src/components/common/Input.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/Input.jsx) | Controlled form input with floating label, left icon slot, helper text, and accessible error message rendering. |
| **`Card.jsx`** | [`frontend/src/components/common/Card.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/Card.jsx) | Modular container split into `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent`. |
| **`Modal.jsx`** | [`frontend/src/components/common/Modal.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/Modal.jsx) | Accessible dialog backdrop with Esc key listener, focus trapping, and smooth enter/exit animations. |
| **`StatusBadge.jsx`** | [`frontend/src/components/common/StatusBadge.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/StatusBadge.jsx) | Color-coded status badge mapping application and placement states (`selected`, `pending`, `rejected`, etc.) to semantic colors. |
| **`LoadingState.jsx`** | [`frontend/src/components/common/LoadingState.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/LoadingState.jsx) | Skeleton loaders and animated spinners preventing cumulative layout shift during API fetching. |
| **`ErrorState.jsx`** | [`frontend/src/components/common/ErrorState.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/components/common/ErrorState.jsx) | Non-destructive error fallback displaying actionable error message and a manual "Try Again" retry trigger. |

---

## Chapter 6: Backend Architecture, Server Pipeline & Middleware

### 6.1 Server Entry Point (`server.js`)
- **Location**: [`backend/server.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/server.js)
- **Execution Flow**:
  1. Checks and clears port conflicts (`freePortIfOccupied`).
  2. Connects to MongoDB Atlas via `connectDB()`.
  3. Bootstraps designated administrators via `initAdmins()`.
  4. Starts dual-stack HTTP server listening on `PORT` (default: 5001).
  5. Initializes Socket.IO real-time engine (`initSocket(server)`).
  6. Starts background job aggregator and notification daemon (`startJobScheduler`).

### 6.2 Middleware Stack

| Middleware | File Path | Execution Order & Responsibility |
| :--- | :--- | :--- |
| **`helmet`** | [`backend/src/app.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/app.js#L17) | Sets HTTP security headers (prevents clickjacking, MIME sniffing). |
| **`cors`** | [`backend/src/app.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/app.js#L40) | Whitelists frontend dev servers (`localhost:5173`, `127.0.0.1:5173`) and mobile user agents. |
| **`sanitizeInput`** | [`backend/src/middlewares/sanitize.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/sanitize.js) | Recursively strips NoSQL injection operators (`$gt`, `$ne`, `$where`) and prototype pollution vectors (`__proto__`, `constructor`). |
| **`rateLimiter`** | [`backend/src/middlewares/rateLimiter.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/rateLimiter.js) | Enforces sliding-window rate limits (auth endpoints: 20 req/15min; global endpoints: 300 req/15min). |
| **`authenticateToken`** | [`backend/src/middlewares/auth.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/auth.js#L8) | Validates Bearer JWT, confirms account is active in MongoDB, checks password expiration timestamps, and sets `req.user`. |
| **`requireRoles`** | [`backend/src/middlewares/auth.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/auth.js#L77) | Enforces Role-Based Access Control (RBAC). Rejects unauthorized roles with HTTP 403 Forbidden. |
| **`errorHandler`** | [`backend/src/middlewares/errorHandler.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/errorHandler.js) | Catches unhandled errors, formats validation messages cleanly, and hides stack traces in production. |

---

## Chapter 7: Database Schemas, Collections & Entity Relationships

### 7.1 Entity Relationship Diagram (ERD)

```
+-------------------+              1:N              +----------------------+
|       User        | ----------------------------< |     Application      |
|-------------------|                               |----------------------|
| _id (ObjectId)    |                               | _id (ObjectId)       |
| email (String)    |                               | student (Ref: User)  |
| passwordHash      |                               | internship (Ref: ...) |
| role (Enum)       |                               | status (Enum)        |
| status (Enum)     |                               | resumeUrl (String)   |
| profile (Object)  |                               +----------------------+
+-------------------+                                          |
          | 1                                                  | 1
          |                                                    |
          | 1:N                                                v 1:1
          v                                         +----------------------+
+-------------------+              1:N              |      Allocation      |
|    Internship     | ----------------------------< |----------------------|
|-------------------|                               | _id (ObjectId)       |
| _id (ObjectId)    |                               | student (Ref: User)  |
| title (String)    |                               | company (Ref: User)  |
| company (Ref:User)|                               | mentor (Ref: User)   |
| location (String) |                               | status (Enum)        |
| status (Enum)     |                               +----------------------+
+-------------------+                                      |         |
                                                           | 1:N     | 1:N
                                                           v         v
                                                +------------+     +------------+
                                                | Attendance |     |    Task    |
                                                +------------+     +------------+
```

### 7.2 Core Collections Detailed

#### 1. `users` Collection (`models/User.js`)
- **Key Fields**: `name`, `email` (indexed, unique), `passwordHash`, `role` (`student`, `company`, `mentor`, `coordinator`, `admin`), `status` (`active`, `inactive`, `suspended`, `pending_verification`), `twoFactorCode`, `twoFactorExpires`, `resetPasswordCode`, `profile` (contains nested `studentDetails`, `companyDetails`, `mentorDetails`, `coordinatorDetails`).
- **Security Features**: `passwordHash` is hidden by default (`select: false`). Methods include `isValidPassword(candidate)` and `hashPassword(plain)`.

#### 2. `internships` Collection (`models/Internship.js`)
- **Key Fields**: `title`, `description`, `company` (`ObjectId` ref `User`), `companyName`, `location`, `locationType` (`remote`, `on-site`, `hybrid`), `skillsRequired` (`[String]`), `durationWeeks`, `stipendAmount`, `status` (`draft`, `published`, `closed`, `archived`), `openPositions`, `applicantsCount`.

#### 3. `applications` Collection (`models/Application.js`)
- **Key Fields**: `internship` (`ObjectId` ref `Internship`), `student` (`ObjectId` ref `User`), `status` (`submitted`, `under_review`, `shortlisted`, `interview`, `selected`, `rejected`, `withdrawn`), `resumeUrl`, `coverLetter`, `statusHistory` (`[timestamp, status, changedBy, note]`), `rejectionReason`.
- **Constraint**: Unique compound index on `{ internship: 1, student: 1 }` prevents a student from applying multiple times to the same opportunity.

#### 4. `allocations` Collection (`models/Allocation.js`)
- **Key Fields**: `student`, `internship`, `company`, `mentor` (`ObjectId` ref `User`), `startDate`, `endDate`, `status` (`active`, `completed`, `terminated`), `tasksCompleted`, `attendanceRate`.

#### 5. `attendances` Collection (`models/Attendance.js`)
- **Key Fields**: `student`, `allocation`, `date` (`YYYY-MM-DD`), `status` (`present`, `absent`, `remote`, `half_day`), `checkInTime`, `checkOutTime`, `workSummary`, `verifiedBy` (`ObjectId` ref `User`).

#### 6. `tasks` Collection (`models/Task.js`)
- **Key Fields**: `allocation`, `internship`, `assignedTo` (Student), `assignedBy` (Mentor/Company), `title`, `description`, `dueDate`, `status` (`pending`, `in_progress`, `submitted`, `completed`, `overdue`), `submissionUrl`, `feedback`, `grade`.

#### 7. `evaluations` Collection (`models/Evaluation.js`)
- **Key Fields**: `allocation`, `student`, `evaluator` (Mentor/Company), `evaluationType` (`mid_term`, `final`), `ratings` (technicalSkills, workEthic, communication, overallRating: 1–5), `strengths`, `improvements`, `recommendForHire`.

#### 8. `certificates` Collection (`models/Certificate.js`)
- **Key Fields**: `certificateCode` (unique, e.g. `CERT-2026-AB12CD`), `student`, `internship`, `allocation`, `issuedDate`, `status` (`valid`, `revoked`), `downloadUrl`.

#### 9. `audit_logs` Collection (`models/AuditLog.js`)
- **Key Fields**: `action` (e.g. `USER_ROLE_CHANGED`, `PASSWORD_RESET_COMPLETED`, `APPLICATION_DECISION`), `performedBy`, `performedByEmail`, `targetResource`, `ipAddress`, `status`, `details`. Immutable historical audit trail.

---

## Chapter 8: Complete REST API Endpoint Specification

### 8.1 Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | `{ name, email, password, role, profile }` | Registers a new Student, Company, or Mentor account. |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticates credentials; triggers 6-digit Two-Step Verification. |
| `POST` | `/api/auth/login-verify-2fa` | Public | `{ email, code }` | Validates 6-digit 2FA OTP code and returns JWT session token. |
| `POST` | `/api/auth/resend-2fa` | Public | `{ email }` | Dispatches a new 6-digit 2FA code with 60s cooldown limit. |
| `GET` | `/api/auth/me` | Authenticated | None | Retrieves profile of currently authenticated session. |
| `POST` | `/api/auth/logout` | Authenticated | None | Invalidates token client-side and returns success. |
| `POST` | `/api/auth/forgot-password` | Public | `{ email }` | Dispatches 6-digit password reset OTP to user email. |
| `POST` | `/api/auth/verify-reset-code` | Public | `{ email, code }` | Verifies reset OTP without immediately changing password. |
| `POST` | `/api/auth/reset-password` | Public | `{ email, code, newPassword }` | Verifies code and securely updates account password hash. |
| `POST` | `/api/auth/google` | Public | `{ credential, role }` | Google OAuth sign-in and automated profile provisioning. |

### 8.2 Internship Opportunities (`/api/internships`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/internships` | Public | Filtered search of published internships (keywords, location, duration). |
| `GET` | `/api/internships/:id` | Public | Detailed view of a single internship opportunity. |
| `POST` | `/api/internships` | Employer, Mentor, Coordinator, Admin | Creates a new internship posting with skill tags and requirements. |
| `PUT` | `/api/internships/:id` | Employer, Mentor, Coordinator, Admin | Updates an existing internship opportunity. |
| `DELETE` | `/api/internships/:id` | Employer, Mentor, Coordinator, Admin | Closes or archives an internship posting. |

### 8.3 Applications Workflow (`/api/applications`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Student | Submits internship application with resume link and cover letter. |
| `GET` | `/api/applications/my` | Student | Lists all applications submitted by the logged-in student. |
| `GET` | `/api/applications` | Employer, Mentor, Coordinator, Admin | Lists candidates across managed opportunities. |
| `PATCH` | `/api/applications/:id/status` | Employer, Mentor, Coordinator, Admin | Transitions status (`under_review`, `shortlisted`, `selected`, `rejected`). |
| `PATCH` | `/api/applications/:id/withdraw` | Student | Allows student to withdraw application before final decision. |

### 8.4 Attendance, Tasks & Evaluations (`/api/attendance`, `/api/tasks`, `/api/evaluations`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/check-in` | Student | Submits daily attendance record with work summary and location. |
| `GET` | `/api/attendance` | Authenticated | Lists attendance history (filtered by student or placement). |
| `PATCH` | `/api/attendance/:id/verify` | Mentor, Company, Coordinator | Mentors verify or correct student daily attendance records. |
| `POST` | `/api/tasks` | Mentor, Company, Coordinator | Assigns a new deliverable milestone to an active intern. |
| `PATCH` | `/api/tasks/:id/submit` | Student | Submits task deliverable link for mentor review. |
| `POST` | `/api/evaluations` | Mentor, Company | Records Midterm or Final 5-star appraisal evaluation. |

---

## Chapter 9: Real-Time WebSockets & Background Daemons

### 9.1 Socket.IO Real-Time Architecture (`backend/src/socket.js`)
- **Connection Handshake**: Authenticates users during the WebSocket handshake using their JWT token.
- **Dedicated User Rooms**: Each user is automatically joined to a private room: `user:<userId>`.
- **Conversation Rooms**: When a chat conversation opens, participants join `conversation:<convId>`.
- **Live Events**:
  - `message:send`: Dispatches instant chat messages to all conversation participants.
  - `typing:start` / `typing:stop`: Broadcasts live typing indicators.
  - `notification:new`: Dispatches instant push alerts for job alerts, application updates, or task assignments.

### 9.2 Background Job Scheduler Daemon (`backend/src/services/jobScheduler.js`)
- **Scheduler Loop**: Runs every 60 minutes in the background without blocking the Node.js event loop.
- **Job Aggregation**: Queries external job feeds (Arbeitnow API, LinkedIn scrapers, RSS feeds).
- **De-duplication**: Uses SHA-256 hash signatures computed from `{ company, title, location, url }` to guarantee no duplicate jobs are saved.
- **Real-Time Student Alerts**: When new matching jobs are discovered, notifications are dispatched automatically to enrolled students.

---

## Chapter 10: Security, Authentication & Role-Based Access Control (RBAC)

### 10.1 Multi-Layer Defense in Depth
1. **Password Security**: Passwords are hashed using PBKDF2 with 10,000 iterations and cryptographic salts (`crypto.pbkdf2Sync`). Plaintext passwords never enter the database.
2. **Session Revocation**: The `User` model tracks `passwordChangedAt`. If a token was issued before a user changed their password, `authenticateToken` automatically rejects the request with HTTP 401.
3. **NoSQL Injection Defense**: `sanitizeInput` sanitizes all input keys, stripping MongoDB operators (`$gt`, `$ne`, `$regex`, `$where`).
4. **Brute Force Protection**: Sliding-window rate limiters cap authentication attempts (max 20 requests per 15 minutes per IP).
5. **Two-Step Verification (2FA)**: Login dispatches a secure 6-digit numeric OTP to the user's verified personal email. Entering the wrong code more than 5 times locks the verification session.
6. **Immutable Audit Logging**: Administrative role changes, student application decisions, and password updates are recorded in `audit_logs` with timestamps and IP addresses.

---

## Chapter 11: Feature Implementation Audit Matrix

| Feature Specification | Implementation Status | Verification Details |
| :--- | :--- | :--- |
| **User Registration & Local Authentication** | **Fully Implemented & Tested** | BCrypt/PBKDF2 hashing, input validation, role assignment. Passes 18 integration tests. |
| **Two-Step Email Verification (2FA)** | **Fully Implemented & Tested** | 6-digit OTP generation, SMTP/terminal dispatch, 15m expiration, 5-attempt brute-force lock. |
| **Google OAuth Sign-In** | **Fully Implemented & Tested** | Firebase client authentication, backend token verification, automated user provisioning. |
| **Forgot Password Recovery Flow** | **Fully Implemented & Tested** | 6-digit verification code, password reset without dummy simulation, session revocation. |
| **Role-Based Access Control (5 Roles)** | **Fully Implemented & Tested** | Student, Mentor, Company, Coordinator, Admin enforced via `requireRoles` & `ProtectedRoute`. |
| **Student Profiles & Resume Upload** | **Fully Implemented & Tested** | Multer multipart upload, 5 MB limit, PDF/DOC/DOCX validation, download & delete endpoints. |
| **Internship Opportunities Directory** | **Fully Implemented & Tested** | Search, filter by skill/location/type, draft/published lifecycle. |
| **Application & Selection Pipeline** | **Fully Implemented & Tested** | Multi-stage lifecycle (`submitted` &rarr; `under_review` &rarr; `selected` / `rejected`), audit history. |
| **Student Placement Allocations** | **Fully Implemented & Tested** | Triple-binding between Student, Employer, and Mentor. Status tracking. |
| **Daily Attendance Tracking** | **Fully Implemented & Tested** | Check-in with work summary, remote/present status, mentor audit and verification. |
| **Milestone Tasks & Deadlines** | **Fully Implemented & Tested** | Task assignment, submission URLs, mentor grading, overdue deadline computation. |
| **Real-Time Direct & Group Chat** | **Fully Implemented & Tested** | Socket.IO WebSockets, message history persistence in MongoDB, unread counters. |
| **Cryptographic Certificates** | **Fully Implemented & Tested** | PDFKit vector PDF generation, unique verification codes, public verification portal. |
| **Aggregated Analytics & Dashboards** | **Fully Implemented & Tested** | Dynamic MongoDB aggregations, live department distributions, audit KPIs. |
| **Audit Logs & Regulatory Compliance** | **Fully Implemented & Tested** | Immutable action logging for account modifications, decisions, and security events. |
| **Automated Backend Test Suite** | **Fully Implemented & Tested** | **166 out of 166 integration tests passing across 15 test suites.** |

---

## Chapter 12: Beginner-Friendly Code Walkthrough

### 12.1 How the Frontend Starts (`frontend/src/main.jsx`)
```jsx
// 1. Import React core and ReactDOM client for mounting
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// 2. Locate the root <div> element in index.html and mount the React application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```
- **What this does**: `ReactDOM.createRoot` attaches our React single-page application to the `<div id="root"></div>` tag in `index.html`.
- `<BrowserRouter>` enables client-side URL routing without reloading the browser page.

### 12.2 How the Server Boots (`backend/server.js`)
```javascript
import http from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/socket.js';
import { initAdmins } from './src/config/initAdmins.js';

// 1. Wrap the Express app in a native Node HTTP server
const server = http.createServer(app);

// 2. Attach WebSocket engine to the HTTP server
initSocket(server);

// 3. Connect to database and start listening for connections
const startServer = async () => {
  await connectDB();   // Connect to MongoDB Atlas
  await initAdmins();  // Ensure designated administrators exist in DB
  server.listen(env.PORT, () => {
    console.log(`Server online on port ${env.PORT}`);
  });
};

startServer();
```
- **What this does**: Combines the Express REST API and Socket.IO real-time WebSocket server onto a single unified network port (`5001`).

### 12.3 How Route Protection Works (`ProtectedRoute.jsx`)
```jsx
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. While AuthContext is restoring session from token, show loading state
  if (isLoading) {
    return <LoadingState message="Verifying session credentials..." />;
  }

  // 2. If not logged in, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If user's role is not in allowedRoles, show Access Restricted warning
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <AccessRestrictedNotice allowedRoles={allowedRoles} userRole={user?.role} />;
  }

  // 4. Authorized: render the requested page component
  return children;
};
```
- **What this does**: Guarantees unauthorized users cannot view restricted pages simply by typing the URL into the browser bar.

---

## Chapter 13: College Presentation & Technical Interview Guide

### 13.1 Project Presentation Outline (5-Minute Walkthrough)
1. **Slide 1: Problem Statement** &rarr; Disconnected internship tracking in universities, lack of real-time mentor feedback, risk of unaccredited certificate fraud.
2. **Slide 2: Proposed System (InternHub)** &rarr; Unified, role-based platform connecting Students, Employers, Mentors, and University Coordinators.
3. **Slide 3: System Architecture** &rarr; React 18 SPA + Express REST API + MongoDB Atlas Cloud + Socket.IO WebSockets.
4. **Slide 4: Key Modules & Innovation**:
   - Two-Step Verification (2FA) and password recovery.
   - GPS/IP-validated daily attendance monitoring.
   - Task milestone tracking and mentor evaluations.
   - Vector PDF certificates with cryptographically verifiable QR/serial codes.
5. **Slide 5: Live Demonstration & Results** &rarr; Login as Student &rarr; Apply for internship &rarr; Login as Employer &rarr; Accept applicant &rarr; Mentor evaluation &rarr; Certificate issued.

### 13.2 Technical Interview Q&A

#### Q1: Why did you choose MongoDB over a Relational Database (SQL)?
> **Answer**: The internship management lifecycle features diverse entities with semi-structured and evolving attributes. For example, student profiles require dynamic skill tags, GPA, and resume metadata, while coordinator profiles require institutional faculty information. MongoDB's flexible document model allows role-specific nested schemas (`profile.studentDetails`, `profile.companyDetails`) within a unified `User` collection without costly SQL table joins or sparse columns.

#### Q2: How do you protect against NoSQL Injection attacks?
> **Answer**: We implement a recursive sanitization middleware (`sanitizeInput`) that inspects all incoming `req.body`, `req.query`, and `req.params`. Any keys beginning with `$` (such as `$gt`, `$ne`, `$where`) or containing prototype pollution keys (`__proto__`, `constructor`) are stripped before request data reaches Mongoose queries.

#### Q3: How is authentication handled securely without sessions stored on the server?
> **Answer**: We use stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`). When a user logs in and verifies their 6-digit Two-Step Verification code, the server issues a signed JWT containing their user ID and role. The client includes this in the `Authorization: Bearer <token>` header for subsequent requests. The server validates the signature, checks expiration, and checks the database to verify the account has not been deactivated or had its password changed.

#### Q4: How does the Real-Time Chat system scale and maintain authorization?
> **Answer**: Chat is built on Socket.IO with WebSocket transports. When a socket connects, the server authenticates the client's JWT token during the handshake. Users are partitioned into private socket rooms (`conversation:<id>`). Before joining a room or delivering messages, the backend checks MongoDB to ensure the user is an active participant in that specific conversation, preventing unauthorized snooping.

---

### 13.3 Recommended Study Order for Beginners
To quickly understand this project from scratch, study the code in this exact order:
1. **Data Model**: Read [`backend/src/models/User.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/models/User.js) and [`backend/src/models/Internship.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/models/Internship.js).
2. **Server Middleware**: Inspect [`backend/src/middlewares/auth.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/middlewares/auth.js) to understand how JWT tokens and roles are validated.
3. **Controller Logic**: Read [`backend/src/controllers/authController.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/backend/src/controllers/authController.js) to see how registration, login, and 2FA work.
4. **Frontend API Client**: Look at [`frontend/src/api/client.js`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/api/client.js) to see how Axios communicates with Express.
5. **State Management**: Read [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/context/AuthContext.jsx).
6. **UI Routing & Views**: Open [`frontend/src/App.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/App.jsx) and [`frontend/src/pages/DashboardPage.jsx`](file:///c:/Users/LENOVO/Desktop/Smart-Internship-Management-System/frontend/src/pages/DashboardPage.jsx).

---
*End of Documentation — InternHub: Smart Internship Management System (SIMS)*

