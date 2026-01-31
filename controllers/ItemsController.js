// controllers/itemsController.js

const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");

// ❌ REMOVED: The generateHsCode function is no longer needed.

// ===============================
// CREATE ITEM
// ===============================
exports.createItem = async (req, res) => {
  try {
    const {
      // ✅ ADDED: name is now received from the frontend
      name,
      hsCode,
      productDescription,
      rate,
      uoM,
      quantity,
      totalValues,
      valueSalesExcludingST,
      fixedNotifiedValueOrRetailPrice,
      salesTaxApplicable,
      salesTaxWithheldAtSource,
      extraTax,
      furtherTax,
      sroScheduleNo,
      fedPayable,
      discount,
      saleType,
      sroItemSerialNo,
    } = req.body;

    // ✅ VALIDATION: Ensure name, hsCode and productDescription are provided
    if (!name || !hsCode || !productDescription) {
      return res.status(400).json({ message: "Name, HS Code and Product Description are required." });
    }

    const uuid = uuidv4();

    // ✅ UPDATED: The name and hsCode from the request body are now inserted directly.
    await db.promise().query(
      `INSERT INTO items (
        uuid, name, hsCode, productDescription, rate, uoM, quantity, totalValues, valueSalesExcludingST,
        fixedNotifiedValueOrRetailPrice, salesTaxApplicable, salesTaxWithheldAtSource, extraTax,
        furtherTax, sroScheduleNo, fedPayable, discount, saleType, sroItemSerialNo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        name, // Use the name from req.body
        hsCode, // Use the hsCode from req.body
        productDescription,
        rate,
        uoM,
        quantity,
        totalValues,
        valueSalesExcludingST,
        fixedNotifiedValueOrRetailPrice,
        salesTaxApplicable,
        salesTaxWithheldAtSource,
        extraTax,
        furtherTax,
        sroScheduleNo,
        fedPayable,
        discount,
        saleType,
        sroItemSerialNo,
      ]
    );

    res.status(201).json({ message: "Item created successfully", uuid, name, hsCode });
  } catch (error) {
    console.error("❌ Create Item Error:", error);
    res.status(500).json({ message: "Error creating item", error: error.message });
  }
};

// ===============================
// GET ALL ITEMS (with pagination)
// ===============================
exports.getAllItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let whereClause = "";
    let params = [];
    if (search) {
      // ✅ UPDATED: Added "name" to the WHERE clause for searching
      whereClause = "WHERE name LIKE ? OR hsCode LIKE ? OR productDescription LIKE ?";
      params.push(search, search, search);
    }

    const [[{ total }]] = await db
      .promise()
      .query(`SELECT COUNT(*) as total FROM items ${whereClause}`, params);

    params.push(limit, offset);

    const [rows] = await db
      .promise()
      .query(
        // ✅ UPDATED: Added "name" to the list of selected columns
        `SELECT uuid, name, hsCode, productDescription, rate, uoM, quantity,
                totalValues, valueSalesExcludingST, fixedNotifiedValueOrRetailPrice,
                salesTaxApplicable, salesTaxWithheldAtSource, extraTax, furtherTax,
                sroScheduleNo, fedPayable, discount, saleType, sroItemSerialNo, created_at
         FROM items
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        params
      );

    res.status(200).json({
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching items:", error.message);
    res.status(500).json({ message: "Error fetching items", error: error.message });
  }
};

// ===============================
// GET SINGLE ITEM BY UUID
// ===============================
exports.getItemByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await db
      .promise()
      .query(
        `SELECT uuid, name, hsCode, productDescription, rate, uoM, quantity,
                totalValues, valueSalesExcludingST, fixedNotifiedValueOrRetailPrice,
                salesTaxApplicable, salesTaxWithheldAtSource, extraTax, furtherTax,
                sroScheduleNo, fedPayable, discount, saleType, sroItemSerialNo, created_at
         FROM items WHERE uuid = ?`,
        [uuid]
      );
    if (rows.length === 0)
      return res.status(404).json({ message: "Item not found" });
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching item", error: error.message });
  }
};

// ===============================
// UPDATE ITEM
// ===============================
exports.updateItem = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      // ✅ ADDED: name can now be updated
      name,
      hsCode,
      productDescription,
      rate,
      uoM,
      quantity,
      totalValues,
      valueSalesExcludingST,
      fixedNotifiedValueOrRetailPrice,
      salesTaxApplicable,
      salesTaxWithheldAtSource,
      extraTax,
      furtherTax,
      sroScheduleNo,
      fedPayable,
      discount,
      saleType,
      sroItemSerialNo,
    } = req.body;

    const [rows] = await db.promise().query(
      `UPDATE items SET 
        name=?, hsCode=?, productDescription=?, rate=?, uoM=?, quantity=?, totalValues=?, 
        valueSalesExcludingST=?, fixedNotifiedValueOrRetailPrice=?, salesTaxApplicable=?, 
        salesTaxWithheldAtSource=?, extraTax=?, furtherTax=?, sroScheduleNo=?, fedPayable=?, 
        discount=?, saleType=?, sroItemSerialNo=?, updated_at=NOW() 
      WHERE uuid=?`,
      [
        name,
        hsCode,
        productDescription,
        rate,
        uoM,
        quantity,
        totalValues,
        valueSalesExcludingST,
        fixedNotifiedValueOrRetailPrice,
        salesTaxApplicable,
        salesTaxWithheldAtSource,
        extraTax,
        furtherTax,
        sroScheduleNo,
        fedPayable,
        discount,
        saleType,
        sroItemSerialNo,
        uuid,
      ]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item updated successfully" });
  } catch (error) {
    // Added console.error for better logging
    console.error("❌ Error updating item:", error.message);
    res.status(500).json({ message: "Error updating item", error: error.message });
  }
};

// ===============================
// DELETE ITEM
// ===============================
exports.deleteItem = async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await db.promise().query("DELETE FROM items WHERE uuid = ?", [uuid]);
    if (rows.affectedRows === 0)
      return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting item", error: error.message });
  }
};