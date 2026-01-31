const db = require('../config/db');

// ✅ Get all SROs (without `id`)
exports.getAllSros = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        uuid, 
        sro_code, 
        title, 
        description,  
        created_at, 
        updated_at 
      FROM sros 
      ORDER BY issue_date DESC
    `);

    res.status(200).json({
      success: true,
      message: 'Fetched all SROs successfully',
      data: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching SROs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

// ✅ Get single SRO by UUID (without `id`)
exports.getSroByUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await db.promise().query(`
      SELECT 
        uuid, 
        sro_code, 
        title, 
        description,  
        created_at, 
        updated_at 
      FROM sros 
      WHERE uuid = ?
    `, [uuid]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SRO not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fetched SRO successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('❌ Error fetching SRO:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};


// ✅ Get all categories (without `id`)
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        uuid, 
        name, 
        description, 
        created_at, 
        updated_at
      FROM categories
      ORDER BY name ASC
    `);

    res.status(200).json({
      success: true,
      message: 'Fetched all categories successfully',
      data: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

// ✅ Get single category by UUID (without `id`)
exports.getCategoryByUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await db.promise().query(`
      SELECT 
        uuid, 
        name, 
        description, 
        created_at, 
        updated_at
      FROM categories
      WHERE uuid = ?
      LIMIT 1
    `, [uuid]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fetched category successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('❌ Error fetching category by UUID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};


// ✅ Get all subcategories
exports.getAllSubcategories = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        uuid,
        name,
        description,
        created_at,
        updated_at
      FROM subcategories
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      status: true,
      message: 'Subcategory list fetched successfully',
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// ✅ Get single subcategory by UUID
exports.getSubcategoryByUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT uuid, name, description, created_at, updated_at 
       FROM subcategories 
       WHERE uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Subcategory not found',
      });
    }

    res.status(200).json({
      status: true,
      message: 'Subcategory fetched successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
// ✅ Get single subcategory by UUID
exports.getSubcategoryByUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    // ✅ Use db.promise().query() for async/await
    const [rows] = await db.promise().query(
      `SELECT uuid, name, description, created_at, updated_at 
       FROM subcategories 
       WHERE uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Subcategory not found',
      });
    }

    res.status(200).json({
      status: true,
      message: 'Subcategory fetched successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message, // include error message for debugging
    });
  }
};

