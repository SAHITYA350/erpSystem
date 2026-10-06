const pool = require('../config/db');
const { generateNumber } = require('../utils/generateNumber');

const getDispatches = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.dispatch_number, d.dispatch_date, d.vehicle_number, d.driver_name, d.created_at,
             so.id AS sales_order_id, so.order_number, so.total_amount,
             c.company_name, c.contact_person
      FROM dispatches d
      JOIN sales_orders so ON d.sales_order_id = so.id
      JOIN customers c ON so.customer_id = c.id
      ORDER BY d.id DESC
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getDispatches error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch dispatches.' });
  }
};

const getDispatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatchRes = await pool.query(
      `SELECT d.*, so.order_number, so.order_date, so.total_amount,
              c.company_name, c.contact_person, c.mobile, c.email, c.city
       FROM dispatches d
       JOIN sales_orders so ON d.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       WHERE d.id = $1`,
      [id]
    );

    if (dispatchRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT di.*, p.product_code, p.product_name, p.unit
       FROM dispatch_items di
       JOIN products p ON di.product_id = p.id
       WHERE di.dispatch_id = $1 ORDER BY di.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...dispatchRes.rows[0], items: itemsRes.rows }
    });
  } catch (error) {
    console.error('getDispatchById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch dispatch details.' });
  }
};

const createDispatch = async (req, res) => {
  const client = await pool.connect();
  try {
    const { sales_order_id, vehicle_number, driver_name } = req.body;

    if (!sales_order_id) {
      return res.status(400).json({ success: false, message: 'sales_order_id is required.' });
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [sales_order_id]);

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Order must be CONFIRMED before dispatch. Current status: ${order.status}`
      });
    }

    const itemsRes = await client.query(
      'SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = $1',
      [sales_order_id]
    );

    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        'SELECT id, physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `No inventory found for product ID ${item.product_id}` });
      }

      const inv = invRes.rows[0];

      if (inv.reserved_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot dispatch more than reserved quantity. Reserved: ${inv.reserved_quantity}, Requested: ${item.quantity}`
        });
      }

      await client.query(
        'UPDATE inventory SET physical_quantity = physical_quantity - $1, reserved_quantity = reserved_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    const dispatchNumber = await generateNumber('DIS', 'dispatches', client);

    const dispatchRes = await client.query(
      'INSERT INTO dispatches (dispatch_number, sales_order_id, vehicle_number, driver_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [dispatchNumber, sales_order_id, vehicle_number || null, driver_name || null]
    );

    const dispatch = dispatchRes.rows[0];

    for (const item of itemsRes.rows) {
      await client.query(
        'INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES ($1, $2, $3)',
        [dispatch.id, item.product_id, item.quantity]
      );
    }

    await client.query("UPDATE sales_orders SET status = 'DISPATCHED' WHERE id = $1", [sales_order_id]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Dispatch created successfully. Stock deducted from inventory.',
      data: dispatch
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createDispatch error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create dispatch.' });
  } finally {
    client.release();
  }
};

module.exports = { getDispatches, getDispatchById, createDispatch };
