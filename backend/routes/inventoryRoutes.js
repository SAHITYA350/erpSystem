const express = require('express');
const router = express.Router();
const {
  getInventory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  getCustomers,
  createCustomer
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Inventory endpoints
router.get('/inventory', authMiddleware, getInventory);
router.patch('/inventory/stock', authMiddleware, requireRole('ADMIN'), updateProductStock);

// Product endpoints
router.get('/products', authMiddleware, getProducts);
router.get('/products/:id', authMiddleware, getProductById);
router.post('/products', authMiddleware, requireRole('ADMIN'), createProduct);
router.put('/products/:id', authMiddleware, requireRole('ADMIN'), updateProduct);
router.patch('/products/:id', authMiddleware, requireRole('ADMIN'), updateProduct);
router.patch('/products/:id/stock', authMiddleware, requireRole('ADMIN'), updateProductStock);

// Customer endpoints
router.get('/customers', authMiddleware, getCustomers);
router.post('/customers', authMiddleware, createCustomer);

module.exports = router;
