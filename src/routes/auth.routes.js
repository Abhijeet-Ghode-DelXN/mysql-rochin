const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  updateDetails, 
  updatePassword, 
  verifyEmail,
  handlePasswordLink,
  setPassword
} = require('../controllers/auth.controller');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.get('/verify-email/:verificationtoken', verifyEmail);
router.get('/set-password/:token', handlePasswordLink);
router.post('/set-password', setPassword);

module.exports = router;
