const express = require('express');
const router = express.Router();
const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
  convertToSalesOrder
} = require('../controllers/quotationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createQuotation);
router.get('/', authMiddleware, getQuotations);
router.get('/:id', authMiddleware, getQuotationById);
router.patch('/:id/status', authMiddleware, updateQuotationStatus);
router.post('/:id/convert', authMiddleware, convertToSalesOrder);

module.exports = router;
