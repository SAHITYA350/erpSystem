const pool = require('../config/db');
const { generateNumber } = require('../utils/generateNumber');

function computeLineAmount(quantity, unitPrice, discountPercent, gstPercent) {
  const base = quantity * unitPrice;
  const discounted = base - (base * discountPercent / 100);
  const withGst = discounted + (discounted * gstPercent / 100);
  return Number(withGst.toFixed(2));
}

const createQuotation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { enquiry_id, customer_id, valid_until, items } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }

    const custCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (custCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    let grandTotal = 0;
    const computedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Valid product_id and quantity > 0 are required.' });
      }

      let unitPrice = item.unit_price;
      if (unitPrice === undefined || unitPrice === null) {
        const prodRes = await client.query('SELECT base_price FROM products WHERE id = $1', [item.product_id]);
        if (prodRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: `Product ${item.product_id} not found.` });
        }
        unitPrice = Number(prodRes.rows[0].base_price);
      }

      const discount = Number(item.discount_percent || 0);
      const gst = item.gst_percent !== undefined ? Number(item.gst_percent) : 18;

      if (discount < 0 || discount > 100) {
        return res.status(400).json({ success: false, message: 'Discount must be between 0 and 100.' });
      }

      const lineAmount = computeLineAmount(Number(item.quantity), Number(unitPrice), discount, gst);
      grandTotal += lineAmount;

      computedItems.push({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(unitPrice),
        discount_percent: discount,
        gst_percent: gst,
        line_amount: lineAmount
      });
    }

    grandTotal = Number(grandTotal.toFixed(2));

    await client.query('BEGIN');

    const quotationNumber = await generateNumber('QUO', 'quotations', client);

    const quoteRes = await client.query(
      `INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, total_amount)
       VALUES ($1,$2,$3,$4,'DRAFT',$5) RETURNING *`,
      [quotationNumber, enquiry_id || null, customer_id, valid_until || null, grandTotal]
    );

    const quotation = quoteRes.rows[0];
    const insertedItems = [];

    for (const ci of computedItems) {
      const qItemRes = await client.query(
        `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, gst_percent, line_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [quotation.id, ci.product_id, ci.quantity, ci.unit_price, ci.discount_percent, ci.gst_percent, ci.line_amount]
      );
      insertedItems.push(qItemRes.rows[0]);
    }

    if (enquiry_id) {
      await client.query("UPDATE enquiries SET status = 'QUOTED' WHERE id = $1 AND status = 'NEW'", [enquiry_id]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Quotation created as DRAFT',
      data: { ...quotation, items: insertedItems }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createQuotation error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create quotation.' });
  } finally {
    client.release();
  }
};

const getQuotations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.id, q.quotation_number, q.valid_until, q.status, q.total_amount, q.created_at,
             c.id AS customer_id, c.company_name, c.contact_person,
             e.id AS enquiry_id, e.enquiry_number,
             so.id AS sales_order_id, so.order_number
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN enquiries e ON q.enquiry_id = e.id
      LEFT JOIN sales_orders so ON q.id = so.quotation_id
      ORDER BY q.id DESC
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getQuotations error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch quotations.' });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    const quoteRes = await pool.query(
      `SELECT q.*, c.company_name, c.contact_person, c.mobile, c.email, c.city,
              e.enquiry_number, so.order_number
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       LEFT JOIN enquiries e ON q.enquiry_id = e.id
       LEFT JOIN sales_orders so ON q.id = so.quotation_id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT qi.*, p.product_code, p.product_name, p.unit
       FROM quotation_items qi
       JOIN products p ON qi.product_id = p.id
       WHERE qi.quotation_id = $1 ORDER BY qi.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...quoteRes.rows[0], items: itemsRes.rows }
    });
  } catch (error) {
    console.error('getQuotationById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch quotation.' });
  }
};

const updateQuotationStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const current = await client.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const currentStatus = current.rows[0].status;

    // allow status transition update

    if (currentStatus === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot change status of a REJECTED quotation.' });
    }

    await client.query('BEGIN');

    const updated = await client.query('UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

    const enquiryId = current.rows[0].enquiry_id;
    if (enquiryId) {
      if (status === 'ACCEPTED') {
        await client.query("UPDATE enquiries SET status = 'WON' WHERE id = $1", [enquiryId]);
      } else if (status === 'REJECTED') {
        await client.query("UPDATE enquiries SET status = 'LOST' WHERE id = $1", [enquiryId]);
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({ success: true, message: `Status updated to ${status}`, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateQuotationStatus error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  } finally {
    client.release();
  }
};

const convertToSalesOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const quoteRes = await client.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const quotation = quoteRes.rows[0];

    if (quotation.status !== 'ACCEPTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only ACCEPTED quotations can be converted. Current status: ${quotation.status}`
      });
    }

    const orderCheck = await client.query('SELECT id, order_number FROM sales_orders WHERE quotation_id = $1', [id]);
    if (orderCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Sales order ${orderCheck.rows[0].order_number} already exists for this quotation.`
      });
    }

    const orderNumber = await generateNumber('SO', 'sales_orders', client);

    const orderRes = await client.query(
      `INSERT INTO sales_orders (order_number, quotation_id, customer_id, total_amount, status)
       VALUES ($1,$2,$3,$4,'PENDING') RETURNING *`,
      [orderNumber, quotation.id, quotation.customer_id, quotation.total_amount]
    );

    const salesOrder = orderRes.rows[0];

    const quoteItems = await client.query(
      'SELECT product_id, quantity, unit_price FROM quotation_items WHERE quotation_id = $1',
      [id]
    );

    const orderItems = [];
    for (const qi of quoteItems.rows) {
      const soItem = await client.query(
        'INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4) RETURNING *',
        [salesOrder.id, qi.product_id, qi.quantity, qi.unit_price]
      );
      orderItems.push(soItem.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Quotation converted to Sales Order',
      data: { ...salesOrder, items: orderItems }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('convertToSalesOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to convert quotation to sales order.' });
  } finally {
    client.release();
  }
};

module.exports = { createQuotation, getQuotations, getQuotationById, updateQuotationStatus, convertToSalesOrder };
