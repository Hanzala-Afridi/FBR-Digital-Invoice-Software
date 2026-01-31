const jwt = require('jsonwebtoken');
const db = require('../config/db'); // adjust path to your DB config

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

 try {
  const [rows] = await db.promise().query('SELECT * FROM blacklisted_tokens WHERE token = ?', [token]);
  if (rows.length > 0) {
    return res.status(403).json({ message: 'Token has been blacklisted. Please login again.' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
} catch (err) {
  console.error('JWT VERIFY ERROR:', err.message);
  return res.status(403).json({ message: err.message });
}

};
