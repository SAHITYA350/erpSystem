require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { name: "System Administrator", email: "admin@example.com", password: "Admin@123", role: "ADMIN" },
  { name: "Sales Executive",      email: "sales@example.com", password: "Sales@123", role: "SALES_USER" },
];

const customers = [
  { company_name: "ABC Industries", contact_person: "Ramesh Sharma", mobile: "9876543210", email: "ramesh@abcind.com", city: "Mumbai" },
  { company_name: "XYZ Pvt Ltd", contact_person: "Priya Patel", mobile: "9823456789", email: "priya@xyzpvtltd.com", city: "Ahmedabad" },
  { company_name: "Apex Heavy Engineering", contact_person: "Vikram Verma", mobile: "9811223344", email: "vikram@apexeng.com", city: "Pune" },
];

const products = [
  { product_code: "P001", product_name: "Industrial Motor (3-Phase)",          category: "Electrical", unit: "Nos",   base_price: 18500.00, initial_stock: 150  },
  { product_code: "P002", product_name: "Centrifugal Water Pump",              category: "Pumps",      unit: "Nos",   base_price: 12000.00, initial_stock: 80   },
  { product_code: "P003", product_name: "Industrial Control Panel",            category: "Electrical", unit: "Nos",   base_price: 45000.00, initial_stock: 40   },
  { product_code: "P004", product_name: "Helical Gear Assembly",               category: "Mechanical", unit: "Set",   base_price:  8200.00, initial_stock: 200  },
  { product_code: "P005", product_name: "Deep Groove Ball Bearing",            category: "Mechanical", unit: "Nos",   base_price:   650.00, initial_stock: 500  },
  { product_code: "P006", product_name: "Armoured Power Cable (4-Core, 6mm)", category: "Cables",     unit: "Meter", base_price:   285.00, initial_stock: 2000 },
];

async function seedDb() {
  const client = await pool.connect();
  try {
    console.log("==================================================");
    console.log("  RESETTING & SEEDING POSTGRESQL DATABASE");
    console.log("==================================================");

    await client.query("BEGIN");

    console.log("\n[1] Dropping existing tables...");
    const dropQuery = `
      DROP TABLE IF EXISTS
        dispatch_items,
        dispatches,
        sales_order_items,
        sales_orders,
        quotation_items,
        quotations,
        enquiry_items,
        enquiries,
        inventory,
        products,
        customers,
        users
      CASCADE;
    `;
    await client.query(dropQuery);
    console.log("    All tables dropped successfully.");

    console.log("\n[2] Applying schema.sql...");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);
    console.log("    Schema created successfully (11 tables).");

    console.log("\n[3] Seeding users...");
    let salesUserId = null;
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const res = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [u.name, u.email, hash, u.role]
      );
      if (u.role === "SALES_USER") salesUserId = res.rows[0].id;
      console.log(`    OK ${u.role} -> ${u.email}`);
    }

    console.log("\n[4] Seeding initial customers...");
    for (const c of customers) {
      await client.query(
        "INSERT INTO customers (company_name, contact_person, mobile, email, city, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
        [c.company_name, c.contact_person, c.mobile, c.email, c.city, salesUserId]
      );
      console.log(`    OK Customer: ${c.company_name} (${c.contact_person})`);
    }

    console.log("\n[5] Seeding products & initial inventory...");
    for (const p of products) {
      const prodRes = await client.query(
        "INSERT INTO products (product_code, product_name, category, unit, base_price, reorder_level) VALUES ($1, $2, $3, $4, $5, 10) RETURNING id",
        [p.product_code, p.product_name, p.category, p.unit, p.base_price]
      );
      await client.query(
        "INSERT INTO inventory (product_id, physical_quantity, reserved_quantity) VALUES ($1, $2, 0)",
        [prodRes.rows[0].id, p.initial_stock]
      );
      console.log(`    OK Product: ${p.product_code} - ${p.product_name} [Stock: ${p.initial_stock} ${p.unit}]`);
    }

    await client.query("COMMIT");

    console.log("\n==================================================");
    console.log("  DATABASE SEEDING COMPLETED CLEANLY!");
    console.log("==================================================");
    console.log("  Admin Login : admin@example.com | Admin@123");
    console.log("  Sales Login : sales@example.com | Sales@123");
    console.log("==================================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Database seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDb();
