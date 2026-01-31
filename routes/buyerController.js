const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// 🟢 CREATE - Add new buyer
exports.createBuyer = (req, res) => {   
  const { NTN, buyerBusinessName, buyerProvince, buyerAddress, buyerRegistrationType } = req.body;

  // Basic validation
  if (!NTN || !buyerBusinessName || !buyerProvince || !buyerAddress || !buyerRegistrationType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const uuid = uuidv4();

  const sql = `
    INSERT INTO buyer_info (uuid, NTN, buyerBusinessName, buyerProvince, buyerAddress, buyerRegistrationType)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [uuid, NTN, buyerBusinessName, buyerProvince, buyerAddress, buyerRegistrationType], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(201).json({
      message: '✅ Buyer created successfully',
      id: result.insertId,
      uuid
    });
  });
};

// 🔵 READ - Get all buyers with pagination + search
exports.getAllBuyers = (req, res) => {
  try {
    // ✅ Read from req.query for a GET request
    const { search = '', page = 1, limit = 10 } = req.query; 

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchQuery = `%${search}%`;

    // The rest of the logic is the same...
    const countSql = `
      SELECT COUNT(*) AS total 
      FROM buyer_info 
      WHERE NTN LIKE ? OR buyerBusinessName LIKE ?
    `;
    db.query(countSql, [searchQuery, searchQuery], (err, countResult) => {
      if (err) {
        console.error('❌ Database count error:', err);
        return res.status(500).json({ message: 'Database error while counting buyers' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / parseInt(limit));

      const sql = `
        SELECT * FROM buyer_info
        WHERE NTN LIKE ? OR buyerBusinessName LIKE ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `;
      db.query(sql, [searchQuery, searchQuery, parseInt(limit), offset], (err, results) => {
        if (err) {
          console.error('❌ Database fetch error:', err);
          return res.status(500).json({ message: 'Database error while fetching buyers' });
        }
        res.status(200).json({
          message: '✅ Buyers fetched successfully',
          pagination: {
            total,
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalPages
          },
          data: results
        });
      });
    });
  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🔵 READ - Get single buyer by UUID
exports.getBuyerByUUID = (req, res) => {
  const sql = 'SELECT * FROM buyer_info WHERE uuid = ?';
  db.query(sql, [req.params.uuid], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Buyer not found' });
    res.json(results[0]);
  });
};

// 🟠 UPDATE - Update buyer by UUID
exports.updateBuyer = (req, res) => {
  const { NTN, buyerBusinessName, buyerProvince, buyerAddress, buyerRegistrationType } = req.body;
  const { uuid } = req.params;

  // Validate required fields
  if (!uuid) {
    return res.status(400).json({
      success: false,
      message: "Missing buyer UUID in request params",
    });
  }

  const sql = `
    UPDATE buyer_info
    SET 
      NTN = ?, 
      buyerBusinessName = ?, 
      buyerProvince = ?, 
      buyerAddress = ?, 
      buyerRegistrationType = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE uuid = ?
  `;

  db.query(
    sql,
    [NTN, buyerBusinessName, buyerProvince, buyerAddress, buyerRegistrationType, uuid],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error occurred while updating buyer",
          error: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "❌ Buyer not found or UUID invalid",
        });
      }

      // Fetch updated record for response
      const fetchSql = "SELECT * FROM buyer_info WHERE uuid = ?";
      db.query(fetchSql, [uuid], (fetchErr, rows) => {
        if (fetchErr) {
          return res.status(500).json({
            success: false,
            message: "Database error occurred while fetching updated buyer",
            error: fetchErr.message,
          });
        }

        res.status(200).json({
          success: true,
          message: "✅ Buyer updated successfully",
          updatedBuyer: rows[0],
        });
      });
    }
  );
};


// 🔴 DELETE - Delete buyer by UUID
exports.deleteBuyer = (req, res) => {
  const sql = 'DELETE FROM buyer_info WHERE uuid = ?';
  db.query(sql, [req.params.uuid], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Buyer not found' });
    res.json({ message: '🗑️ Buyer deleted successfully' });
  });
};
