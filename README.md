# ERP Case Study — Full-Stack PERN Application

> **Stack:** PostgreSQL · Express.js · React.js · Node.js  
> **Workflow:** Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Migration & Seed Instructions](#migration--seed-instructions)
7. [Running the Application](#running-the-application)
8. [Test Login Credentials](#test-login-credentials)
9. [Running Tests](#running-tests)
10. [API Documentation](#api-documentation)
11. [Business Workflow](#business-workflow)
12. [Database Schema](#database-schema)
13. [Key Technical Decisions](#key-technical-decisions)

---

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 19, Vite, React Router, Axios, Tailwind CSS |
| Backend  | Node.js, Express.js                               |
| Database | PostgreSQL (raw `pg` driver)                      |
| Auth     | JWT (jsonwebtoken) + bcryptjs                     |

---

## Project Structure

```
erpSystem/
├── backend/
│   ├── config/
│   │   └── db.js               # PostgreSQL pool connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── enquiryController.js
│   │   ├── quotationController.js
│   │   ├── salesOrderController.js
│   │   ├── dispatchController.js
│   │   └── inventoryController.js
│   ├── db/
│   │   ├── schema.sql           # All 11 table definitions with FKs & constraints
│   │   └── seed.js              # Complete DB reset & initial data seed script
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── roleMiddleware.js    # RBAC (ADMIN / SALES_USER)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── enquiryRoutes.js
│   │   ├── quotationRoutes.js
│   │   ├── salesOrderRoutes.js
│   │   ├── dispatchRoutes.js
│   │   └── inventoryRoutes.js
│   ├── utils/
│   │   └── generateNumber.js   # Auto-number generator (SO-001, QUO-001, DIS-001 …)
│   ├── .env                    # Local environment variables
│   ├── .env.example            # Environment template
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Universal top navbar with active tab indicators
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── StatusBadge.jsx  # Color-coded workflow badges
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Enquiries.jsx    # Create/view enquiries & + Create Quote action
│   │   │   ├── Quotations.jsx   # Auto-filled quotes, customer approval & SO conversion
│   │   │   ├── SalesOrders.jsx  # Order details, inventory reserve & dispatch
│   │   │   ├── Inventory.jsx    # Real-time physical/reserved/available stock
│   │   │   ├── Dispatches.jsx   # Completed delivery logs & vehicle info
│   │   │   ├── Products.jsx     # Industrial product catalog master
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx              # Client-side routes & Layout
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── POSTMAN_GUIDE.md
└── README.md
```

---

## Prerequisites

- **Node.js** v18+ (tested on v22)
- **PostgreSQL** v14+
- **npm** v9+

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_case_study
JWT_SECRET=super_secret_jwt_erp_auth_token_2025_key_xyz
ADMIN_REGISTRATION_CODE=ADMIN_SECURE_REGISTRATION_KEY_2025
```

| Variable                    | Description                               |
| --------------------------- | ----------------------------------------- |
| `PORT`                    | Express server port (default 5000)        |
| `DATABASE_URL`            | Full PostgreSQL connection string         |
| `JWT_SECRET`              | Secret key used to sign/verify JWT tokens |
| `ADMIN_REGISTRATION_CODE` | Secret code required to register an ADMIN |

---

## Database Setup

### 1. Create the database

Open **pgAdmin** or `psql` and run:

```sql
CREATE DATABASE erp_case_study;
```

---

## Migration & Seed Instructions

### Run the seed script

From the **`backend`** directory run:

```bash
cd backend
npm run db:seed
```

This automatically drops old tables, creates the schema, and seeds:

| Data | Details |
| -------------------- | ------------------------------------- |
| **Admin user** | `admin@example.com` / `Admin@123` |
| **Sales user** | `sales@example.com` / `Sales@123` |
| **6 products** | P001–P006 (Industrial Motors, Pumps, Cables, etc.) |
| **Inventory** | Initial stock for each product |

---

## Running the Application

### Backend

```bash
cd backend
npm install
npm run dev       # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:3000 (or 3001)
```

Open `http://localhost:3000` in your browser.

---

## Test Login Credentials

| Role       | Email                 | Password      |
| ---------- | --------------------- | ------------- |
| Admin      | `admin@example.com` | `Admin@123` |
| Sales User | `sales@example.com` | `Sales@123` |

---

## Running Tests

```bash
cd backend
npm test
```

The test suite covers:
1. Quotation total is calculated correctly (backend math).
2. DRAFT / REJECTED quotation cannot create a Sales Order.
3. Same quotation cannot generate duplicate Sales Orders.
4. Cannot reserve more than available inventory.
5. Unauthorized user (SALES_USER) cannot perform restricted operations.
6. Bonus: Simultaneous inventory reservation conflict (`SELECT FOR UPDATE`).

---

## API Documentation

See **`POSTMAN_GUIDE.md`** for a step-by-step API guide with request/response examples.

### Quick Reference

```
POST   /api/auth/login
POST   /api/auth/signup
GET    /api/auth/me

GET    /api/products
POST   /api/products                        (ADMIN)
GET    /api/inventory
PATCH  /api/inventory/stock                 (ADMIN)
GET    /api/customers
POST   /api/customers

POST   /api/enquiries
GET    /api/enquiries
GET    /api/enquiries/:id

POST   /api/quotations
GET    /api/quotations
GET    /api/quotations/:id
PATCH  /api/quotations/:id/status
POST   /api/quotations/:id/convert

GET    /api/sales-orders
GET    /api/sales-orders/:id
POST   /api/sales-orders/:id/confirm        (ADMIN)
POST   /api/sales-orders/:id/dispatch       (ADMIN)

GET    /api/dispatches
GET    /api/dispatches/:id
```

---

## Business Workflow

```
[Sales User]  POST /enquiries          → Enquiry (NEW)
                                              |
[Sales User]  POST /quotations         → Quotation (DRAFT)
              PATCH .../status SENT    → Quotation (SENT)
              PATCH .../status ACCEPTED→ Quotation (ACCEPTED) + Enquiry (WON)
                                              |
[Sales User]  POST .../convert         → Sales Order (PENDING)
                                              |
[Admin]       POST .../confirm         → reserved_quantity += ordered qty
                                          Sales Order (CONFIRMED)
                                              |
[Admin]       POST .../dispatch        → physical_quantity -= dispatched qty
                                          reserved_quantity -= dispatched qty
                                          Sales Order (DISPATCHED)
```

---

## Database Schema

```
inventory
  └── products (1 : 1)
      physical_quantity  — actual warehouse stock
      reserved_quantity  — locked for confirmed orders
      available_quantity = physical - reserved (computed)
```

---

## Key Technical Decisions

1. **Concurrent Reservation Protection**: Row-level locking (`SELECT ... FOR UPDATE`) inside an explicit transaction block (`BEGIN ... COMMIT`).
2. **Backend-Calculated Totals**: All financial calculations (base price, discount %, GST %) are enforced on the backend.
3. **Role-Based Access Control**: Strict middleware checking JWT tokens and user roles (`ADMIN` vs `SALES_USER`).
