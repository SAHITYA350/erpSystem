require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { name: "System Administrator", email: "admin@example.com", password: "Admin@123", role: "ADMIN" },
  { name: "Sales Executive",      email: "sales@example.com", password: "Sales@123", role: "SALES_USER" },
];

const products = [
  { product_code: "P001", product_name: "Industrial Motor (3-Phase)",         category: "Electrical", unit: "Nos",   base_price: 18500.00, initial_stock: 150  },
  { product_code: "P002", product_name: "Centrifugal Water Pump",             category: "Pumps",      unit: "Nos",   base_price: 12000.00, initial_stock: 80   },
  { product_code: "P003", product_name: "Industrial Control Panel",           category: "Electrical", unit: "Nos",   base_price: 45000.00, initial_stock: 40   },
  { product_code: "P004", product_name: "Helical Gear Assembly",              category: "Mechanical", unit: "Set",   base_price:  8200.00, initial_stock: 200  },
  { product_code: "P005", product_name: "Deep Groove Ball Bearing",           category: "Mechanical", unit: "Nos",   base_price:   650.00, initial_stock: 500  },
  { product_code: "P006", product_name: "Armoured Power Cable (4-Core, 6mm)",category: "Cables",     unit: "Meter", base_price:   285.00, initial_stock: 2000 },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("\n[1] Seeding users...");
    for (const u of users) {
      const exists = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
      if (exists.rows.length > 0) {
        console.log("    SKIP  " + u.email + " (already exists)");
        continue;
      }
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        [u.name, u.email, hash, u.role]
      );
      console.log("    OK    " + u.role + " -> " + u.email);
    }

    console.log("\n[2] Seeding products & inventory...");
    for (const p of products) {
      const exists = await client.query("SELECT id FROM products WHERE product_code = $1", [p.product_code]);
      if (exists.rows.length > 0) {
        console.log("    SKIP  " + p.product_code + " (already exists)");
        continue;
      }
      const prodRes = await client.query(
        "INSERT INTO products (product_code, product_name, category, unit, base_price) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [p.product_code, p.product_name, p.category, p.unit, p.base_price]
      );
      await client.query(
        "INSERT INTO inventory (product_id, physical_quantity, reserved_quantity) VALUES ($1, $2, 0)",
        [prodRes.rows[0].id, p.initial_stock]
      );
      console.log("    OK    " + p.product_code + "  " + p.product_name + "  [stock: " + p.initial_stock + " " + p.unit + "]");
    }

    await client.query("COMMIT");
    console.log("\n==============================================");
    console.log("  Seed completed successfully!");
    console.log("==============================================");
    console.log("  Admin : admin@example.com  |  Admin@123");
    console.log("  Sales : sales@example.com  |  Sales@123");
    console.log("==============================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
