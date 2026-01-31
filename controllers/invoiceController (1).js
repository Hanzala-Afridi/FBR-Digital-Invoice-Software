// const { v4: uuidv4 } = require('uuid');
// const db = require('../config/db');
// const connection = require('../config/db'); // adjust path as needed
// const validator = require('validator');
// const xlsx = require('xlsx');
// const path = require('path');
// const fastcsv = require('fast-csv');
// const fs = require('fs')
// const axios = require("axios");



// // ✅ GET /api/invoices/:uuid
// exports.getInvoiceByUUID = async (req, res) => {
//   try {
//     const { uuid } = req.params;

//     // 1️⃣ Fetch invoice by UUID
//     const [invoiceResult] = await db.promise().query(
//       `
//       SELECT 
//         id,
//         uuid,
//         fbr_irn,
//         invoice_type AS invoiceType,
//         invoice_date AS invoiceDate,
//         seller_ntn_cnic AS sellerNTNCNIC,
//         seller_business_name AS sellerBusinessName,
//         seller_province AS sellerProvince,
//         seller_address AS sellerAddress,
//         buyer_ntn_cnic AS buyerNTNCNIC,
//         buyer_business_name AS buyerBusinessName,
//         buyer_province AS buyerProvince,
//         buyer_address AS buyerAddress,
//         buyer_registration_type AS buyerRegistrationType,
//         invoice_ref_no AS invoiceRefNo,
//         scenario_id AS scenarioId,
//         businessAct AS businessActivity,
//         sector AS sectorType,
//         sub_total AS subTotal,
//         total_tax AS totalTax,
//         total_discount AS totalDiscount,
//         grand_total AS grandTotal,
//         status,
//         created_at AS createdAt,
//         fbr_response
//       FROM invoices
//       WHERE uuid = ?
//       LIMIT 1
//       `,
//       [uuid]
//     );

//     // 2️⃣ Check if found
//     if (invoiceResult.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Invoice not found",
//       });
//     }

//     const invoice = invoiceResult[0];

//     // 3️⃣ Fetch related items
//     const [items] = await db.promise().query(
//       `
//       SELECT 
//         uuid,
//         hs_code AS hsCode,
//         product_description AS productDescription,
//         rate_desc AS rate,
//         rate_percent AS ratePercent,
//         uom AS uoM,
//         quantity,
//         value_sales_excl_st AS valueSalesExcludingST,
//         discount,
//         total_values AS totalValues,
//         sales_tax_applicable AS salesTaxApplicable,
//         further_tax AS furtherTax,
//         extra_tax AS extraTax,
//         fed_payable AS fedPayable,
//         sale_type AS saleType,
//         sro_schedule_no AS sroScheduleNo,
//         sro_item_serial_no AS sroItemSerialNo
//       FROM invoice_items
//       WHERE invoice_id = ?
//       ORDER BY id ASC
//       `,
//       [invoice.id]
//     );

//     // 4️⃣ Attach items
//     invoice.items = items;
//     invoice.itemsCount = items.length;

//     // 5️⃣ Send final response (no recalculation)
//     res.json({
//       success: true,
//       data: {
//         invoice,
//         totals: {
//           subTotal: invoice.subTotal,
//           totalTax: invoice.totalTax,
//           totalDiscount: invoice.totalDiscount,
//           grandTotal: invoice.grandTotal,
//         },
//       },
//     });

//   } catch (error) {
//     console.error("❌ Error fetching invoice by UUID:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };


// exports.listInvoices = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const offset = (page - 1) * limit;
//     const statusFilter = req.query.status; // optional filter: 'posted' or 'unposted'

//     // Build WHERE clause
//     let where = '';
//     const params = [];
//     if (statusFilter && ['posted', 'unposted'].includes(statusFilter)) {
//       where = 'WHERE status = ?';
//       params.push(statusFilter);
//     }

//     // Fetch total counts and revenue
//     const [totals] = await db.promise().query(
//       `SELECT 
//           COUNT(*) AS totalInvoices,
//           SUM(grand_total) AS totalRevenue,
//           SUM(CASE WHEN status='posted' THEN 1 ELSE 0 END) AS totalPostedCount,
//           SUM(CASE WHEN status='unposted' THEN 1 ELSE 0 END) AS totalUnpostedCount,
//           SUM(CASE WHEN status='posted' THEN total_value ELSE 0 END) AS totalPostedValue,
//           SUM(CASE WHEN status='unposted' THEN total_value ELSE 0 END) AS totalUnpostedValue
//        FROM invoices`
//     );

//     // ✅ Fetch paginated invoices including `scenarioId`
//     const [invoices] = await db.promise().query(
//       `SELECT 
//           id, 
//           uuid, 
//           scenario_id,  -- ✅ Added this field
//           invoice_type, 
//           invoice_date, 
//           buyer_business_name, 
//           grand_total,
//           businessAct AS businessActivity,
//         sector AS sectorType, 
//           status
//        FROM invoices
//        ${where}
//        ORDER BY invoice_date DESC
//        LIMIT ? OFFSET ?`,
//       [...params, limit, offset]
//     );

//     res.json({
//       page,
//       limit,
//       totalInvoices: totals[0].totalInvoices,
//       totalRevenue: totals[0].totalRevenue,
//       totalPostedCount: totals[0].totalPostedCount,
//       totalUnpostedCount: totals[0].totalUnpostedCount,
//       totalPostedValue: totals[0].totalPostedValue,
//       totalUnpostedValue: totals[0].totalUnpostedValue,
//       invoices
//     });
//   } catch (err) {
//     console.error("❌ List Invoices Error:", err);
//     res.status(500).json({ status: 'error', error: err.message });
//   }
// };




