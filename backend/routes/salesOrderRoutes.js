const express = require('express');
const router = express.Router();
const {
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  dispatchSalesOrder,
  cancelSalesOrder
} = require('../controllers/salesOrderController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// View sales orders (available to authenticated users)
router.get('/', authMiddleware, getSalesOrders);
router.get('/:id', authMiddleware, getSalesOrderById);

// Order confirmation & inventory reservation (ADMIN only)
router.post('/:id/confirm', authMiddleware, requireRole('ADMIN'), confirmSalesOrder);

// Order cancellation & reserved inventory release (ADMIN only)
router.post('/:id/cancel', authMiddleware, requireRole('ADMIN'), cancelSalesOrder);

// Order dispatch & stock deduction (ADMIN only)
router.post('/:id/dispatch', authMiddleware, requireRole('ADMIN'), dispatchSalesOrder);

module.exports = router;
