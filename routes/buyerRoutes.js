const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');

router.post('/', buyerController.createBuyer);
router.get('/', buyerController.getAllBuyers);
router.get('/:uuid', buyerController.getBuyerByUUID);
router.put('/:uuid', buyerController.updateBuyer);
router.delete('/:uuid', buyerController.deleteBuyer);

module.exports = router;
