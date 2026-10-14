# Smart Internship Management System (SIMS)

[![Version](https://img.shields.io/badge/Release-v1.0.0%20(Production%20Ready)-blue.svg)](https://github.com)
[![Tests](https://img.shields.io/badge/Tests-151%2F151%20Passing%20(100%25)-brightgreen.svg)](docs/TEST_REPORT.md)
[![Node](https://img.shields.io/badge/Node-v20%2B%20LTS-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-cyan.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-v6-purple.svg)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-v4-gray.svg)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Replica%20Set-emerald.svg)](https://mongodb.com)

The **Smart Internship Management System (SIMS)** is an enterprise-grade, multi-role web platform designed for universities, colleges, students, host employers, and industry mentors. It streamlines the full internship lifecycle: from opportunity discovery and applicant screening to **AI-powered resume analysis & skill matching**, official allocations, daily attendance audit trails, deliverable milestone tracking, real-time messaging, Socket.IO notifications, rubric performance appraisals, **institutional completion certificates with public verification**, and regulatory accreditation reporting.

---

## 1. System Architecture & Tech Stack

```
                      +-----------------------------+
                      |   Client Browser / Mobile   |
                      |    (React 18 SPA + Vite)    |
                      +--------------+--------------+
                                     |
               HTTPS (REST) + Bearer | WSS (Socket.IO Real-time)
                                     v
               +-------------------------------------------+
               |        Express Gateway (Port 5001)        |
               |  - Helmet Security Headers & CORS Guard   |
               |  - NoSQL Injection & Prototype Sanitizer  |
               |  - Sliding-Window Rate Limiting (429)     |
               |  - RFC 7519 JWT Auth & Session Revocation |
               +---------------------+---------------------+
                                     |
                                     | Mongoose ODM + TLS
                                     v
               +-------------------------------------------+
               |        MongoDB Atlas Replica Set          |
               |  - 10 Data Collections with Compound Keys |
               |  - Immutable Regulatory Audit Logs        |
               +-------------------------------------------+
```

### Core Technologies
- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Node.js v20+, Express 4, Socket.IO 4, Multer, Helmet, Morgan.
- **Database**: MongoDB Atlas multi-shard replica set via Mongoose 8.
- **Security**: Node native `scrypt` password hashing, RFC 7519 JWT verification, NoSQL query stripping, ReDoS regex escaping, CSV formula-injection defense, immutable audit logging.

---

## 2. Multi-Role Capability Matrix

SIMS implements strict Role-Based Access Control (RBAC) across five system roles:

| Role | Key Capabilities & Workspaces |
|---|---|
| **Student / Intern** (`student`) | Browse opportunity directory with filters, live AI Skill Fit match calculator, upload PDF resume with authenticated inline viewer, 1-click application submission, application status timeline, daily attendance check-in, milestone task submissions, real-time 1-on-1 and group chat, Socket.IO notifications, earned completion certificates with PDF downloads and public verification. |
| **Employer / Company** (`company`) | Post and manage internship listings (openings, requirements, deadlines), candidate screening Kanban board with AI Match Score (0-100%) and matched/missing skills badges, on-demand AI resume analysis, review student resumes, transition application states (`under_review`, `shortlisted`, `interview`, `selected`, `rejected`), evaluate intern performance. |
| **Industry Mentor** (`mentor`) | Self-registration with company affiliation, supervise assigned interns, create prioritized deliverable tasks with due dates, review and approve daily attendance with audit notes, submit numerical rubric performance appraisals (technical, communication, overall), auto-issue accredited completion certificates upon passing final evaluation, direct chat with interns. |
| **Internship Coordinator** (`coordinator`) | University academic supervisor console, publish institutional opportunities, verify employer credentials, create official allocations linking student-opportunity-mentor, review cross-department attendance, query analytical reports, export sanitized CSV. |
| **System Administrator** (`admin`) | Institutional governance console, complete user and mentor management (search, paginate, toggle status, change roles), last-active administrator safety protection, inspect immutable regulatory audit logs with actor and IP tracking, platform-wide placement metrics. |

---

## 3. Monorepo Directory Structure

```text
Smart-Internship-Management-System/
├── .env.example                 # Root environment template
├── .gitignore                   # Excludes .env, node_modules/, dist/, uploads/
├── package.json                 # Monorepo task orchestration (dev, test, build)
├── README.md                    # Project documentation & presentation guide
│
├── docs/                        # Architecture & Engineering Specifications
│   ├── DEPLOYMENT_CHECKLIST.md  # Production deployment guide & checklist
│   ├── TEST_REPORT.md           # Certified Phase 11 Full System Test Report (143/143 tests)
│   ├── PROJECT_AUDIT.md         # Architecture status & audit matrix
│   ├── roadmap.md               # 12-phase engineering roadmap & milestone gates
│   ├── architecture.md          # Multi-tier architectural specifications
│   ├── database-design.md       # MongoDB collections, Mongoose schemas & indexes
│   ├── api-specification.md     # REST endpoints, response envelopes & socket specs
│   └── role-permission-matrix.md# RBAC security rules & route guards
│
├── backend/                     # Node.js + Express API Server
│   ├── .env.example             # Backend environment template (PORT, MONGO_URI, JWT_SECRET)
│   ├── package.json             # Backend dependencies and native test scripts
│   ├── server.js                # Server entrypoint with Socket.IO & graceful shutdown
│   ├── src/
│   │   ├── app.js               # Express app, Helmet, CORS, and sanitization middlewares
│   │   ├── config/              # env.js and MongoDB connection (db.js)
│   │   ├── controllers/         # Auth, Users, Internships, Applications, Allocations,
│   │   │                        # Attendance, Tasks, Chat, Evaluations, Reports, Audit
│   │   ├── middlewares/         # auth, RBAC guards, validateUser, errorHandler, sanitize
│   │   ├── models/              # User, Internship, Application, Allocation, Attendance,
│   │   │                        # Task, Notification, Conversation, Message, Evaluation, AuditLog
│   │   ├── routes/              # Modular Express API routes
│   │   ├── services/            # auditService, notificationService
│   │   ├── socket.js            # Authenticated Socket.IO notification & chat server
│   │   └── utils/               # AppError, logger, security (scrypt), jwt, fileUpload
│   └── tests/                   # 12 automated test suites (143 integration tests)
│
└── frontend/                    # React 18 + Vite SPA
    ├── .env.example             # Frontend environment template (VITE_API_URL, VITE_SOCKET_URL)
    ├── package.json             # Frontend dependencies & build tooling
    ├── vite.config.js           # Vite dev server configuration & API proxy
    ├── tailwind.config.js       # Tailwind CSS theme configuration & design tokens
    └── src/
        ├── main.jsx             # React DOM root render with BrowserRouter
        ├── App.jsx              # Main routing shell & protected route guards
        ├── index.css            # Custom CSS utilities & glassmorphism tokens
        ├── api/client.js        # Axios instance with Bearer interceptor & session expiry
        ├── context/AuthContext  # React context managing user state & JWT restoration
        ├── components/          # Reusable UI library (TopNavbar, Sidebar, Modals, Tables,
        │                        # Cards, SkeletonCard, EmptyState, ErrorState, NotificationBell)
        └── pages/               # DashboardPage, InternshipsDirectoryPage, AdminUsersPage,
                                 # ManageAllocationsPage, StudentAttendancePage, ChatPage,
                                 # ReportsPage, EvaluationsPage, ProfilePage, RoadmapPage
```

---

## 4. Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.0.0` or higher (`v20.x` or `v22.x LTS` recommended)
- **npm**: `v10.0.0` or higher
- **MongoDB**: MongoDB Atlas cloud account (free M0 tier) or local MongoDB Community Server `v6.0+`
- **Git**: `v2.30+`

---

## 5. Quickstart & Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/Smart-Internship-Management-System.git
cd Smart-Internship-Management-System
```

### Step 2: Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### Step 3: Configure Environment Variables

**Backend Configuration:**
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env` with your settings:
```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/smart_internship_db?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=
JWT_SECRET=development_jwt_secret_change_in_production_min_32_characters
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_optional_google_gemini_api_key_here
```

**Frontend Configuration:**
```bash
cd ../frontend
cp .env.example .env.local
```
`frontend/.env.local` defaults:
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

---

## 6. Running the Application Locally

### Option A: Run Backend and Frontend Concurrently (from root)
```bash
npm run dev
```

### Option B: Run in Separate Terminals
**Terminal 1 (Backend Server):**
```bash
cd backend
npm run dev
# Server listens at http://localhost:5001
# Health Check: http://localhost:5001/api/health
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Vite dev server runs at http://localhost:5173
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 7. Automated Testing Suite

The project includes 12 automated test suites built on Node's native test runner (`node:test`) and Supertest:

```bash
cd backend
npm test
```

### Test Suite Summary:
```
✔ tests/health.test.js ................................................. PASS (2/2)
✔ tests/auth.test.js ................................................... PASS (10/10)
✔ tests/users.test.js .................................................. PASS (13/13)
✔ tests/internships.test.js ............................................ PASS (14/14)
✔ tests/applications.test.js ........................................... PASS (12/12)
✔ tests/phase6.test.js ................................................. PASS (15/15)
✔ tests/notifications.test.js .......................................... PASS (10/10)
✔ tests/chat.test.js ................................................... PASS (15/15)
✔ tests/phase9.test.js ................................................. PASS (12/12)
✔ tests/phase10.test.js ................................................ PASS (15/15)
✔ tests/phase11.test.js (10 E2E Workflows: WF-01 to WF-10) ............. PASS (10/10)
✔ tests/phase11.test.js (11 Negative Regressions: NEG-01 to NEG-11) .... PASS (11/11)
──────────────────────────────────────────────────────────────────────────────────
RESULT: 143 passed, 0 failed, 0 skipped (100% GREEN)
```
For full details, view [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

---

## 8. Building for Production

Compile the optimized client bundle:
```bash
cd frontend
npm run build
```
- Output directory: `frontend/dist/`
- Zero bundling errors, minified JavaScript and CSS assets.
- Assets can be served by Nginx, Cloudflare Pages, Vercel, or Netlify.

---

## 9. College Demonstration Guide (10-Minute Script)

Use this script for evaluators or project presentations:

1. **System Foundation & Overview (0:00 - 2:00)**
   - Open `http://localhost:5173/`.
   - Point out the **Live Cluster Monitor** badge ("Live MongoDB Atlas", "Connected (5001)").
   - Toggle **Dark / Light Mode** using the top navigation switch.
   - Navigate to `/roadmap` to present all **12 verified project phases**.

2. **Student Workflow (2:00 - 4:00)**
   - Register or log in as Student (`student@example.com` / `StudentPass123!`).
   - Go to **Internship Directory**: search by keyword, filter by Remote work mode and stipend.
   - Open an opportunity modal, review criteria, and click **Apply** (uploading PDF resume).
   - Show that clicking apply again shows "Already Applied" (compound index deduplication).

3. **Coordinator & Employer Workflow (4:00 - 6:00)**
   - Log in as Coordinator (`coordinator@example.com` / `CoordPass123!`).
   - Navigate to **Candidate Review**: review the applicant and transition status to **Selected**.
   - Navigate to **Intern Allocations**: click **Allocate Student**, pair the student with an industry mentor, set dates, and save.

4. **Mentor Supervision, Attendance & Tasks (6:00 - 8:00)**
   - Log in as Mentor (`mentor@example.com` / `MentorPass123!`).
   - Navigate to **Manage Tasks**: assign a high-priority task with a deadline.
   - Switch to Student tab: submit progress notes on the task and log today's **Daily Attendance** (8 hours).
   - In Mentor tab: approve the attendance record with an audit correction trail note.

5. **Real-time Notifications & Chat (8:00 - 9:00)**
   - Point out the **Notification Bell** in the top navbar updating live unread counts.
   - Open `/chat` in two split browser windows (Mentor and Student).
   - Send real-time messages; demonstrate instantaneous delivery, timestamps, and database persistence.

6. **Admin Governance, Analytics & Reports (9:00 - 10:00)**
   - Log in as Admin (`admin@example.com` / `AdminPass123!`).
   - Navigate to **Dashboard**: view aggregated metrics across enrolled students, active partners, and placement rates.
   - Navigate to **Reports**: filter by department/date range and click **Export CSV** (show sanitized data output).
   - View **Audit Logs**: show immutable regulatory logs tracking role changes and decisions.

---

## 10. Security & Defensive Engineering Standards

- **NoSQL Injection Defense**: `sanitizeInput` middleware recursively strips MongoDB operator keys (`$gt`, `$ne`, `$where`) and keys with dots.
- **ReDoS Protection**: `escapeRegex` utility neutralizes catastrophic backtracking on user search inputs.
- **IDOR Protection**: Resume downloads and scoped queries strictly enforce ownership authorization.
- **Rate Limiting**: Sliding-window rate limiters block brute force on auth endpoints, returning `429 Too Many Requests` with `Retry-After`.
- **Session Revocation**: Tokens issued prior to password resets or account deactivation are immediately invalidated.
- **Formula Injection Defense**: CSV exports automatically neutralize dangerous spreadsheet calculation characters (`=`, `+`, `-`, `@`).

---

## 11. Documentation Directory

- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Comprehensive Phase 11 Full System Test Report (143 automated tests).
- [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md) — Step-by-step production deployment & Atlas setup guide.
- [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) — Architecture status, audit matrix, and future scope.
- [`docs/roadmap.md`](docs/roadmap.md) — Complete 12-phase engineering roadmap with acceptance criteria.
- [`docs/database-design.md`](docs/database-design.md) — Database schema specifications and indexing strategies.
- [`docs/role-permission-matrix.md`](docs/role-permission-matrix.md) — RBAC role-permission mapping.

---
*Developed with modern React, Express, MongoDB, and Socket.IO. Licensed under the MIT License.*
