const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const generateUniqueId = require('../utils/generateUniqueId');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// Register - OTP pathao
router.post('/register', async (req,res)=>{
  try{
    const { fullName, email, contactNumber, dob, role, password } = req.body;
    let user = await User.findOne({ email });
    if(user) return res.status(400).json({ message: 'Email already registered' });
    const otpCode = Math.floor(100000 + Math.random()*900000).toString();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });
    await sendEmail(email, 'Your RealEstate OTP', `Your OTP is ${otpCode}. Valid for 5 minutes.`);
    const hashedPw = await bcrypt.hash(password, 10);
    const uniqueId = generateUniqueId(role, fullName, dob);
    await Otp.create({ email: email+'_data', otp: JSON.stringify({ fullName, contactNumber, dob, role, password: hashedPw, uniqueId }) });
    res.json({ message: 'OTP sent to email' });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

// Verify OTP
router.post('/verify-otp', async (req,res)=>{
  try{
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });
    if(!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    const dataRec = await Otp.findOne({ email: email+'_data' });
    if(!dataRec) return res.status(400).json({ message: 'Registration data expired' });
    const data = JSON.parse(dataRec.otp);
    const user = await User.create({ fullName: data.fullName, email, contactNumber: data.contactNumber, dob: data.dob, role: data.role, uniqueId: data.uniqueId, password: data.password });
    await Otp.deleteMany({ email });
    await Otp.deleteMany({ email: email+'_data' });
    res.json({ message: `Registered successfully. Your Unique ID: ${user.uniqueId}`, uniqueId: user.uniqueId });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

// Login with Email or Unique ID + Role
router.post('/login', async (req,res)=>{
  try{
    const { role, emailOrId, password } = req.body;
    let user = await User.findOne({ $or: [{ email: emailOrId }, { uniqueId: emailOrId }], role });
    if(!user) return res.status(400).json({ message: "this email doesn't registered, plz first registered" });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, uniqueId: user.uniqueId, fullName: user.fullName });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

// Forgot Password - reset OTP pathao
router.post('/forgot-password', async (req,res)=>{
  try{
    const email = (req.body.email || '').trim();
    const user = await User.findOne({ email });
    if(!user) return res.status(404).json({ message: "this email doesn't registered, plz first registered" });
    await Otp.deleteMany({ email });
    const otpCode = Math.floor(100000 + Math.random()*900000).toString();
    await Otp.create({ email, otp: otpCode });
    await sendEmail(email, 'Password Reset OTP', `Your password reset OTP is ${otpCode}. Valid for 5 minutes.`);
    res.json({ message: 'OTP sent to your email' });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

// Reset Password - OTP verify kore notun password set
router.post('/reset-password', async (req,res)=>{
  try{
    const email = (req.body.email || '').trim();
    const { otp, newPassword } = req.body;
    if(!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password minimum 6 characters' });
    const record = await Otp.findOne({ email, otp });
    if(!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    const user = await User.findOne({ email });
    if(!user) return res.status(404).json({ message: 'User not found' });
    const same = await bcrypt.compare(newPassword, user.password);
    if(same) return res.status(400).json({ message: 'This is your current password. Please enter a different password' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteMany({ email });
    res.json({ message: 'Password reset successful. Please login with new password.' });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

module.exports = router;
