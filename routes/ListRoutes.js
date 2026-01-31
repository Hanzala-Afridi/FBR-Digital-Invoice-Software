const express = require('express');
const router = express.Router();
const SroController = require('../controllers/SroController');

// ✅ Define route
router.get('/sro', SroController.getAllSros);
router.get('/sro/:uuid', SroController.getSroByUuid);
router.get('/category/', SroController.getAllCategories);
router.get('/category/:uuid', SroController.getCategoryByUuid);
router.get('/sector', SroController.getAllSubcategories);
router.get('/sector/:uuid', SroController.getSubcategoryByUuid);

module.exports = router;
