# ⚡ TaskFlow — Team Task Manager

A full-stack team project & task management app with role-based access control, built with **Node.js + Express + SQLite** backend and **React** frontend.

---

## 🌐 Live Demo

> **Live URL:** taskflow-production-4937.up.railway.app

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | demo123 |
| Member | member@demo.com | demo123 |
| Member | bob@demo.com | demo123 |
| Member | carol@demo.com | demo123 |

---

## ✨ Features

### Authentication
- JWT-based signup & login
- Persistent sessions (7-day tokens)
- Role-based access: **Admin** and **Member**

### Projects
- Create, view, update, and delete projects
- Archive/activate projects
- Per-project progress tracking

### Team Management
- Add/remove members from projects
- Project-level roles (Admin/Member) independent of system role
- Owner-protected membership

### Tasks
- Full CRUD with title, description, status, priority, assignee, due date
- 4 statuses: `To Do → In Progress → Review → Done`
- 4 priorities: `Low / Medium / High / Urgent`
- **Kanban board** and **List view**
- Quick status advancement with one click
- Comment threads on tasks

### Dashboard
- Personal task overview
- Overdue task alerts
- Status breakdown stats
- Recent activity feed
- Completion rate tracking

### Admin Panel
- View all users and their roles
- Overview of all projects across the platform

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express |
| Database | SQLite via @libsql/client |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Styling | Custom CSS (no framework) |
| Deployment | Railway |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── models/
│   │   └── db.js              # DB client + helpers (init, get, all, run)
│   ├── middleware/
│   │   └── auth.js            # JWT auth + project access middleware
│   ├── routes/
│   │   ├── auth.js            # /api/auth — signup, login, users
│   │   ├── projects.js        # /api/projects — CRUD + members
│   │   ├── tasks.js           # /api/projects/:id/tasks — CRUD + comments
│   │   └── dashboard.js       # /api/dashboard — stats + activity
│   ├── server.js              # Express app entry point
│   └── seed.js                # Demo data seeder
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   └── Layout.jsx      # Sidebar navigation
│       ├── pages/
│       │   ├── AuthPages.jsx   # Login + Signup
│       │   ├── DashboardPage.jsx
│       │   ├── ProjectsPage.jsx
│       │   ├── ProjectDetailPage.jsx  # Board + List + Members
│       │   └── AdminPage.jsx
│       ├── api.js              # Axios client with JWT interceptor
│       ├── utils.js            # Date helpers
│       ├── App.js              # Routes + auth guards
│       └── index.css           # Full design system
├── railway.toml
├── .gitignore
└── README.md
```

---

## 🗄 Database Schema

```sql
users           — id, name, email, password, role (admin|member), created_at
projects        — id, name, description, owner_id, status (active|archived), created_at
project_members — id, project_id, user_id, role (admin|member), joined_at
tasks           — id, title, description, project_id, assigned_to, created_by,
                  status (todo|in_progress|review|done), priority (low|medium|high|urgent),
                  due_date, created_at, updated_at
comments        — id, task_id, user_id, content, created_at
```

---

## 🔌 REST API Reference

### Auth
```
POST /api/auth/signup       { name, email, password, role? }
POST /api/auth/login        { email, password }
GET  /api/auth/me           (auth required)
GET  /api/auth/users        (auth required) — all users for assignment
```

### Projects
```
GET    /api/projects                    — list my projects
POST   /api/projects                    { name, description }
GET    /api/projects/:id                — project + members
PUT    /api/projects/:id                { name?, description?, status? }
DELETE /api/projects/:id                (project admin)
POST   /api/projects/:id/members        { user_id, role? }
DELETE /api/projects/:id/members/:uid   (project admin)
```

### Tasks
```
GET    /api/projects/:pid/tasks         ?status= &priority= &assigned_to=
POST   /api/projects/:pid/tasks         { title, description?, assigned_to?, status?, priority?, due_date? }
GET    /api/projects/:pid/tasks/:id
PUT    /api/projects/:pid/tasks/:id     (partial update)
DELETE /api/projects/:pid/tasks/:id
POST   /api/projects/:pid/tasks/:id/comments  { content }
```

### Dashboard
```
GET /api/dashboard   — stats, myTasks, overdueTasks, recentActivity
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow

# 2. Install & seed backend
cd backend
npm install
node seed.js
cd ..

# 3. Install & start frontend
cd frontend
npm install
npm start

# 4. In a separate terminal, start backend
cd backend
node server.js
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`.

---

## 🚂 Deploy to Railway

### Method 1: Railway CLI (recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Method 2: GitHub Integration

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repository
4. Railway will auto-detect the `railway.toml` config
5. Set environment variables:

### Environment Variables (in Railway dashboard)

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | `your-long-random-secret-string` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Railway sets this automatically) |

Railway will:
1. Install all dependencies
2. Build the React frontend
3. Copy the build into `backend/public/`
4. Run `seed.js` to create demo data
5. Start the Express server (which serves the frontend)

---

## 🔐 Role-Based Access Control

| Action | System Admin | Project Admin | Project Member | Non-member |
|--------|:-----------:|:-------------:|:--------------:|:----------:|
| View all projects | ✅ | — | — | ❌ |
| Create project | ✅ | ✅ | ✅ | ✅ |
| Edit/delete project | ✅ | ✅ | ❌ | ❌ |
| Add/remove members | ✅ | ✅ | ❌ | ❌ |
| Create task | ✅ | ✅ | ✅ | ❌ |
| Edit any task | ✅ | ✅ | Own only | ❌ |
| Delete any task | ✅ | ✅ | Own only | ❌ |
| View admin panel | ✅ | ❌ | ❌ | ❌ |

---

## 📦 Key Packages

**Backend:**
- `express` — HTTP server
- `@libsql/client` — SQLite (WASM, no native build required)
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT auth
- `express-validator` — request validation
- `cors` — cross-origin support

**Frontend:**
- `react` + `react-dom` — UI framework
- `react-router-dom` v6 — client-side routing
- `axios` — HTTP client with interceptors
- `date-fns` — date formatting & comparison

---

## 📝 License

MIT
