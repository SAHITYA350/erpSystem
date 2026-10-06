const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getDispatches,
  getDispatchById,
  createDispatch
} = require('../controllers/dispatchController');

router.use(authMiddleware);

router.get('/', getDispatches);
router.get('/:id', getDispatchById);
router.post('/', requireRole('ADMIN'), createDispatch);

module.exports = router;
