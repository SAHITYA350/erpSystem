const pool = require('../config/db');
const { generateNumber } = require('../utils/generateNumber');

const createEnquiry = async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_id, company_name, contact_person, mobile, email, city, required_date, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product item is required.' });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Each item needs a valid product_id and quantity > 0.' });
      }
    }

    await client.query('BEGIN');

    let resolvedCustomerId = customer_id;

    if (!resolvedCustomerId) {
      if (!company_name || !contact_person || !mobile) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Provide customer_id or full customer details.' });
      }
      const custRes = await client.query(
        'INSERT INTO customers (company_name, contact_person, mobile, email, city) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [company_name, contact_person, mobile, email || null, city || null]
      );
      resolvedCustomerId = custRes.rows[0].id;
    } else {
      const check = await client.query('SELECT id FROM customers WHERE id = $1', [resolvedCustomerId]);
      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
    }

    const enquiryNumber = await generateNumber('ENQ', 'enquiries', client);

    const enquiryRes = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, required_date, notes, status, created_by)
       VALUES ($1,$2,$3,$4,'NEW',$5) RETURNING *`,
      [enquiryNumber, resolvedCustomerId, required_date || null, notes || null, req.user.id]
    );

    const enquiry = enquiryRes.rows[0];
    const insertedItems = [];

    for (const item of items) {
      const itemRes = await client.query(
        'INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING *',
        [enquiry.id, item.product_id, Number(item.quantity)]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      data: { ...enquiry, items: insertedItems }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createEnquiry error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create enquiry.' });
  } finally {
    client.release();
  }
};

const getEnquiries = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.enquiry_number, e.enquiry_date, e.required_date, e.notes, e.status, e.created_at,
             c.id AS customer_id, c.company_name, c.contact_person, c.mobile,
             u.name AS created_by_name,
             COUNT(ei.id) AS item_count
      FROM enquiries e
      JOIN customers c ON e.customer_id = c.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN enquiry_items ei ON e.id = ei.enquiry_id
      GROUP BY e.id, c.id, u.name
      ORDER BY e.id DESC
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getEnquiries error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch enquiries.' });
  }
};

const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiryRes = await pool.query(
      `SELECT e.*, c.company_name, c.contact_person, c.mobile, c.email, c.city, u.name AS created_by_name
       FROM enquiries e
       JOIN customers c ON e.customer_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (enquiryRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT ei.id, ei.product_id, ei.quantity, p.product_code, p.product_name, p.unit, p.base_price
       FROM enquiry_items ei
       JOIN products p ON ei.product_id = p.id
       WHERE ei.enquiry_id = $1 ORDER BY ei.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...enquiryRes.rows[0], items: itemsRes.rows }
    });
  } catch (error) {
    console.error('getEnquiryById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch enquiry.' });
  }
};

module.exports = { createEnquiry, getEnquiries, getEnquiryById };
