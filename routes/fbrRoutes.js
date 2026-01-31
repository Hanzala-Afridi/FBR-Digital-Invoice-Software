const express = require("express");
const router = express.Router();
const fbrController = require("../controllers/fbrInvoiceController");

// POST: Submit invoice data to FBR
router.post("/post-invoice", fbrController.postInvoiceData);

// POST: Validate invoice data
router.post("/validate-invoice", fbrController.validateInvoiceData);


//provinces
router.get("/provinces", fbrController.getProvinces);

module.exports = router;
