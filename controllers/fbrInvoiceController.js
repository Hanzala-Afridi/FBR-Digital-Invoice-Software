const axios = require("axios");

// Helper: Select URL based on ENV and type
const getFbrUrl = (type) => {
  const env = process.env.FBR_ENV || "sandbox";

  const urls = {
    sandbox: {
      post: process.env.FBR_POST_SANDBOX,
      validate: process.env.FBR_VALIDATE_SANDBOX,
    },
    production: {
      post: process.env.FBR_POST_PRODUCTION,
      validate: process.env.FBR_VALIDATE_PRODUCTION,
    },
  };

  return urls[env][type];
};

// ✅ 1️⃣ POST INVOICE DATA API
exports.postInvoiceData = async (req, res) => {
  const invoice = req.body;

  try {
    // ✅ Validate required fields
    const requiredFields = [
      "invoiceType", "invoiceDate",
      "sellerNTNCNIC", "sellerBusinessName", "sellerProvince", "sellerAddress",
      "buyerBusinessName", "buyerProvince", "buyerAddress", "buyerRegistrationType", "items"
    ];

    const missing = requiredFields.filter(f => !invoice[f]);
    if (missing.length > 0)
      return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(", ")}` });

    // ✅ 1️⃣ Perform Calculations (same as saveInvoice)
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let grandTotal = 0;

    invoice.items = invoice.items.map((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0; // for calculation only
      const discount = parseFloat(item.discount) || 0;
      const extraTax = parseFloat(item.extraTax) || 0;
      const furtherTax = parseFloat(item.furtherTax) || 0;
      const fedPayable = parseFloat(item.fedPayable) || 0;

      // ✅ valueSalesExcludingST = unitPrice * quantity
      const valueSalesExcludingST = quantity * unitPrice;

      // ✅ Extract numeric percentage (e.g. "18%")
      const ratePercent = parseFloat(String(item.rate || "0").replace("%", "")) || 0;

      // ✅ Calculate sales tax
      const salesTaxApplicable = parseFloat(((valueSalesExcludingST - discount) * ratePercent) / 100) || 0;

      // ✅ Total line value = base + all taxes - discount
      const totalValues = parseFloat(
        valueSalesExcludingST + salesTaxApplicable + extraTax + furtherTax + fedPayable - discount
      );

      subTotal += valueSalesExcludingST - discount;
      totalTax += salesTaxApplicable + extraTax + furtherTax + fedPayable;
      totalDiscount += discount;
      grandTotal += totalValues;

      // ✅ Return updated item (without unitPrice)
      return {
        ...item,
        valueSalesExcludingST: valueSalesExcludingST.toFixed(2),
        salesTaxApplicable: salesTaxApplicable.toFixed(2),
        totalValues: totalValues.toFixed(2),
      };
    });

    // ✅ 2️⃣ Prepare Payload (do NOT include unitPrice)
    const fbrPayload = {
      invoiceType: invoice.invoiceType,
      invoiceDate: invoice.invoiceDate,
      sellerNTNCNIC: invoice.sellerNTNCNIC,
      sellerBusinessName: invoice.sellerBusinessName,
      sellerProvince: invoice.sellerProvince,
      sellerAddress: invoice.sellerAddress,
      buyerNTNCNIC: invoice.buyerNTNCNIC || "",
      buyerBusinessName: invoice.buyerBusinessName,
      buyerProvince: invoice.buyerProvince,
      buyerAddress: invoice.buyerAddress,
      buyerRegistrationType: invoice.buyerRegistrationType,
      invoiceRefNo: invoice.invoiceRefNo || "",
      items: invoice.items, // now includes updated calculated fields
    };

    // ✅ Add scenarioId only in Sandbox
    if (process.env.FBR_ENV === "sandbox") {
      fbrPayload.scenarioId = invoice.scenarioId || "SN001";
    }

    // ✅ 3️⃣ Call FBR API
    const url = getFbrUrl("post");
    const response = await axios.post(url, fbrPayload, {
      headers: {
        "Authorization": `Bearer ${process.env.FBR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 20000, // 20s
    });

    // ✅ 4️⃣ Extract FBR invoice number (if exists)
    const fbrInvoiceNo = response.data?.InvoiceNumber || null;

    // ✅ 5️⃣ Convert full response to JSON string for DB storage
    const fbrResponseJson = JSON.stringify(response.data);

    // ✅ 6️⃣ Update local DB with FBR invoice number and full response
    await db.promise().query(
      `UPDATE invoices 
       SET fbr_invoice_no = ?, fbr_response = ?, status = ?, sub_total = ?, total_tax = ?, total_discount = ?, grand_total = ?
       WHERE invoice_ref_no = ?`,
      [
        fbrInvoiceNo,
        fbrResponseJson,
        'posted',
        subTotal.toFixed(2),
        totalTax.toFixed(2),
        totalDiscount.toFixed(2),
        grandTotal.toFixed(2),
        invoice.invoiceRefNo
      ]
    );

    // ✅ 7️⃣ Send success response
    return res.status(200).json({
      success: true,
      message: "Invoice submitted successfully to FBR",
      fbrInvoiceNo,
      totals: {
        subTotal: subTotal.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      data: response.data,
    });

  } catch (error) {
    console.error("❌ FBR Post Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Server error",
      error: error.response?.data || error.message,
    });
  }
};


