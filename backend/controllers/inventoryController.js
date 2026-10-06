const pool = require('../config/db');

const getInventory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id AS product_id, p.id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
             COALESCE(p.reorder_level, 10) AS reorder_level,
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
    const result = await pool.query(`
      SELECT p.id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
             COALESCE(p.reorder_level, 10) AS reorder_level,
             COALESCE(i.physical_quantity, 0) AS physical_quantity,
             COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
             (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0)) AS available_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY p.id
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getProducts error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
             COALESCE(p.reorder_level, 10) AS reorder_level,
             COALESCE(i.physical_quantity, 0) AS physical_quantity,
             COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
             (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0)) AS available_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getProductById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_code, product_name, category, unit, base_price, initial_stock, physical_quantity, reorder_level } = req.body;

    if (!product_code || !product_name || !category || !unit || base_price === undefined) {
      return res.status(400).json({ success: false, message: 'Product code, name, category, unit and base price are required.' });
    }

    const existing = await pool.query('SELECT id FROM products WHERE product_code = $1', [product_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Product code already exists.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const prodRes = await client.query(
        'INSERT INTO products (product_code, product_name, category, unit, base_price, reorder_level) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [product_code, product_name, category, unit, Number(base_price), Number(reorder_level) || 10]
      );

      const product = prodRes.rows[0];
      const stock = Number(initial_stock !== undefined ? initial_stock : physical_quantity) || 0;

      await client.query(
        'INSERT INTO inventory (product_id, physical_quantity, reserved_quantity) VALUES ($1,$2,0)',
        [product.id, stock]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          ...product,
          physical_quantity: stock,
          reserved_quantity: 0,
          available_quantity: stock
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('createProduct error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create product.' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, unit, base_price, reorder_level } = req.body;

    if (!product_name || !category || !unit || base_price === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, category, unit and base price are required.' });
    }

    const result = await pool.query(
      `UPDATE products 
       SET product_name = $1, category = $2, unit = $3, base_price = $4, reorder_level = COALESCE($5, reorder_level)
       WHERE id = $6
       RETURNING *`,
      [product_name, category, unit, Number(base_price), reorder_level ? Number(reorder_level) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const inv = await pool.query('SELECT physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1', [id]);
    const invRow = inv.rows[0] || { physical_quantity: 0, reserved_quantity: 0 };

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: {
        ...result.rows[0],
        physical_quantity: invRow.physical_quantity,
        reserved_quantity: invRow.reserved_quantity,
        available_quantity: invRow.physical_quantity - invRow.reserved_quantity
      }
    });
  } catch (error) {
    console.error('updateProduct error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

const updateProductStock = async (req, res) => {
  const client = await pool.connect();
  try {
    const productId = req.params.id || req.body.product_id;
    const { quantity, operation, physical_quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    await client.query('BEGIN');

    const invCheck = await client.query(
      'SELECT id, physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
      [productId]
    );

    let currentPhysical = 0;
    let currentReserved = 0;

    if (invCheck.rows.length === 0) {
      // create inventory row if missing
      await client.query(
        'INSERT INTO inventory (product_id, physical_quantity, reserved_quantity) VALUES ($1, 0, 0)',
        [productId]
      );
    } else {
      currentPhysical = invCheck.rows[0].physical_quantity;
      currentReserved = invCheck.rows[0].reserved_quantity;
    }

    let newPhysical;

    if (operation === 'ADD') {
      const addQty = Number(quantity);
      if (isNaN(addQty) || addQty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Valid positive quantity required for ADD operation.' });
      }
      newPhysical = currentPhysical + addQty;
    } else if (operation === 'REMOVE') {
      const remQty = Number(quantity);
      if (isNaN(remQty) || remQty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Valid positive quantity required for REMOVE operation.' });
      }
      newPhysical = currentPhysical - remQty;
      if (newPhysical < currentReserved) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot remove stock below reserved quantity (${currentReserved}). Current available: ${currentPhysical - currentReserved}`
        });
      }
    } else if (physical_quantity !== undefined) {
      newPhysical = Number(physical_quantity);
      if (isNaN(newPhysical) || newPhysical < currentReserved) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Physical stock cannot be less than reserved stock (${currentReserved}).`
        });
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Please provide quantity and operation (ADD/REMOVE) or physical_quantity.' });
    }

    const updated = await client.query(
      'UPDATE inventory SET physical_quantity = $1 WHERE product_id = $2 RETURNING *',
      [newPhysical, productId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Stock updated successfully.',
      data: {
        ...updated.rows[0],
        available_quantity: newPhysical - currentReserved
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateProductStock error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update stock.' });
  } finally {
    client.release();
  }
};

const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name AS created_by_name
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.id
    `);
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

    const userId = req.user?.id || null;

    const result = await pool.query(
      'INSERT INTO customers (company_name, contact_person, mobile, email, city, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [company_name, contact_person, mobile, email || null, city || null, userId]
    );

    return res.status(201).json({ success: true, message: 'Customer created', data: result.rows[0] });
  } catch (error) {
    console.error('createCustomer error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
};

module.exports = {
  getInventory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  getCustomers,
  createCustomer
};