// exports.saveInvoice = async (req, res) => {
//   const data = req.body;
//   const errors = [];
//   const itemErrors = [];

//   // --------------------------------------------
//   // 1️⃣ HEADER VALIDATION (FBR Spec)
//   // --------------------------------------------
//   if (!data.invoiceType || !["Sale Invoice", "Debit Note"].includes(data.invoiceType)) {
//     errors.push({ field: "invoiceType", code: "0001", message: "Invalid or missing invoiceType" });
//   }

//   if (!data.invoiceDate) {
//     errors.push({ field: "invoiceDate", code: "0002", message: "Missing invoiceDate" });
//   }

//   if (!data.sellerNTNCNIC) {
//     errors.push({ field: "sellerNTNCNIC", code: "0003", message: "Missing sellerNTNCNIC" });
//   }

//   if (!data.sellerBusinessName) {
//     errors.push({ field: "sellerBusinessName", code: "0004", message: "Missing sellerBusinessName" });
//   }

//   if (!data.sellerProvince) {
//     errors.push({ field: "sellerProvince", code: "0005", message: "Missing sellerProvince" });
//   }

//   if (!data.sellerAddress) {
//     errors.push({ field: "sellerAddress", code: "0006", message: "Missing sellerAddress" });
//   }

//   if (!data.buyerBusinessName) {
//     errors.push({ field: "buyerBusinessName", code: "0007", message: "Missing buyerBusinessName" });
//   }

//   if (!data.buyerProvince) {
//     errors.push({ field: "buyerProvince", code: "0008", message: "Missing buyerProvince" });
//   }

//   if (!data.buyerAddress) {
//     errors.push({ field: "buyerAddress", code: "0009", message: "Missing buyerAddress" });
//   }

//   if (!data.buyerRegistrationType || !["Registered", "Unregistered"].includes(data.buyerRegistrationType)) {
//     errors.push({ field: "buyerRegistrationType", code: "0010", message: "Missing or invalid buyerRegistrationType" });
//   }

//   // --------------------------------------------
//   // 2️⃣ ITEM VALIDATION (Each item must include rate, uom, etc.)
//   //     NOTE: keep your errors — but allow `unitPrice` OR `valueSalesExcludingST`
//   // --------------------------------------------
//   if (!Array.isArray(data.items) || data.items.length === 0) {
//     errors.push({ field: "items", code: "0004", message: "At least one invoice item is required" });
//   } else {
//     data.items.forEach((item, index) => {
//       const serial = index + 1;

//       if (!item.hsCode)
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0045",
//           error: "Provide HS Code.",
//         });

//       if (!item.rate)
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0046",
//           error: "Provide rate.",
//         });

//       if (!item.uoM)
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0047",
//           error: "Provide unit of measurement.",
//         });

//       if (!item.quantity)
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0048",
//           error: "Provide quantity.",
//         });

//       // keep your error but accept unitPrice as alternative input
//       if (!item.valueSalesExcludingST && (typeof item.unitPrice === "undefined" || item.unitPrice === null)) {
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0049",
//           error: "Provide valueSalesExcludingST or unitPrice.",
//         });
//       }

//       if (!item.saleType)
//         itemErrors.push({
//           itemSNo: serial,
//           statusCode: "01",
//           status: "Invalid",
//           errorCode: "0050",
//           error: "Provide saleType.",
//         });
//     });
//   }

//   // --------------------------------------------
//   // 3️⃣ RETURN VALIDATION ERRORS IF ANY
//   // --------------------------------------------
//   if (errors.length > 0 || itemErrors.length > 0) {
//     return res.status(400).json({
//       dated: new Date().toISOString().slice(0, 19).replace("T", " "),
//       validationResponse: {
//         statusCode: "00",
//         status: "Invalid",
//         errorCode: errors[0]?.code || null,
//         error: errors[0]?.message || "",
//         invoiceStatuses: itemErrors.length ? itemErrors : undefined,
//       },
//     });
//   }

//   try {
//     // --------------------------------------------
//     // 4️⃣ UNIQUE INVOICE REF NO
//     // --------------------------------------------
//     let invoiceRefNo = data.invoiceRefNo;

// if (!invoiceRefNo) {
//   // Generate next incremental number
//   const [rows] = await db.promise().query(
//     "SELECT invoice_ref_no FROM invoices ORDER BY id DESC LIMIT 1"
//   );

//   let nextNumber = 1;

//   if (rows.length > 0) {
//     // Extract number from "INV-0001"
//     const lastRef = rows[0].invoice_ref_no;
//     const lastNumber = parseInt(lastRef.split("-")[1], 10);
//     nextNumber = lastNumber + 1;
//   }

//   // Convert to 4-digit padded format
//   invoiceRefNo = `INV-${String(nextNumber).padStart(4, "0")}`;
// } else {
//   // Validate user provided invoiceRefNo must be unique
//   const [existing] = await db.promise().query(
//     "SELECT id FROM invoices WHERE invoice_ref_no = ?",
//     [invoiceRefNo]
//   );

//   if (existing.length > 0) {
//     return res.status(400).json({
//       dated: new Date().toISOString().slice(0, 19).replace("T", " "),
//       validationResponse: {
//         statusCode: "00",
//         status: "Invalid",
//         errorCode: "0003",
//         error: "Invoice reference number must be unique",
//       },
//     });
//   }
// }


//     // --------------------------------------------
//     // 5️⃣ YOUR ORIGINAL CALCULATION LOGIC (UPDATED: unitPrice + other taxes)
//     // --------------------------------------------
//     let subTotal = 0;
//     let totalTax = 0;
//     let totalDiscount = 0;

