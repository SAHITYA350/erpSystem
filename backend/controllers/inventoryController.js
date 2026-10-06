const pool = require('../config/db');

const getInventory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id AS product_id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
             COALESCE(i.physical_quantity, 0) AS physical_quantity,
             COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
             (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0)) AS available_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY p.id
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getInventory error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory.' });
  }
};

const getProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getProducts error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_code, product_name, category, unit, base_price, initial_stock } = req.body;

    if (!product_code || !product_name || !category || !unit || !base_price) {
      return res.status(400).json({ success: false, message: 'All product fields are required.' });
    }

    const existing = await pool.query('SELECT id FROM products WHERE product_code = $1', [product_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Product code already exists.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const prodRes = await client.query(
        'INSERT INTO products (product_code, product_name, category, unit, base_price) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [product_code, product_name, category, unit, Number(base_price)]
      );

      const product = prodRes.rows[0];
      const stock = Number(initial_stock) || 0;

      await client.query(
        'INSERT INTO inventory (product_id, physical_quantity, reserved_quantity) VALUES ($1,$2,0)',
        [product.id, stock]
      );

      await client.query('COMMIT');
      return res.status(201).json({ success: true, message: 'Product created', data: product });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('createProduct error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

const getCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id');
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getCustomers error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { company_name, contact_person, mobile, email, city } = req.body;

    if (!company_name || !contact_person || !mobile) {
      return res.status(400).json({ success: false, message: 'Company name, contact person and mobile are required.' });
    }

    const result = await pool.query(
      'INSERT INTO customers (company_name, contact_person, mobile, email, city) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [company_name, contact_person, mobile, email || null, city || null]
    );

    return res.status(201).json({ success: true, message: 'Customer created', data: result.rows[0] });
  } catch (error) {
    console.error('createCustomer error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
};

const updateStock = async (req, res) => {
  try {
    const { product_id, physical_quantity } = req.body;

    if (!product_id || physical_quantity === undefined || Number(physical_quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Valid product_id and non-negative physical_quantity are required.' });
    }

    const invCheck = await pool.query('SELECT reserved_quantity FROM inventory WHERE product_id = $1', [product_id]);
    if (invCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    }

    const reserved = invCheck.rows[0].reserved_quantity;
    if (Number(physical_quantity) < reserved) {
      return res.status(400).json({
        success: false,
        message: `Physical stock cannot be less than reserved stock (${reserved}).`
      });
    }

    const updated = await pool.query(
      'UPDATE inventory SET physical_quantity = $1 WHERE product_id = $2 RETURNING *',
      [Number(physical_quantity), product_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Stock updated successfully.',
      data: updated.rows[0]
    });
  } catch (error) {
    console.error('updateStock error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update stock.' });
  }
};

module.exports = { getInventory, getProducts, createProduct, getCustomers, createCustomer, updateStock };
