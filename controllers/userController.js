const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator'); // for email validation


const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?{}[\]~]).{8,}$/;

// ============================
// REGISTER USER (with validations)
// ============================



exports.getAllUsers = async (req, res) => {
    try {
        // Pagination params
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Optional search by name or email
        const search = req.query.search ? `%${req.query.search}%` : '%%';

        // Count total users
        const [countRows] = await db.promise().query(
            `SELECT COUNT(*) AS total 
             FROM users 
             WHERE first_name LIKE ? OR email LIKE ?`,
            [search, search]
        );
        const totalUsers = countRows[0].total;

        // Fetch paginated users with creator/updater names
        const [users] = await db.promise().query(
            `SELECT 
                u.uuid,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.status,
                CONCAT(creator.first_name, ' ', creator.last_name) AS created_by_name,
                CONCAT(updater.first_name, ' ', updater.last_name) AS updated_by_name,
                u.created_at,
                u.updated_at
             FROM users u
             LEFT JOIN users AS creator ON u.created_by = creator.id
             LEFT JOIN users AS updater ON u.updated_by = updater.id
             WHERE u.first_name LIKE ? OR u.email LIKE ?
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [search, search, limit, offset]
        );

        // Pagination metadata
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            current_page: page,
            per_page: limit,
            total_users: totalUsers,
            total_pages: totalPages,
            data: users
        });

    } catch (error) {
        console.error("❌ SQL Error:", error.message);
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};


exports.getUserByUUID = async (req, res) => {
  try {
    const { uuid } = req.params;

    const [rows] = await db.promise().query(
      `SELECT 
          u.uuid,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.status,
          CONCAT(creator.first_name, ' ', creator.last_name) AS created_by_name,
          CONCAT(updater.first_name, ' ', updater.last_name) AS updated_by_name,
          u.created_at,
          u.updated_at
       FROM users u
       LEFT JOIN users AS creator ON u.created_by = creator.id
       LEFT JOIN users AS updater ON u.updated_by = updater.id
       WHERE u.uuid = ?`,
      [uuid]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ SQL Error:", error.message);
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};



exports.updateUser = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id; // from verifyToken middleware
    const { first_name, last_name, email, phone, status } = req.body;

    // 1️⃣ Check if user exists
    const [existingRows] = await db.promise().query(
      "SELECT * FROM users WHERE uuid = ?",
      [uuid]
    );

    if (existingRows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const existingUser = existingRows[0];

    // 2️⃣ If email is being updated, check for duplicates
    if (email && email !== existingUser.email) {
      const [emailCheck] = await db.promise().query(
        "SELECT id FROM users WHERE email = ? AND uuid != ?",
        [email, uuid]
      );

      if (emailCheck.length > 0) {
        return res.status(400).json({
          message: "Email already exists. Please use a different email.",
        });
      }
    }

    // 3️⃣ Prepare updated fields (only if provided)
    const updatedFields = {
      first_name: first_name || existingUser.first_name,
      last_name: last_name || existingUser.last_name,
      email: email || existingUser.email,
      phone: phone || existingUser.phone,
      status: status !== undefined ? status : existingUser.status,
      updated_by: userId,
      updated_at: new Date(),
    };

    // 4️⃣ Run update query
    await db.promise().query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ?, updated_by = ?, updated_at = ? 
       WHERE uuid = ?`,
      [
        updatedFields.first_name,
        updatedFields.last_name,
        updatedFields.email,
        updatedFields.phone,
        updatedFields.status,
        updatedFields.updated_by,
        updatedFields.updated_at,
        uuid,
      ]
    );

    res.status(200).json({
      message: "User updated successfully",
      updatedFields,
    });
  } catch (error) {
    console.error("❌ SQL Error:", error.message);
    res.status(500).json({
      message: "Error updating user",
      error: error.message,
    });
  }
};


exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Comes from verified JWT middleware
    const { oldPassword, newPassword, confirmPassword } = req.body;
    console.log("Decoded user:", req.user);

    // 1️⃣ Validate input
    if (!oldPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    // 2️⃣ Confirm passwords match
    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "New password and confirm password do not match" });

    // 3️⃣ Validate new password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    // 4️⃣ Fetch user by ID
    const [rows] = await db.promise().query("SELECT password FROM users WHERE id = ?", [userId]);
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];

    // 5️⃣ Verify old password
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordCorrect)
      return res.status(400).json({ message: "Old password is incorrect" });

    // 6️⃣ Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res.status(400).json({ message: "New password cannot be the same as the old password" });

    // 7️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 8️⃣ Update password + track updated_by
    await db.promise().query(
      "UPDATE users SET password = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [hashedPassword, userId, userId] // ✅ Correct parameter order
    );

    res.json({ message: "✅ Password updated successfully!" });
  } catch (error) {
    console.error("❌ Error updating password:", error);
    res.status(500).json({ message: "Error updating password", error: error.message });
  }
};


exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.uuid; // user UUID from URL
    const { status } = req.body;    // status value from request body
    const updatedBy = req.user.id;  // from JWT middleware

    // 1️⃣ Validate input
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value. Must be 1 (Inactive), 2 (Active), or 3 (Deleted)." });
    }

    // 2️⃣ Check user exists
    const [rows] = await db.promise().query("SELECT * FROM users WHERE uuid = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3️⃣ Update status
    await db.promise().query(
      "UPDATE users SET status = ?, updated_by = ?, updated_at = NOW() WHERE uuid = ?",
      [status, updatedBy, userId]
    );

    // 4️⃣ Custom messages
    const statusText =
      status === "inactive"
        ? "User deactivated successfully."
        : status === "active"
        ? "User activated successfully."
        : "User deleted successfully.";

    res.json({ message: statusText });
  } catch (error) {
    console.error("❌ Error updating user status:", error);
    res.status(500).json({ message: "Error updating user status", error: error.message });
  }
};


// Permanently delete a user by UUID
exports.deleteUserPermanently = async (req, res) => {
  try {
    const { uuid } = req.params;
    const deletedBy = req.user?.id || null; // from JWT (if available)

    if (!uuid) {
      return res.status(400).json({ message: "User UUID is required" });
    }

    // Check if user exists
    const [userRows] = await db.promise().query(
      "SELECT * FROM users WHERE uuid = ?",
      [uuid]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user permanently
    await db.promise().query(
      "DELETE FROM users WHERE uuid = ?",
      [uuid]
    );

    res.json({
      message: "User permanently deleted successfully",
      deleted_by: deletedBy,
      deleted_uuid: uuid
    });
  } catch (error) {
    console.error("Error deleting user permanently:", error.message);
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};
