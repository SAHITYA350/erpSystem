# Simple PERN ERP System

A simplified Full-Stack ERP (Enterprise Resource Planning) case study built strictly with the PERN stack (PostgreSQL, Express.js, React.js, Node.js).

## Tech Stack

- **Frontend:** React.js, Vite, React Router, Axios, Plain CSS (JavaScript / JSX only)
- **Backend:** Node.js, Express.js, CommonJS (JavaScript only)
- **Database:** PostgreSQL with `pg` (node-postgres), Raw SQL queries and transactions
- **Authentication:** JWT (jsonwebtoken) + bcryptjs password hashing
- **Testing:** Postman for API testing

## Business Workflow

The system models a clean, linear sales and inventory order lifecycle:

```
Customer
   ↓
Enquiry
   ↓
Quotation
   ↓
Accepted Quotation
   ↓
Sales Order
   ↓
Inventory Reservation
   ↓
Dispatch
```

## User Roles & Permissions

1. **ADMIN**
   - Full visibility across all modules
   - Manage products and inventory stock
   - Confirm Sales Orders with transactional inventory reservation (`SELECT ... FOR UPDATE`)
   - Process dispatches (updating physical and reserved inventory)

2. **SALES_USER**
   - Create customers, enquiries, and quotations
   - Update quotation lifecycle (Draft → Sent → Accepted / Rejected)
   - Convert Accepted quotations into Sales Orders
   - Check real-time inventory availability (`physical_quantity - reserved_quantity`)

## Project Structure

```
crpsys/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── routes/
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── utils/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
├── README.md
├── POSTMAN.md
└── ER_DIAGRAM.md
```

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, PORT, and JWT_SECRET in .env
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
