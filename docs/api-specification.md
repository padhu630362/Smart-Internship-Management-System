# API Specification & WebSocket Protocols

## 1. General Principles

### A. Base URL
* **Development:** `http://localhost:5000/api`
* **Production:** `https://api.yourdomain.com/api`

### B. Standard Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### C. Standard Response Envelope
All REST API responses conform to a unified envelope structure:

#### Success Envelope (`2xx`)
```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable confirmation",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

#### Error Envelope (`4xx`, `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found.",
    "details": []
  }
}
```

---

## 2. Implemented Endpoints (Phase 1 Foundation)

### `GET /api/health`
Checks backend responsiveness, server uptime, environment mode, and database connection state.

* **Auth Required:** No
* **Sample Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptimeSeconds": 142.8,
    "timestamp": "2026-10-13T10:30:00.000Z",
    "environment": "development",
    "database": {
      "status": "connected",
      "host": "127.0.0.1"
    }
  }
}
```

---

## 3. Planned API Endpoints (Phases 2 – 5)

### A. Authentication & Profiles (`/api/auth`, `/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account with role selection |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile |
| `PATCH`| `/api/users/profile` | Authenticated | Update user-specific profile details |

### B. Internships (`/api/internships`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/internships` | Public | List published internships with filtering & pagination |
| `GET` | `/api/internships/:id` | Public | Get internship details |
| `POST` | `/api/internships` | Company | Create a new internship listing |
| `PATCH`| `/api/internships/:id` | Company, Admin | Update internship details or status |
| `DELETE`| `/api/internships/:id` | Company, Admin | Soft-delete / archive internship listing |

### C. Applications (`/api/applications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Student | Submit an internship application |
| `GET` | `/api/applications/my-submissions` | Student | List applications submitted by student |
| `GET` | `/api/applications/internship/:internshipId` | Company | List applicants for a specific posting |
| `PATCH`| `/api/applications/:id/status` | Company, Admin | Update status (shortlist, interview, offer, reject) |
| `PATCH`| `/api/applications/:id/assign-mentor`| Company, Admin | Assign mentor to accepted intern |

### D. Tasks & Deliverables (`/api/tasks`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tasks` | Mentor | Create milestone task for student |
| `GET` | `/api/tasks/assigned` | Student | Get all tasks assigned to the current student |
| `GET` | `/api/tasks/mentor-overview` | Mentor | Get all tasks supervised by current mentor |
| `POST` | `/api/tasks/:id/submissions` | Student | Submit deliverable links and notes |
| `PATCH`| `/api/tasks/:id/review` | Mentor | Review deliverable (approve or request revision) |

### E. Evaluations (`/api/evaluations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/evaluations` | Mentor | Submit midterm or final performance assessment |
| `GET` | `/api/evaluations/student/:studentId` | Student, Mentor, Admin | View performance scorecard |

---

## 4. WebSocket Event Protocols (Socket.IO)

Clients connect to the root namespace passing an authentication payload:
```javascript
const socket = io(VITE_SOCKET_URL, {
  auth: { token: "Bearer <JWT>" }
});
```

### Event Catalog

| Event Name | Direction | Payload Example | Purpose |
| :--- | :--- | :--- | :--- |
| `join:user_channel` | Client -> Server | `{ userId: "..." }` | Joins private alert room |
| `notification:new` | Server -> Client | `{ id, title, message, link }` | Push immediate alert |
| `application:status_changed` | Server -> Client | `{ applicationId, status }` | Live status bar update |
| `task:updated` | Server -> Client | `{ taskId, status, feedback }` | Task card state refresh |