//     data.items.forEach((item) => {
//       const quantity = parseFloat(item.quantity) || 0;

//       // unitPrice — prefer provided unitPrice, otherwise fallback to provided valueSalesExcludingST/quantity
//       const providedUnitPrice = typeof item.unitPrice !== "undefined" && item.unitPrice !== null
//         ? parseFloat(item.unitPrice) || 0
//         : null;

//       let valueSalesExcludingST;
//       if (providedUnitPrice !== null) {
//         valueSalesExcludingST = providedUnitPrice * quantity;
//       } else {
//         // if payload had valueSalesExcludingST assume it's total for line (per your previous code)
//         valueSalesExcludingST = parseFloat(item.valueSalesExcludingST) || 0;
//       }

//       const discount = parseFloat(item.discount) || 0;

//       // Extract tax rate (e.g. "18%")
//       const ratePercent = parseFloat(String(item.rate || "0").replace("%", "")) || 0;

//       // line value = value excluding tax minus discount
//       const lineValue = valueSalesExcludingST - discount;

//       // main sales tax applicable
//       const salesTaxApplicableNum = parseFloat(((lineValue * ratePercent) / 100).toFixed(2)) || 0;

//       // other taxes (if provided)
//       const salesTaxWithheldAtSourceNum = parseFloat(item.salesTaxWithheldAtSource) || 0;
//       const extraTaxNum = parseFloat(item.extraTax) || 0;
//       const furtherTaxNum = parseFloat(item.furtherTax) || 0;
//       const fedPayableNum = parseFloat(item.fedPayable) || 0;

//       // total taxes for this line (sum of main + other taxes)
//       const sumTaxes = salesTaxApplicableNum + salesTaxWithheldAtSourceNum + extraTaxNum + furtherTaxNum + fedPayableNum;

//       // totalValues: line (value excluding tax minus discount) + ALL taxes
//       const totalValuesNum = parseFloat((lineValue + sumTaxes).toFixed(2));

//       // write back computed values into item (runtime only — not saved to DB as unitPrice)
//       item.valueSalesExcludingST = parseFloat(valueSalesExcludingST.toFixed(2));
//       item.salesTaxApplicable = parseFloat(salesTaxApplicableNum.toFixed(2));
//       item.totalValues = totalValuesNum;
//       item.salesTaxWithheldAtSource = salesTaxWithheldAtSourceNum;
//       item.extraTax = extraTaxNum;
//       item.furtherTax = furtherTaxNum;
//       item.fedPayable = fedPayableNum;

//       // accumulate totals
//       subTotal += lineValue; // sum of taxable base after discount
//       totalTax += sumTaxes; // include main + other taxes
//       totalDiscount += discount;
//     });

//     const grandTotal = subTotal + totalTax;

//     // --------------------------------------------
//     // 6️⃣ INSERT INVOICE HEADER
//     // --------------------------------------------
//     const invoiceUUID = uuidv4();
//     const [invoiceResult] = await db.promise().query(
//       `INSERT INTO invoices 
//         (uuid, invoice_type, invoice_date, seller_ntn_cnic, seller_business_name, seller_province, seller_address,
//          buyer_ntn_cnic, buyer_business_name, buyer_province, buyer_address, buyer_registration_type, invoice_ref_no,
//          scenario_id, businessAct, sector, sub_total, total_tax, total_discount, grand_total, status)
//        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//       [
//         invoiceUUID,
//         data.invoiceType,
//         data.invoiceDate,
//         data.sellerNTNCNIC,
//         data.sellerBusinessName,
//         data.sellerProvince,
//         data.sellerAddress,
//         data.buyerNTNCNIC || null,
//         data.buyerBusinessName,
//         data.buyerProvince,
//         data.buyerAddress,
//         data.buyerRegistrationType,
//         invoiceRefNo,
//         data.scenarioId || null,
//         data.businessAct || null,
//         data.sector || null,
//         subTotal,
//         totalTax,
//         totalDiscount,
//         grandTotal,
//         "unposted",
//       ]
//     );

//     const invoiceId = invoiceResult.insertId;

//     // --------------------------------------------
//     // 7️⃣ INSERT INVOICE ITEMS
//     // --------------------------------------------
//     for (const item of data.items) {
//       const itemUUID = uuidv4();
//       const ratePercent = parseFloat(String(item.rate || "0").replace("%", "")) || 0;
//       const quantity = parseFloat(item.quantity) || 0;

//       // Use computed values (we already set them on item above)
//       const valueSalesExcludingST = parseFloat(item.valueSalesExcludingST) || 0; // unitPrice * qty (or provided)
//       const discount = parseFloat(item.discount) || 0;
//       const salesTaxApplicable = parseFloat(item.salesTaxApplicable) || 0;
//       const salesTaxWithheldAtSource = parseFloat(item.salesTaxWithheldAtSource) || 0;
//       const extraTax = parseFloat(item.extraTax) || 0;
//       const furtherTax = parseFloat(item.furtherTax) || 0;
//       const fedPayable = parseFloat(item.fedPayable) || 0;

//       // totalValues was computed as lineValue + all taxes
//       const totalValues = parseFloat(item.totalValues) || 0;

//       // Note: storing both 'value_sales_excl_st' and 'total_values'
//       await db.promise().query(
//         `INSERT INTO invoice_items
//           (invoice_id, uuid, hs_code, product_description, rate_desc, rate_percent, uom, quantity,
//            value_sales_excl_st, discount, total_values, sales_tax_applicable, extra_tax, further_tax,
//            fed_payable, sale_type, sro_schedule_no, sro_item_serial_no)
//          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//         [
//           invoiceId,
//           itemUUID,
//           item.hsCode,
//           item.productDescription,
//           item.rate,
//           ratePercent,
//           item.uoM,
//           quantity,
//           valueSalesExcludingST,
//           discount,
//           totalValues,
//           salesTaxApplicable,
//           extraTax,
//           furtherTax,
//           fedPayable,
//           item.saleType || null,
//           item.sroScheduleNo || null,
//           item.sroItemSerialNo || null,
//         ]
//       );
//     }