// ✅ 2️⃣ VALIDATE INVOICE DATA API
exports.validateInvoiceData = async (req, res) => {
  const invoice = req.body;

  try {
    // ✅ Basic validation
    if (!invoice.invoiceType || !invoice.items)
      return res.status(400).json({ success: false, message: "Missing invoiceType or items" });

    // ✅ Prepare payload
    const fbrPayload = {
      invoiceType: invoice.invoiceType,
      invoiceDate: invoice.invoiceDate,
      sellerNTNCNIC: invoice.sellerNTNCNIC,
      sellerBusinessName: invoice.sellerBusinessName,
      sellerProvince: invoice.sellerProvince,
      sellerAddress: invoice.sellerAddress,
      buyerNTNCNIC: invoice.buyerNTNCNIC || "",
      buyerBusinessName: invoice.buyerBusinessName,
      buyerProvince: invoice.buyerProvince,
      buyerAddress: invoice.buyerAddress,
      buyerRegistrationType: invoice.buyerRegistrationType,
      invoiceRefNo: invoice.invoiceRefNo || "",
      items: invoice.items,
    };

    // ✅ Add scenarioId only for Sandbox
    if (process.env.FBR_ENV === "sandbox") {
      fbrPayload.scenarioId = invoice.scenarioId || "SN001";
    }

    // ✅ Call FBR API
    const url = getFbrUrl("validate");
    const response = await axios.post(url, fbrPayload, {
      headers: {
        "Authorization": `Bearer ${process.env.FBR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    return res.status(200).json({
      success: true,
      message: "Invoice validated successfully",
      data: response.data,
    });

  } catch (error) {
    console.error("❌ FBR Validate Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Server error",
      error: error.response?.data || error.message,
    });
  }
};







// *************** Get APIS ************************

// ✅ Fetch provinces from FBR
exports.getProvinces = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/provinces", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "Provinces fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching provinces",
      error: err.response?.data || err.message
    });
  }
};

// ✅ Fetch doctypecode from FBR
exports.getdoctypecode = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/doctypecode", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "doctypecode fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching doctypecode",
      error: err.response?.data || err.message
    });
  }
};


// ✅ Fetch HsCode from FBR
exports.getHsCode = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/itemdesccode", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "HsCode fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching HsCode",
      error: err.response?.data || err.message
    });
  }
};


// ✅ Fetch SRO Item ID from FBR
exports.getSROITEMID = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/sroitemcode", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "SRO Item ID fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching SRO Item ID",
      error: err.response?.data || err.message
    });
  }
};


// ✅ Fetch transtypecode from FBR
exports.getTranstypecode = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/transtypecode", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "transtypecode fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching transtypecode",
      error: err.response?.data || err.message
    });
  }
};

// ✅ Fetch uom from FBR
exports.getUom = async (req, res) => {
  try {
    // Replace with your actual FBR token
    const accessToken = process.env.FBR_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "FBR access token missing" });
    }

    const response = await axios.get("https://gw.fbr.gov.pk/pdi/v1/uom", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const provinces = response.data;



    return res.status(200).json({
      success: true,
      message: "Uom fetched successfully",
      data: provinces
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching uom",
      error: err.response?.data || err.message
    });
  }
};