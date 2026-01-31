const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.post('/', companyController.createCompany);
router.get('/', companyController.getAllCompanies);
router.get('/ntn/', companyController.getCompanyByNTN);
router.get('/:uuid', companyController.getCompanyByUUID);
router.put('/:uuid', companyController.updateCompany);
router.delete('/:uuid', companyController.deleteCompany);


module.exports = router;
