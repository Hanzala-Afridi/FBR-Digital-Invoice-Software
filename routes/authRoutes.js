const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Auth Routes
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);

// User Management
router.post('/register', authController.register);
router.get('/list', verifyToken, userController.getAllUsers);
router.put('/update-password', verifyToken, userController.updatePassword);

//  Status Routes — must be placed BEFORE /:uuid routes
router.put('/status/inactive/:uuid', verifyToken, (req, res, next) => {
  req.body.status = "inactive"; // inactive
  next();
}, userController.updateUserStatus);

router.put('/status/active/:uuid', verifyToken, (req, res, next) => {
  req.body.status = "active"; // active
  next();
}, userController.updateUserStatus);

router.delete('/delete/:uuid', verifyToken, userController.deleteUserPermanently);


// Dynamic Routes — keep at the end
router.get('/:uuid', verifyToken, userController.getUserByUUID);
router.put('/:uuid', verifyToken, userController.updateUser);

module.exports = router;
