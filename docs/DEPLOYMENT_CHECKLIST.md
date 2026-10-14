# SIMS — Production Deployment Checklist & Demonstration Runbook

**Document Version:** 1.0.0  
**Phase:** Phase 12 — Final Product Polish & Deployment Readiness  
**Target System:** Smart Internship Management System (SIMS)  
**Classification:** Operational & College Demonstration Standard  

---

## 1. Pre-Deployment Architecture Overview

```
                      +-----------------------------+
                      |   Client Browser / Mobile   |
                      +--------------+--------------+
                                     |
                         HTTPS / WSS |
                                     v
               +-------------------------------------------+
               |  Reverse Proxy / CDN (Vercel/Nginx/Caddy) |
               +-------------+-----------------------------+
                             |
         +-------------------+-------------------+
         |                                       |
         v                                       v
+------------------+                   +--------------------+
|  Frontend Assets |                   |   Backend Service  |
|  (Vite 'dist/')  |                   |   Node.js/Express  |
+------------------+                   +---------+----------+
                                                 |
                                     TLS MongoDB | Connection
                                                 v
                                       +--------------------+
                                       |   MongoDB Atlas    |
                                       | (M0/M10+ Cluster)  |
                                       +--------------------+
```

---

## 2. Production Environment Variables Reference

### Backend (`backend/.env` or PaaS Dashboard)
> **CRITICAL**: Never commit `.env` or credential files into version control. Ensure all production values are injected via the hosting platform's Secrets / Environment Variables manager.

| Variable Name | Required | Default / Format | Description & Guidance |
|---|:---:|---|---|
| `NODE_ENV` | **YES** | `production` | Enables production error sanitization (masks internal stack traces). |
| `PORT` | **YES** | `5001` (or `$PORT`) | Port assigned by hosting environment. |
| `MONGO_URI` | **YES** | `mongodb+srv://...` | Full MongoDB Atlas connection URI with TLS and replica set configuration. |
| `CLIENT_URL` | **YES** | `https://sims.yourcollege.edu` | Primary frontend domain for CORS headers and Socket.IO handshake validation. |
| `ALLOWED_ORIGINS` | No | Comma-separated domains | Additional allowed origins (e.g. `https://staging.yourcollege.edu`). |
| `JWT_SECRET` | **YES** | Min 32 chars hex | Cryptographic secret for signing JWTs. Must be generated via `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (`24h`, `7d`). |

### Frontend (`frontend/.env.local` or Hosting Dashboard)

| Variable Name | Required | Example Value | Description |
|---|:---:|---|---|
| `VITE_API_URL` | **YES** | `https://api.sims.yourcollege.edu/api` | Full URL pointing to Express backend `/api` namespace. If reverse-proxied behind same domain, use `/api`. |
| `VITE_SOCKET_URL` | **YES** | `https://api.sims.yourcollege.edu` | Base URL for Socket.IO WebSocket handshake. |

---

## 3. Database Setup: MongoDB Atlas (Step-by-Step)

