const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/authRoutes');
const authRoutes = require('./routes/authRoutes');
const InvoiceRoutes = require('./routes/invoice');
const { verifyToken } = require('./middleware/authMiddleware');
const companyRoutes = require('./routes/companeRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const itemsRoutes = require('./routes/items');
const sroRoutes =require('./routes/ListRoutes')
const fbrRoutes = require("./routes/fbrRoutes");


require('./config/db');

dotenv.config();
const app = express();

// ✅ Enable CORS
app.use(cors({
  origin: '*', // or specify ['http://localhost:5173'] for security
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected user routes
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/invoice', verifyToken, InvoiceRoutes);

app.use('/api/company', verifyToken, companyRoutes);
app.use('/api/buyer', verifyToken, buyerRoutes);
app.use('/api/items', verifyToken, itemsRoutes);
// Fetch SROs
app.use('/api/list', verifyToken, sroRoutes);
app.use("/api/fbr", fbrRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