//     // --------------------------------------------
//     // 8️⃣ SUCCESS RESPONSE
//     // --------------------------------------------
//     return res.status(200).json({
//       success: true,
//       message: "Invoice saved successfully",
//       validationResponse: {
//         statusCode: "00",
//         status: "Valid",
//         invoiceUUID,
//         invoiceRefNo,
//         subTotal: subTotal.toFixed(2),
//         totalTax: totalTax.toFixed(2),
//         totalDiscount: totalDiscount.toFixed(2),
//         grandTotal: grandTotal.toFixed(2),
//       },
//     });
//   } catch (err) {
//     console.error("❌ [saveInvoice] Error:", err);
//     return res.status(500).json({
//       dated: new Date().toISOString().slice(0, 19).replace("T", " "),
//       validationResponse: {
//         statusCode: "01",
//         status: "Invalid",
//         errorCode: "0500",
//         error: err.message,
//       },
//     });
//   }
// };




// // DELETE /api/invoices/:uuid
// exports.deleteInvoice = async (req, res) => {
//   const { uuid } = req.params;

//   if (!uuid) {
//     return res.status(400).json({
//       status: "Invalid",
//       message: "Missing invoice UUID",
//     });
//   }

//   try {
//     // 1️⃣ Check if invoice exists
//     const [invoiceRows] = await db.promise().query(
//       "SELECT id FROM invoices WHERE uuid = ?",
//       [uuid]
//     );

//     if (invoiceRows.length === 0) {
//       return res.status(404).json({
//         status: "Not Found",
//         message: "Invoice not found",
//       });
//     }

//     const invoiceId = invoiceRows[0].id;

//     // 2️⃣ Delete related items first
//     await db.promise().query("DELETE FROM invoice_items WHERE invoice_id = ?", [invoiceId]);

//     // 3️⃣ Delete main invoice
//     await db.promise().query("DELETE FROM invoices WHERE id = ?", [invoiceId]);

//     return res.status(200).json({
//       status: "success",
//       message: "Invoice deleted successfully",
//       deletedUUID: uuid,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       status: "error",
//       message: err.message,
//     });
//   }
// };


// exports.postUnpostedInvoices = async (req, res) => {
//   const db = require("../config/db");
//   const axios = require("axios");

//   const FBR_API_URL = process.env.FBR_VALIDATE_SANDBOX || "https://sandbox.fbr.gov.pk/api/ims/einv/validate"; 
//   const FBR_TOKEN = process.env.FBR_ACCESS_TOKEN;

//   try {
//     // 1️⃣ Fetch all unposted invoices
//     const [invoices] = await db.promise().query(`
//       SELECT * FROM invoices WHERE status = 'unposted'
//     `);

//     if (invoices.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No unposted invoices found."
//       });
//     }

//     const results = [];

//     // 2️⃣ Loop through each invoice and post to FBR
//     for (const invoice of invoices) {
//       try {
//         const [items] = await db.promise().query(
//           `SELECT * FROM invoice_items WHERE invoice_id = ?`,
//           [invoice.id]
//         );

//         // ✅ Build FBR payload
//         const fbrPayload = {
//           invoiceType: invoice.invoice_type,
//           invoiceDate: new Date(invoice.invoice_date).toISOString(),
//           invoiceRefNo: invoice.invoice_ref_no,
//           sellerNTNCNIC: invoice.seller_ntn_cnic,
//           sellerBusinessName: invoice.seller_business_name,
//           sellerProvince: invoice.seller_province,
//           sellerAddress: invoice.seller_address,
//           buyerNTNCNIC: invoice.buyer_ntn_cnic,
//           buyerBusinessName: invoice.buyer_business_name,
//           buyerProvince: invoice.buyer_province,
//           buyerAddress: invoice.buyer_address,
//           buyerRegistrationType: invoice.buyer_registration_type,
//           items: items.map(i => ({
//             hsCode: i.hs_code,
//             productDescription: i.product_description,
//             rate: i.rate_desc,
//             uoM: i.uom,
//             quantity: i.quantity,
//             totalValues: i.total_values,
//             valueSalesExcludingST: i.value_sales_excl_st,
//             fixedNotifiedValueOrRetailPrice: i.fixed_notified_value_or_retail_price,
//             salesTaxApplicable: i.sales_tax_applicable,
//             salesTaxWithheldAtSource: i.sales_tax_withheld_at_source,
//             extraTax: i.extra_tax,
//             furtherTax: i.further_tax,
//             fedPayable: i.fed_payable,
//             discount: i.discount,
//             saleType: i.sale_type,
//             sroScheduleNo: i.sro_schedule_no,
//             sroItemSerialNo: i.sro_item_serial_no
//           }))
//         };

//         // ✅ Sandbox mode only
//         if (process.env.FBR_ENV === "sandbox") {
//           fbrPayload.scenarioId = invoice.scenario_id || "SN001";
//         }

//         // 3️⃣ Send request to FBR
//         const response = await axios.post(FBR_API_URL, fbrPayload, {
//           headers: {
//             Authorization: `Bearer ${FBR_TOKEN}`,
//             "Content-Type": "application/json"
//           },
//           timeout: 20000,
//         });

