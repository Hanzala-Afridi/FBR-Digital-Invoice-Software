const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
const { upload, handleMulterError } = require('../middleware/uploadExcel');



// Upload invoices in bulk with proper error handling
router.post(
  '/upload-excel', 
  upload.single('file'),
  handleMulterError, // Add multer error handling
  invoiceController.uploadInvoicesExcel
);



// POST /invoices
// router.post("/", invoiceController.createInvoice);
router.get("/export", invoiceController.exportInvoicesCSV);
router.get("/", invoiceController.listInvoices);// local db list
router.get("/:uuid", invoiceController.getInvoiceByUUID);// local db
router.post("/save", invoiceController.saveInvoice);// save in loaca database
router.post("/post-unposted", invoiceController.postUnpostedInvoices); // send unposted data
router.post("/post-range", invoiceController.postInvoicesByScenarioRange); //select range to pst data to fbr
router.post("/post/:uuid", invoiceController.postInvoiceToFBR);// poste single invoice to fbr
router.get("/fbr/:irn", invoiceController.getInvoiceFromFBR);// fbr invoice get from fbr
router.delete("/delete/:uuid", invoiceController.deleteInvoice);// local db







module.exports = router;