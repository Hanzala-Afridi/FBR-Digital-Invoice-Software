const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator'); // for email validation
const nodemailer = require("nodemailer");

// =========================
// Password strength regex
// =========================
const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?{}[\]~]).{8,}$/;



    exports.register = async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone } = req.body;

        // ✅ 1. Check all required fields
        if (!first_name || !last_name || !email || !password || !phone)
            return res.status(400).json({ message: 'All fields are required' });

        // ✅ 2. Validate email
        if (!validator.isEmail(email))
            return res.status(400).json({ message: 'Invalid email address' });

        // ✅ 3. Validate password
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
            });
        }

        // // ✅ 4. Decode JWT to get user ID (the one who is creating new user)
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'Authorization token missing' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decoded.id; // assuming token payload includes user.id

        // ✅ 5. Check for existing email
        db.query('SELECT id FROM users WHERE email = ?', [email], async (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.length > 0)
                return res.status(400).json({ message: 'Email already registered' });

            // ✅ 6. Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // ✅ 7. Generate UUID
            const userUuid = uuidv4();

            // ✅ 8. Insert user into DB
            const sql = `
        INSERT INTO users 
        (uuid, first_name, last_name, email, password, phone, status, created_at, updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), ?, ?)
      `;

            db.query(
                sql,
                [userUuid, first_name, last_name, email, hashedPassword, phone, createdBy, createdBy],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.status(201).json({
                        message: 'User registered successfully!',
                        user: {
                            uuid: userUuid,
                            first_name,
                            last_name,
                            email,
                            phone,
                            created_by: createdBy,
                            status: 'active'
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// ============================
// LOGIN USER (with validations)
// ============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    // 2️⃣ Validate email format
    if (!validator.isEmail(email))
      return res.status(400).json({ message: "Invalid email address" });

    // 3️⃣ Check user
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0)
        return res.status(404).json({ message: "User not found" });

      const user = result[0];

      // 4️⃣ Check account status
      if (user.status !== "active")
        return res.status(403).json({ message: "Account is inactive" });

      // 5️⃣ Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });

      // 6️⃣ Generate JWT (✅ includes id + email)
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // 7️⃣ Success response
      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          uuid: user.uuid,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          status: user.status
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ============================
// FORGOT PASSWORD
// ============================


// ---------------------- FORGOT PASSWORD (Send OTP) ----------------------
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        // Check if user exists
        const [user] = await new Promise((resolve, reject) => {
            db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!user) {
            return res.status(404).json({ message: "No user found with this email" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

        // Store OTP and expiry in DB
        await new Promise((resolve, reject) => {
            db.query(
                "UPDATE users SET reset_otp = ?, otp_expiry = ? WHERE id = ?",
                [otp, otpExpiry, user.id],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        // Setup Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for 587
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASS,
            },
        });

        // Email content
        const mailOptions = {
            from: `"Support Team" <${process.env.SMTP_USERNAME}>`,
            to: email,
            subject: "Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Password Reset OTP</h2>
                    <p>Hello ${user.name || ""},</p>
                    <p>Your OTP for password reset is:</p>
                    <h1 style="letter-spacing: 4px;">${otp}</h1>
                    <p>This OTP will expire in <strong>15 minutes</strong>.</p>
                    <p>If you didn’t request this, please ignore this email.</p>
                    <br/>
                    <p>Best Regards,<br/>Your App Team</p>
                </div>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return res.json({
            message: "OTP has been sent to your email.",
        });

    } catch (err) {
        console.error("Forgot password error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// ============================
// RESET PASSWORD
// ============================


exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }

    try {
        // Fetch user and OTP details
        const [user] = await new Promise((resolve, reject) => {
            db.query("SELECT id, password, reset_otp, otp_expiry FROM users WHERE email = ?", [email], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Check OTP validity
        if (!user.reset_otp || user.reset_otp.toString() !== otp.toString()) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        // Validate password strength
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
            });
        }

        // Check if new password is same as old
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be same as the old password." });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password & clear OTP
        await new Promise((resolve, reject) => {
            db.query(
                "UPDATE users SET password = ?, reset_otp = NULL, otp_expiry = NULL WHERE id = ?",
                [hashedPassword, user.id],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        return res.json({ message: "Password has been reset successfully!" });

    } catch (err) {
        console.error("Reset password error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};



// ============================
// Ma Api
// ============================

exports.getMe = (req, res) => {
    const userId = req.user.id; // comes from middleware

    db.query(
        'SELECT uuid, first_name, last_name, email, phone, status, created_at, updated_at FROM users WHERE id = ?',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0)
                return res.status(404).json({ message: 'User not found' });

            res.json({
                message: 'User fetched successfully',
                user: results[0],
            });
        }
    );
};



exports.logout = async (req, res) => {
  try {
    // 1️⃣ Get token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Decode token to get expiry time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const expiresAt = new Date(decoded.exp * 1000);

    // 3️⃣ Store token in blacklist table
    await db.promise().query(
      "INSERT INTO blacklisted_tokens (token, expires_at) VALUES (?, ?)",
      [token, expiresAt]
    );

    // 4️⃣ Respond to client
    res.status(200).json({ message: "Logout successful, token invalidated" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
};