//         // 4️⃣ Update DB with FBR response
//         await db.promise().query(
//           `UPDATE invoices SET status='posted', fbr_response=? WHERE id=?`,
//           [JSON.stringify(response.data), invoice.id]
//         );

//         results.push({
//           invoiceUUID: invoice.uuid,
//           status: "posted",
//           fbrResponse: response.data
//         });

//       } catch (err) {
//         // 5️⃣ Handle FBR error style response
//         const errorData = err.response?.data || {
//           dated: new Date().toISOString(),
//           validationResponse: {
//             statusCode: "01",
//             status: "Invalid",
//             errorCode: "0400",
//             error: err.message || "Unknown error occurred while posting invoice"
//           }
//         };

//         // 6️⃣ Update invoice with failed FBR response
//         await db.promise().query(
//           `UPDATE invoices SET fbr_response=? WHERE id=?`,
//           [JSON.stringify(errorData), invoice.id]
//         );

//         results.push({
//           invoiceUUID: invoice.uuid,
//           status: "failed",
//           error: errorData.validationResponse || errorData
//         });
//       }
//     }

//     // 7️⃣ Send final summary
//     res.status(200).json({
//       success: true,
//       message: "Unposted invoices processed.",
//       summary: {
//         total: results.length,
//         posted: results.filter(r => r.status === "posted").length,
//         failed: results.filter(r => r.status === "failed").length,
//       },
//       results
//     });

//   } catch (err) {
//     console.error("❌ Post Unposted Error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Server error while posting unposted invoices.",
//       error: err.message
//     });
//   }
// };


// // ✅ POST /api/invoices/post/:uuid  direct from database
// exports.postInvoiceToFBR = async (req, res) => {
//   const invoiceUUID = req.params.uuid;
//   const axios = require("axios");
//   const db = require("../config/db");

//   try {
//     // 1️⃣ Fetch invoice + items
//     const [invoices] = await db.promise().query(`SELECT * FROM invoices WHERE uuid = ?`, [invoiceUUID]);
//     if (invoices.length === 0)
//       return res.status(404).json({ success: false, message: "Invoice not found" });

//     const invoice = invoices[0];
//     const [items] = await db.promise().query(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [invoice.id]);

//     // 2️⃣ Prepare FBR payload
//     const fbrPayload = {
//       invoiceType: invoice.invoice_type,
//       invoiceDate: new Date(invoice.invoice_date).toISOString(),
//       invoiceRefNo: invoice.invoice_ref_no,
//       sellerNTNCNIC: invoice.seller_ntn_cnic,
//       sellerBusinessName: invoice.seller_business_name,
//       sellerProvince: invoice.seller_province,
//       sellerAddress: invoice.seller_address,
//       buyerNTNCNIC: invoice.buyer_ntn_cnic,
//       buyerBusinessName: invoice.buyer_business_name,
//       buyerProvince: invoice.buyer_province,
//       buyerAddress: invoice.buyer_address,
//       buyerRegistrationType: invoice.buyer_registration_type,
//       items: items.map(i => ({
//         hsCode: i.hs_code,
//         productDescription: i.product_description,
//         rate: i.rate_desc,
//         uoM: i.uom,
//         quantity: i.quantity,
//         totalValues: i.total_values,
//         valueSalesExcludingST: i.value_sales_excl_st,
//         fixedNotifiedValueOrRetailPrice: i.fixed_notified_value_or_retail_price,
//         salesTaxApplicable: i.sales_tax_applicable,
//         salesTaxWithheldAtSource: i.sales_tax_withheld_at_source,
//         extraTax: i.extra_tax,
//         furtherTax: i.further_tax,
//         fedPayable: i.fed_payable,
//         discount: i.discount,
//         saleType: i.sale_type,
//         sroScheduleNo: i.sro_schedule_no,
//         sroItemSerialNo: i.sro_item_serial_no
//       }))
//     };

//     // ✅ Add scenarioId only in sandbox
//     if (process.env.FBR_ENV === "sandbox") {
//       fbrPayload.scenarioId = invoice.scenario_id || "SN001";
//     }

//     // 3️⃣ Send request to FBR
//     const response = await axios.post(process.env.FBR_VALIDATE_SANDBOX, fbrPayload, {
//       headers: {
//         Authorization: `Bearer ${process.env.FBR_ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//       timeout: 20000,
//     });

//     // 4️⃣ Update invoice record with FBR response
//     await db.promise().query(
//       `UPDATE invoices SET status = ?, fbr_irn = ?, fbr_response = ? WHERE id = ?`,
//       ["posted", response.data.irn || null, JSON.stringify(response.data), invoice.id]
//     );

//     // 5️⃣ Success Response
//     return res.status(200).json({
//       success: true,
//       message: "Invoice submitted successfully to FBR",
//       fbrResponse: response.data,
//     });

//   } catch (err) {
//     // 🧩 Capture detailed FBR error if available
//     const fbrError = err.response?.data || err.message;

//     // 🕒 Current timestamp
//     const dated = new Date().toISOString().replace("T", " ").split(".")[0];

//     // ✅ Unified error structure (same as FBR style)
//     const formattedError = {
//       dated,
//       validationResponse: {
//         statusCode: fbrError?.validationResponse?.statusCode || "01",
//         status: fbrError?.validationResponse?.status || "Invalid",
//         errorCode: fbrError?.validationResponse?.errorCode || "0401",
//         error:
//           fbrError?.validationResponse?.error ||
//           fbrError?.error ||
//           err.message ||
//           "Unauthorized or unknown error",
//       },
//     };

//     console.error("❌ FBR Post Error:", fbrError);