1. **Create Cluster:**
   - Log into [MongoDB Cloud](https://cloud.mongodb.com/).
   - Create a Free (M0 Shared) or Dedicated (M10+) Cluster in the desired cloud region (e.g., AWS `ap-south-1` Mumbai or `us-east-1`).
2. **Configure Database User:**
   - Navigate to **Security** -> **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set Username: `sims_app_user`.
   - Generate a strong password (copy and store securely in a password manager).
   - Database User Privileges: `readWrite` on `smart_internship_db`.
3. **Configure Network IP Access:**
   - Navigate to **Security** -> **Network Access**.
   - Click **Add IP Address**.
   - If hosting on PaaS with dynamic IPs (Render, Railway, Heroku, Vercel Serverless): Add `0.0.0.0/0` (Allow access from anywhere).
   - If hosting on VPC / Static IP (AWS EC2, DigitalOcean Droplet): Add only the static public IP of the backend server.
4. **Acquire Connection String:**
   - Navigate to **Database** -> **Connect** -> **Drivers (Node.js)**.
   - Format:
     ```
     mongodb+srv://<db_user>:<db_password>@<cluster-subdomain>.mongodb.net/smart_internship_db?retryWrites=true&w=majority
     ```
   - Replace `<db_user>` and `<db_password>` with your created database credentials.

---

## 4. Backend Deployment Guide

### Option A: Platform-as-a-Service (Render / Railway / Fly.io)
1. Link GitHub repository to Render/Railway.
2. Select Root Directory: `backend`.
3. Set Build Command: `npm install`.
4. Set Start Command: `npm start` (or `node server.js`).
5. Configure Environment Variables in Service Settings:
   - `NODE_ENV`: `production`
   - `PORT`: `5001` (or leave default if injected automatically)
   - `MONGO_URI`: `mongodb+srv://sims_app_user:REDACTED@cluster0.xxx.mongodb.net/smart_internship_db?retryWrites=true&w=majority`
   - `CLIENT_URL`: `https://sims-frontend.vercel.app`
   - `JWT_SECRET`: `<64-character-hex-string>`
   - `JWT_EXPIRES_IN`: `7d`
6. Verify deployment logs:
   - `MongoDB connection established successfully.`
   - `Smart Internship Management System backend running in production mode on port ...`

### Option B: Docker Containerization
```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5001
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

---

## 5. Frontend Deployment Guide

### Option A: Static Hosting (Vercel / Netlify / Cloudflare Pages)
1. Link GitHub repository to Vercel/Netlify.
2. Set Root Directory: `frontend`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_URL`: `https://api.sims-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://api.sims-backend.onrender.com`
6. Configure SPA Single Page Redirects (`vercel.json` or `_redirects`):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 6. Pre-Flight Verification Checklist

- [x] **Git & Secret Hygiene**:
  - Confirmed `.gitignore` excludes `.env`, `.env.*`, `node_modules/`, `dist/`, `uploads/`, `logs/`.
  - Stored secrets exclusively in hosting environment secret managers.
  - No database passwords, JWT secrets, or cloud keys committed to git history.
- [x] **Backend Test Suite Validation**:
  - Run full backend integration test suite: `npm test`
  - Ensure all 143 tests across all 12 test suites pass with 0 failures.
- [x] **Frontend Production Build**:
  - Run `npm run build` in `frontend/`.
  - Ensure zero build/bundling errors, asset minification complete.
- [x] **Health Check Diagnostic**:
  - Query `GET /api/health`.
  - Confirm `{"status":"healthy","database":{"status":"connected"}}` returns 200 OK.
- [x] **Security & CORS Verification**:
  - Attempt request with unpermitted `Origin` header; confirm `403` or CORS error.
  - Verify `X-Powered-By` header is stripped.
  - Verify Helmet security headers are present in responses.
- [x] **Rate Limiting Verification**:
  - Exceed 10 rapid login attempts; confirm `429 Too Many Requests` with `Retry-After` header.

---

## 7. College Project Demonstration Script (10-Minute Walkthrough)

| Minute | Target Role | Action & Demo Feature | Key Takeaway for Evaluators |
|:---:|---|---|---|
| **00 - 02** | **Public & System** | Navigate to `/`. Display live cluster monitor, health check diagnostics, and dynamic 12-phase engineering roadmap. | Enterprise-grade project foundation, real-time MongoDB status, responsive dark/light mode. |
| **02 - 04** | **Student Portal** | Log in as Student (`student@example.com` / `StudentPass123!`). Explore **Internship Directory**, filter by stipend/work mode, view job details, and submit application with PDF resume. | Clean UX, instant field validation, compound unique index preventing duplicate applications. |
| **04 - 06** | **Coordinator & Employer** | Log in as Coordinator (`coordinator@example.com` / `CoordPass123!`). Navigate to **Candidate Review**, view student applicant, update status to **Selected**, and create **Official Allocation** with mentor assignment. | Multi-role workflow handover, atomic state transitions, active allocation collision prevention. |
| **06 - 07** | **Mentor Workspace** | Log in as Mentor (`mentor@example.com` / `MentorPass123!`). Assign prioritized milestone deliverable to allocated intern. Switch to Student, submit task progress and log daily attendance. Mentor approves attendance record. | Full operational cycle of internship task tracking, attendance audit logging, and supervisory controls. |
| **07 - 08** | **Real-Time Features** | Open two browser windows side-by-side (Mentor & Student). Show real-time **Notification Bell** updating and open **Real-Time Chat** (`/chat`). Send messages, show instant delivery and persistence. | Socket.IO room isolation, zero message leakage, database persistence in MongoDB. |
| **08 - 10** | **Admin & Analytics** | Log in as Admin (`admin@example.com` / `AdminPass123!`). View **Analytics Dashboard**, submit rubric **Performance Evaluation**, query multi-filter **Reports**, export sanitized CSV, and inspect **Audit Logs**. | Defense-in-depth security, RBAC enforcement, formula-injection protection, immutable regulatory audit trail. |

---
*Checklist verified and approved for SIMS v1.0 deployment.*
