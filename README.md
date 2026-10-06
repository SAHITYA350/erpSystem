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
6. [Migration &amp; Seed Instructions](#migration--seed-instructions)
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
| Database | PostgreSQL (raw `pg` driver)                    |
| Auth     | JWT (jsonwebtoken) + bcryptjs                     |

---

## Project Structure

```
crp_case_study/
├── backend/
│   ├── config/
│   │   └── db.js               # PostgreSQL pool
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── enquiryController.js
│   │   ├── quotationController.js
│   │   ├── salesOrderController.js
│   │   ├── dispatchController.js
│   │   └── inventoryController.js
│   ├── db/
│   │   ├── schema.sql           # All table definitions
│   │   └── seed.js              # Initial users + products + inventory
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
│   │   └── generateNumber.js   # Auto-number generator (SO-001, QUO-001 …)
│   ├── .env                    # Environment variables (not committed)
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Enquiries.jsx
│   │   │   ├── Quotations.jsx
│   │   │   ├── SalesOrders.jsx
│   │   │   ├── Dispatches.jsx
│   │   │   ├── Inventory.jsx
│   │   │   └── Products.jsx
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
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
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database_name>
JWT_SECRET=your_jwt_secret_key
ADMIN_REGISTRATION_CODE=ADMIN@2025
```

| Variable                    | Description                               |
| --------------------------- | ----------------------------------------- |
| `PORT`                    | Express server port (default 5000)        |
| `DATABASE_URL`            | Full PostgreSQL connection string         |
| `JWT_SECRET`              | Secret key used to sign/verify JWT tokens |
| `ADMIN_REGISTRATION_CODE` | Required to register an ADMIN account     |

---

## Database Setup

### 1. Create the database

Open **pgAdmin** or `psql` and run:

```sql
CREATE DATABASE erp_case_study;
```

### 2. Apply the schema

In pgAdmin → Query Tool (connected to `erp_case_study`), open and run:

```
backend/db/schema.sql
```

This creates all 11 tables:
`users`, `customers`, `products`, `inventory`, `enquiries`, `enquiry_items`,
`quotations`, `quotation_items`, `sales_orders`, `sales_order_items`, `dispatches`, `dispatch_items`

---

## Migration & Seed Instructions

### Run the seed script

After the schema is applied, from the **project root** run:

```bash
cd backend
npm run seed
```

This inserts:

| Data | Details |
| -------------------- | ------------------------------------- |
| **Admin user** | `admin@example.com` / `Admin@123` |
| **Sales user** | `sales@example.com` / `Sales@123` |
| **6 products** | P001–P006 (see below) |
| **Inventory** | Initial stock for each product |

**Seeded products:**

| Code | Product Name                       | Category   | Unit  | Base Price | Initial Stock |
| ---- | ---------------------------------- | ---------- | ----- | ---------- | ------------- |
| P001 | Industrial Motor (3-Phase)         | Electrical | Nos   | ₹18,500   | 150           |
| P002 | Centrifugal Water Pump             | Pumps      | Nos   | ₹12,000   | 80            |
| P003 | Industrial Control Panel           | Electrical | Nos   | ₹45,000   | 40            |
| P004 | Helical Gear Assembly              | Mechanical | Set   | ₹8,200    | 200           |
| P005 | Deep Groove Ball Bearing           | Mechanical | Nos   | ₹650      | 500           |
| P006 | Armoured Power Cable (4-Core, 6mm) | Cables     | Meter | ₹285      | 2000          |

> The seed script is **idempotent** — running it twice will skip existing records.

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
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

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

| # | Test                                                   |
| - | ------------------------------------------------------ |
| 1 | Quotation total is calculated correctly (backend math) |
| 2 | DRAFT / REJECTED quotation cannot create a Sales Order |
| 3 | Same quotation cannot generate duplicate Sales Orders  |
| 4 | Cannot reserve more than available inventory           |
| 5 | Unauthorized user (SALES_USER) cannot confirm order    |
| B | Bonus: Simultaneous inventory reservation conflict     |

---

## API Documentation

See **`POSTMAN_GUIDE.md`** for a full step-by-step API guide with request/response examples.

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
POST   /api/sales-orders/:id/dispatch       (ADMIN — deprecated, use /dispatches)

GET    /api/dispatches
GET    /api/dispatches/:id
POST   /api/dispatches                      (ADMIN)
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
[Admin]       POST /dispatches         → physical_quantity -= dispatched qty
                                          reserved_quantity -= dispatched qty
                                          Sales Order (DISPATCHED)
```

---

## Database Schema

### Entity Relationship (summary)

```
users
  └── creates enquiries (created_by)

customers
  ├── enquiries      (1 : many)
  ├── quotations     (1 : many)
  └── sales_orders   (1 : many)

enquiries
  ├── enquiry_items  (1 : many)  → products
  └── quotations     (1 : many)

quotations
  ├── quotation_items (1 : many) → products
  └── sales_orders    (1 : 1)    → UNIQUE quotation_id prevents duplicate orders

sales_orders
  ├── sales_order_items (1 : many) → products
  └── dispatches        (1 : 1)

inventory
  └── products (1 : 1)
      physical_quantity  — actual warehouse stock
      reserved_quantity  — locked for confirmed orders
      available = physical - reserved  (computed, NOT stored)
```

### Key constraints

| Constraint                            | Purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `sales_orders.quotation_id UNIQUE`  | One quotation → max one sales order    |
| `inventory.product_id UNIQUE`       | One inventory row per product           |
| `CHECK (physical_quantity >= 0)`    | No negative stock                       |
| `CHECK (reserved_quantity >= 0)`    | No negative reservation                 |
| `SELECT ... FOR UPDATE` in confirm  | Row-level lock prevents race conditions |
| `TRANSACTION` on all multi-step ops | Full rollback on any failure            |

---

## Key Technical Decisions

### 1. Concurrent Reservation (Race Condition)

The confirm order flow uses `SELECT ... FOR UPDATE` inside a transaction.
This row-level lock ensures that if two admins confirm orders for the same product simultaneously, only one can succeed — the other will wait, then fail the availability check.

### 2. Backend-Calculated Totals

The quotation `total_amount` is **always computed on the backend** using:

```
base       = qty × unit_price
discounted = base − (base × discount% / 100)
line_amount = discounted + (discounted × gst% / 100)
```

The frontend never sends a total; it only receives the backend-computed value.

### 3. No ORM

Raw `pg` (node-postgres) is used for full SQL control, explicit transactions, and `FOR UPDATE` locking — which is difficult to express cleanly in most ORMs.

### 4. Idempotent Seed

`seed.js` checks for existing records before inserting, so it can be safely re-run without duplicating data.