//     return res.status(err.response?.status || 500).json({
//       success: false,
//       message: "Server error",
//       error: formattedError,
//     });
//   }
// };



// // POST /api/invoices/post-range
// exports.postInvoicesByScenarioRange = async (req, res) => {
//   const axios = require("axios");
//   const db = require("../config/db");

//   try {
//     const { start, end } = req.body;

//     if (!start || !end) {
//       return res.status(400).json({
//         status: false,
//         message: "Please provide start and end scenario_id range",
//       });
//     }

//     const token = process.env.FBR_ACCESS_TOKEN;
//     const PostAPI = process.env.FBR_VALIDATE_SANDBOX;

//     // 1️⃣ Fetch invoices in range (not yet posted)
//     const [invoices] = await db.promise().query(
//       `SELECT * FROM invoices WHERE scenario_id BETWEEN ? AND ? AND status != 'posted'`,
//       [start, end]
//     );

//     if (invoices.length === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "No unposted invoices found in this range.",
//       });
//     }

//     const results = [];

//     // 2️⃣ Loop through each invoice
//     for (const invoice of invoices) {
//       try {
//         const [items] = await db.promise().query(
//           `SELECT * FROM invoice_items WHERE invoice_id = ?`,
//           [invoice.id]
//         );

//         // 🔹 Calculate totalValues correctly (include all taxes)
//         const processedItems = items.map(i => {
//           const totalValues =
//             Number(i.value_sales_excl_st || 0) +
//             Number(i.sales_tax_applicable || 0) +
//             Number(i.sales_tax_withheld_at_source || 0) +
//             Number(i.extra_tax || 0) +
//             Number(i.further_tax || 0) +
//             Number(i.fed_payable || 0);

//           return {
//             hsCode: i.hs_code,
//             productDescription: i.product_description,
//             rate: i.rate_desc,
//             uoM: i.uom,
//             quantity: i.quantity,
//             totalValues: totalValues,
//             valueSalesExcludingST: i.value_sales_excl_st,
//             fixedNotifiedValueOrRetailPrice: i.fixed_notified_value_or_retail_price,
//             salesTaxApplicable: i.sales_tax_applicable,
//             salesTaxWithheldAtSource: i.sales_tax_withheld_at_source,
//             extraTax: i.extra_tax,
//             furtherTax: i.further_tax,
//             fedPayable: i.fed_payable,
//             discount: i.discount,
//             saleType: i.sale_type,
//             sroScheduleNo: i.sro_schedule_no,
//             sroItemSerialNo: i.sro_item_serial_no,
//           };
//         });

//         // 3️⃣ Prepare FBR payload
//         const fbrPayload = {
//           invoiceType: invoice.invoice_type,
//           invoiceDate: new Date(invoice.invoice_date).toISOString(),
//           invoiceRefNo: invoice.invoice_ref_no,
//           scenarioId: invoice.scenario_id,
//           sellerNTNCNIC: invoice.seller_ntn_cnic,
//           sellerBusinessName: invoice.seller_business_name,
//           sellerProvince: invoice.seller_province,
//           sellerAddress: invoice.seller_address,
//           buyerNTNCNIC: invoice.buyer_ntn_cnic,
//           buyerBusinessName: invoice.buyer_business_name,
//           buyerProvince: invoice.buyer_province,
//           buyerAddress: invoice.buyer_address,
//           buyerRegistrationType: invoice.buyer_registration_type,
//           items: processedItems,
//         };

//         // 4️⃣ Send to FBR
//         const response = await axios.post(PostAPI, fbrPayload, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });

//         // 5️⃣ Save response & mark posted
//         await db.promise().query(
//           `UPDATE invoices SET status='posted', fbr_irn=?, fbr_response=? WHERE id=?`,
//           [response.data.irn || null, JSON.stringify(response.data), invoice.id]
//         );

//         results.push({
//           invoiceId: invoice.id,
//           scenarioId: invoice.scenario_id,
//           status: "posted",
//           irn: response.data.irn || null,
//         });
//       } catch (err) {
//         // 6️⃣ Handle FBR or network error
//         const errorResponse = err.response?.data || {
//           message: err.message,
//           statusCode: err.response?.status || 500,
//         };

//         console.error(`❌ FBR Error for invoice ${invoice.id}:`, errorResponse);

//         // Save failure response too
//         await db.promise().query(
//           `UPDATE invoices SET status='failed', fbr_response=? WHERE id=?`,
//           [JSON.stringify(errorResponse), invoice.id]
//         );

//         results.push({
//           invoiceId: invoice.id,
//           scenarioId: invoice.scenario_id,
//           status: "failed",
//           error: errorResponse,
//         });
//       }
//     }

//     // 7️⃣ Send summary
//     res.status(200).json({
//       status: true,
//       message: "FBR posting completed",
//       total: results.length,
//       posted: results.filter(r => r.status === "posted").length,
//       failed: results.filter(r => r.status === "failed").length,
//       details: results,
//     });
//   } catch (err) {
//     console.error("❌ Range Post Fatal Error:", err);
//     res.status(500).json({
//       status: false,
//       message: "Internal Server Error",
//       error: err.message,
//     });
//   }
// };



// exports.getInvoiceFromFBR = async (req, res) => {
//   const { irn } = req.params; // Invoice Reference Number from FBR

//   try {
//     const token = process.env.FBR_ACCESS_TOKEN;
//     const baseURL = process.env.FBR_GET_API;

//     if (!token) {
//       return res.status(400).json({ status: "error", message: "FBR_ACCESS_TOKEN is missing" });
//     }

//     const url = `${baseURL}/${irn}`;
//     console.log("📡 Requesting FBR GET API:", url);

//     const response = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json"
//       }
//     });

