const express = require('express');
const router = express.Router();
const {
  getInventory,
  getProducts,
  createProduct,
  getCustomers,
  createCustomer,
  updateStock
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.get('/inventory', authMiddleware, getInventory);
router.patch('/inventory/stock', authMiddleware, requireRole('ADMIN'), updateStock);
router.get('/products', authMiddleware, getProducts);
router.post('/products', authMiddleware, requireRole('ADMIN'), createProduct);
router.get('/customers', authMiddleware, getCustomers);
router.post('/customers', authMiddleware, createCustomer);

module.exports = router;
