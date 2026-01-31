const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.createCompany = (req, res) => {
  const { companyName, NTN, province, address, business_Email, STRN } = req.body;

  if (!companyName || !NTN || !province || !address || !business_Email) {
    return res.status(400).json({
      success: false,
      message: "❌ Missing required fields: companyName, NTN, province, address, or business_Email",
    });
  }

  const uuid = uuidv4();

  const sql = `
    INSERT INTO company_info 
    (uuid, companyName, NTN, province, address, business_Email, STRN)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [uuid, companyName, NTN, province, address, business_Email, STRN], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error while creating company",
        error: err.message,
      });
    }

    // Fetch the newly created record for response
    const fetchSql = "SELECT * FROM company_info WHERE id = ?";
    db.query(fetchSql, [result.insertId], (fetchErr, rows) => {
      if (fetchErr) {
        return res.status(500).json({
          success: false,
          message: "Error fetching newly created company",
          error: fetchErr.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "✅ Company created successfully",
        data: rows[0],
      });
    });
  });
};


// 🔵 READ - Get all companies
exports.getAllCompanies = (req, res) => {
  const sql = 'SELECT * FROM company_info ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
};

// 🔵 READ - Get single company by UUID
exports.getCompanyByUUID = (req, res) => {
  const sql = 'SELECT * FROM company_info WHERE uuid = ?';
  db.query(sql, [req.params.uuid], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Company not found' });
    res.json(results[0]);
  });
};

exports.updateCompany = (req, res) => {
  const { companyName, NTN, province, address, business_Email, STRN } = req.body;
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({
      success: false,
      message: "❌ Missing company UUID in request parameters",
    });
  }

  const sql = `
    UPDATE company_info
    SET 
      companyName = ?, 
      NTN = ?, 
      province = ?, 
      address = ?, 
      business_Email = ?, 
      STRN = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE uuid = ?
  `;

  db.query(sql, [companyName, NTN, province, address, business_Email, STRN, uuid], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error while updating company",
        error: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ Company not found or UUID invalid",
      });
    }

    // Fetch updated record for clean response
    const fetchSql = "SELECT * FROM company_info WHERE uuid = ?";
    db.query(fetchSql, [uuid], (fetchErr, rows) => {
      if (fetchErr) {
        return res.status(500).json({
          success: false,
          message: "Error fetching updated company",
          error: fetchErr.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "✅ Company updated successfully",
        data: rows[0],
      });
    });
  });
};

// 🔴 DELETE - Delete company by UUID
exports.deleteCompany = (req, res) => {
  const sql = 'DELETE FROM company_info WHERE uuid = ?';
  db.query(sql, [req.params.uuid], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Company not found' });
    res.json({ message: '🗑️ Company deleted successfully' });
  });
};


// 🔵 READ - Get company by NTN
exports.getCompanyByNTN = (req, res) => {
  try {
    // Check NTN from either URL or payload
    const NTN = req.params.NTN || req.body.NTN;

    if (!NTN) {
      return res.status(400).json({
        success: false,
        message: '❌ NTN is required (provide it in params or body)',
      });
    }

    const sql = `SELECT * FROM company_info WHERE NTN = ? LIMIT 1`;

    db.query(sql, [NTN], (err, results) => {
      if (err) {
        console.error('❌ Database Error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error while fetching company',
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: `❌ No company found with NTN: ${NTN}`,
        });
      }

      res.status(200).json({
        success: true,
        message: '✅ Company fetched successfully',
        data: results[0],
      });
    });
  } catch (error) {
    console.error('❌ Unexpected Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