//     return res.status(200).json({
//       status: "success",
//       fbrData: response.data
//     });

//   } catch (err) {
//     console.error("❌ FBR GET API Error:", err.response?.data || err.message);
//     res.status(500).json({
//       status: "error",
//       error: err.response?.data || err.message
//     });
//   }
// };








// exports.exportInvoicesCSV = async (req, res) => {
//   try {
//     const { start_date, end_date } = req.query;

//     if (!start_date || !end_date) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide start_date and end_date',
//       });
//     }

//     // 1️⃣ Fetch invoices
//     const [invoices] = await db.promise().query(
//       `
//       SELECT
//         i.id,
//         i.uuid,
//         i.invoice_type,
//         i.invoice_date,
//         i.seller_ntn_cnic,
//         i.seller_business_name,
//         i.seller_province,
//         i.seller_address,
//         i.buyer_ntn_cnic,
//         i.buyer_business_name,
//         i.buyer_province,
//         i.buyer_address,
//         i.buyer_registration_type,
//         i.invoice_ref_no,
//         i.scenario_id,
//         i.total_value,
//         i.total_tax,
//         i.sub_total,
//         i.total_discount,
//         i.grand_total,
//         i.status
//       FROM invoices i
//       WHERE i.invoice_date BETWEEN ? AND ?
//       ORDER BY i.invoice_date ASC
//       `,
//       [start_date, end_date]
//     );

//     if (!invoices.length) {
//       return res.status(404).json({
//         success: false,
//         message: 'No invoices found for the given date range',
//       });
//     }

//     // 2️⃣ Fetch related items
//     const invoiceIds = invoices.map(inv => inv.id);
//     const [items] = await db.promise().query(
//       `
//       SELECT
//         invoice_id,
//         hs_code AS HSCODE,
//         product_description AS ProductName,
//         uom AS UOM,
//         quantity AS Quantity,
//         total_values AS TotalSalesValue,
//         value_sales_excl_st AS TaxExclusiveValue,
//         rate_percent AS TaxPercent,
//         rate_percent AS TaxAmount,
//         fixed_notified_value_or_retail_price AS FixedRetailValue,
//         sales_tax_withheld_at_source AS WithholdTaxAmt,
//         extra_tax AS ExtraTaxAmt,
//         fed_payable AS FEDCharges,
//         discount AS DiscountAmt,
//         further_tax AS FurtherTaxAmt,
//         sale_type AS SalesType,
//         sro_schedule_no AS SROSchedule,
//         sro_item_serial_no AS ItemSerialNo
//       FROM invoice_items
//       WHERE invoice_id IN (?)
//       ORDER BY invoice_id ASC
//       `,
//       [invoiceIds]
//     );

//     // 3️⃣ Ensure export folder exists
//     const exportDir = path.join(__dirname, '..', 'exports');
//     if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

//     // 4️⃣ Create unique filename
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
//     const fileName = `Invoices_${start_date}_to_${end_date}_${timestamp}.csv`;
//     const filePath = path.join(exportDir, fileName);

//     // 5️⃣ Create CSV writer
//     const writableStream = fs.createWriteStream(filePath);
//     const csvStream = fastcsv.format({ headers: true });

//     csvStream.pipe(writableStream).on('finish', () => {
//       res.download(filePath, fileName, err => {
//         if (err) {
//           console.error('❌ Error sending CSV:', err);
//           return res.status(500).json({
//             success: false,
//             message: 'Error downloading CSV file',
//           });
//         }
//         // Optional: auto-delete file after 10s
//         // setTimeout(() => fs.unlink(filePath, () => {}), 10000);
//       });
//     });

//     // 6️⃣ Write combined data to CSV in FBR format
//     invoices.forEach(inv => {
//       const relatedItems = items.filter(it => it.invoice_id === inv.id);
//       relatedItems.forEach(it => {
//         csvStream.write({
//           InvNo: inv.invoice_ref_no || inv.uuid,
//           FBRInvNo: inv.fbr_irn || '',
//           SellerNTN: inv.seller_ntn_cnic || '',
//           InvType: inv.invoice_type || '',
//           InvDate: inv.invoice_date || '',
//           BuyerNTN: inv.buyer_ntn_cnic || '',
//           BuyerBusinessName: inv.buyer_business_name || '',
//           BuyerBusinessAddress: inv.buyer_address || '',
//           BuyerProvince: inv.buyer_province || '',
//           BuyerRegType: inv.buyer_registration_type || '',
//           ScenarioID: inv.scenario_id || '',
//           HSCODE: it.HSCODE || '',
//           ProductName: it.ProductName || '',
//           UOM: it.UOM || '',
//           Quantity: it.Quantity || 0,
//           TotalSalesValue: it.TotalSalesValue || 0,
//           TaxExclusiveValue: it.TaxExclusiveValue || inv.sub_total || 0,
//           'Tax%': it.TaxPercent || 0,
//           TaxApplicable: it.TaxAmount || inv.total_tax || 0,
//           FixedRetailValue: it.FixedRetailValue || 0,
//           WithholdTaxAmt: it.WithholdTaxAmt || 0,
//           ExtraTaxAmt: it.ExtraTaxAmt || 0,
//           FurtherTaxAmt: it.FurtherTaxAmt || 0,
//           FEDCharges: it.FEDCharges || 0,
//           DiscountAmt: it.DiscountAmt || inv.total_discount || 0,
//           SalesType: it.SalesType || '',
//           SROSchedule: it.SROSchedule || '',
//           ItemSerialNo: it.ItemSerialNo || ''
//         });
//       });
//     });

//     // 7️⃣ End CSV stream
//     csvStream.end();

