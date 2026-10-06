const pool = require('../config/db');
const { generateNumber } = require('../utils/generateNumber');

const getSalesOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.id, so.order_number, so.order_date, so.total_amount, so.status, so.created_at,
             c.id AS customer_id, c.company_name, c.contact_person,
             q.quotation_number,
             d.dispatch_number, d.dispatch_date
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      LEFT JOIN quotations q ON so.quotation_id = q.id
      LEFT JOIN dispatches d ON so.id = d.sales_order_id
      ORDER BY so.id DESC
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getSalesOrders error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales orders.' });
  }
};

const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderRes = await pool.query(
      `SELECT so.*, c.company_name, c.contact_person, c.mobile, c.email, c.city,
              q.quotation_number, d.dispatch_number, d.dispatch_date, d.vehicle_number, d.driver_name
       FROM sales_orders so
       JOIN customers c ON so.customer_id = c.id
       LEFT JOIN quotations q ON so.quotation_id = q.id
       LEFT JOIN dispatches d ON so.id = d.sales_order_id
       WHERE so.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT soi.*, p.product_code, p.product_name, p.unit,
              COALESCE(i.physical_quantity, 0) AS physical_quantity,
              COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
              (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0)) AS available_quantity
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE soi.sales_order_id = $1 ORDER BY soi.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...orderRes.rows[0], items: itemsRes.rows }
    });
  } catch (error) {
    console.error('getSalesOrderById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales order.' });
  }
};

const confirmSalesOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Order status is ${order.status}. Only PENDING orders can be confirmed.` });
    }

    const itemsRes = await client.query(
      `SELECT soi.product_id, soi.quantity, p.product_name, p.product_code
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1`,
      [id]
    );

    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        'SELECT id, physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `No inventory for product: ${item.product_name}` });
      }

      const inv = invRes.rows[0];
      const available = inv.physical_quantity - inv.reserved_quantity;

      if (item.quantity > available) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${item.product_name}. Requested: ${item.quantity}, Available: ${available}`
        });
      }

      await client.query(
        'UPDATE inventory SET reserved_quantity = reserved_quantity + $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    const updated = await client.query("UPDATE sales_orders SET status = 'CONFIRMED' WHERE id = $1 RETURNING *", [id]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Sales order confirmed and inventory reserved.',
      data: updated.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('confirmSalesOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to confirm sales order.' });
  } finally {
    client.release();
  }
};

const dispatchSalesOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { vehicle_number, driver_name } = req.body;

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Order must be CONFIRMED to dispatch. Current: ${order.status}` });
    }

    const itemsRes = await client.query(
      'SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = $1',
      [id]
    );

    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        'SELECT id, physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Inventory missing for product ID ${item.product_id}` });
      }

      const inv = invRes.rows[0];

      if (inv.reserved_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot dispatch more than reserved. Reserved: ${inv.reserved_quantity}, Dispatching: ${item.quantity}`
        });
      }

      await client.query(
        'UPDATE inventory SET physical_quantity = physical_quantity - $1, reserved_quantity = reserved_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    const dispatchNumber = await generateNumber('DIS', 'dispatches', client);

    const dispatchRes = await client.query(
      'INSERT INTO dispatches (dispatch_number, sales_order_id, vehicle_number, driver_name) VALUES ($1,$2,$3,$4) RETURNING *',
      [dispatchNumber, id, vehicle_number || null, driver_name || null]
    );

    const dispatch = dispatchRes.rows[0];

    for (const item of itemsRes.rows) {
      await client.query(
        'INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES ($1,$2,$3)',
        [dispatch.id, item.product_id, item.quantity]
      );
    }

    await client.query("UPDATE sales_orders SET status = 'DISPATCHED' WHERE id = $1", [id]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Order dispatched. Stock updated.',
      data: dispatch
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('dispatchSalesOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to dispatch order.' });
  } finally {
    client.release();
  }
};

const cancelSalesOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT status FROM sales_orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    // cancel order and release reserved stock

    const itemsRes = await client.query(
      'SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = $1',
      [id]
    );

    for (const item of itemsRes.rows) {
      await client.query(
        'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query("UPDATE sales_orders SET status = 'CANCELLED' WHERE id = $1", [id]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Sales order cancelled and reserved inventory released successfully.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('cancelSalesOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to cancel sales order.' });
  } finally {
    client.release();
  }
};

module.exports = { getSalesOrders, getSalesOrderById, confirmSalesOrder, dispatchSalesOrder, cancelSalesOrder };
