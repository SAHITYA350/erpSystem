const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getEnquiries,
  getEnquiryById
} = require('../controllers/enquiryController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createEnquiry);
router.get('/', authMiddleware, getEnquiries);
router.get('/:id', authMiddleware, getEnquiryById);

module.exports = router;