//   } catch (error) {
//     console.error('CSV Export Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// };




// exports.uploadInvoicesExcel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: 'No file uploaded.' });
//     }

//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     if (!data || data.length === 0) {
//       return res.status(400).json({ success: false, message: 'Excel file is empty.' });
//     }

//     const db = connection.promise();
//     const invoiceMap = new Map();

//     const insertedInvoices = [];
//     const skippedInvoices = [];

//     for (const row of data) {
//       const {
//         SellerNTN,
//         InvNo,
//         InvType,
//         InvDate,
//         BuyerCode,
//         BuyerNTN,
//         BuyerBusinessName,
//         BuyerBusinessAddress,
//         BuyerProvince,
//         BuyerRegType,
//         ScenarioID,
//         HSCODE,
//         ProductName,
//         UOM,
//         Quantity,
//         TotalSalesValue,
//         FEDCharges,
//         DiscountAmt,
//         TaxExclusiveValue,
//         Tax,
//         TaxAmount,
//         FixedRetailValue,
//         WithholdTaxAmt,
//         ExtraTaxAmt,
//         FurtherTaxAmt,
//         SalesType,
//         SROSchedule,
//         ItemSerialNo,
//       } = row;

//       // Format date
//       let formattedDate = null;
//       if (typeof InvDate === 'number') {
//         formattedDate = new Date(Math.round((InvDate - 25569) * 86400 * 1000))
//           .toISOString()
//           .split('T')[0];
//       } else if (typeof InvDate === 'string') {
//         const parts = InvDate.split(/[\/\-]/);
//         if (parts.length === 3) {
//           const [day, month, year] =
//             parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
//           const parsedDate = new Date(`${year}-${month}-${day}`);
//           if (!isNaN(parsedDate)) formattedDate = parsedDate.toISOString().split('T')[0];
//         }
//       }

//       const rate_percent =
//         typeof Tax === 'string' ? parseFloat(Tax.replace('%', '').trim()) || 0 : parseFloat(Tax) || 0;

//       // Fetch seller
//       const [sellerRows] = await db.query('SELECT * FROM company_info WHERE NTN = ? LIMIT 1', [SellerNTN]);
//       if (!sellerRows.length) {
//         skippedInvoices.push({ row, reason: `Seller not found for NTN: ${SellerNTN}` });
//         continue;
//       }
//       const seller = sellerRows[0];

//       const invoiceKey = `${InvNo}_${ScenarioID}`;

//       // Skip duplicate invoice
//       if (invoiceMap.has(invoiceKey)) {
//         skippedInvoices.push({ row, reason: 'Duplicate invoice in Excel or already inserted' });
//         continue;
//       }

//       // Insert invoice
//       const invoiceUuid = uuidv4();
//       const [invoiceResult] = await db.query(
//         `INSERT INTO invoices 
//          (uuid, invoice_type, invoice_date, seller_ntn_cnic, seller_business_name, seller_province, seller_address,
//           buyer_ntn_cnic, buyer_business_name, buyer_province, buyer_address, buyer_registration_type,
//           invoice_ref_no, scenario_id, total_value, total_tax)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           invoiceUuid,
//           InvType,
//           formattedDate,
//           SellerNTN,
//           seller.business_name || '',
//           seller.province || '',
//           seller.address || '',
//           BuyerNTN || '',
//           BuyerBusinessName || '',
//           BuyerProvince || '',
//           BuyerBusinessAddress || '',
//           BuyerRegType || '',
//           InvNo,
//           ScenarioID,
//           TotalSalesValue || 0,
//           TaxAmount || 0,
//         ]
//       );

//       const invoiceId = invoiceResult.insertId;
//       invoiceMap.set(invoiceKey, invoiceId);
//       insertedInvoices.push({ InvNo, ScenarioID, invoiceId });

//       // Insert invoice item
//       const itemUuid = uuidv4();
//       await db.query(
//         `INSERT INTO invoice_items 
//         (invoice_id, uuid, hs_code, product_description, rate_desc, rate_percent, uom, quantity,
//          total_values, value_sales_excl_st, fixed_notified_value_or_retail_price,
//          sales_tax_applicable, sales_tax_withheld_at_source, extra_tax, further_tax,
//          fed_payable, discount, sale_type, sro_schedule_no, sro_item_serial_no)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           invoiceId,
//           itemUuid,
//           HSCODE || '',
//           ProductName || '',
//           `${rate_percent}%`,
//           rate_percent,
//           UOM || '',
//           Quantity || 0,
//           TotalSalesValue || 0,
//           TaxExclusiveValue || 0,
//           FixedRetailValue || 0,
//           TaxAmount || 0,
//           WithholdTaxAmt || 0,
//           ExtraTaxAmt || 0,
//           FurtherTaxAmt || 0,
//           FEDCharges || 0,
//           DiscountAmt || 0,
//           SalesType || '',
//           SROSchedule || '',
//           ItemSerialNo || '',
//           formattedDate,
//         ]
//       );
//     }

//     // ✅ Send response
//     res.status(200).json({
//       success: true,
//       message: 'Invoices processed successfully.',
//       inserted: insertedInvoices,
//       skipped: skippedInvoices,
//     });

//     // Delete uploaded file after 1 minute (60,000 ms)
//     setTimeout(() => {
//       fs.unlink(req.file.path, (err) => {
//         if (err) console.error('❌ Error deleting uploaded Excel file:', err);
//         else console.log('✅ Uploaded Excel file deleted:', req.file.path);
//       });
//     }, 60000);

//   } catch (error) {
//     console.error('❌ Error uploading invoices:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while uploading invoices.',
//       error: error.message,
//     });
//   }
// };

