const express = require('express');
const { randomInt } = require('node:crypto');
const { isPublicSignupRole } = require('../config/signupPolicy');
const { logAudit } = require('../utils/audit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const generateUniqueId = require('../utils/generateUniqueId');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// Public registration is intentionally restricted to Tenant accounts.
router.post('/register', async (req, res) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const contactNumber = typeof req.body.contactNumber === 'string' ? req.body.contactNumber.trim() : '';
    const dob = typeof req.body.dob === 'string' ? req.body.dob.trim() : '';
    const password = req.body.password;
    if (fullName.length < 2 || fullName.length > 100
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || contactNumber.length < 7 || contactNumber.length > 20
      || !/^\d{8}$/.test(dob)
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Provide valid registration details. Password must be 8–128 characters.' });
    }

    const role = isPublicSignupRole(req.body.role);
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const otpCode = randomInt(100000, 1000000).toString();
    await Otp.deleteMany({ email });
    await Otp.deleteMany({ email: email + '_data' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const uniqueId = generateUniqueId(role, fullName, dob);
    await Otp.create({ email, otp: otpCode });
    await Otp.create({
      email: email + '_data',
      otp: JSON.stringify({ fullName, contactNumber, dob, role, password: hashedPassword, uniqueId }),
    });
    await sendEmail(email, 'Your RealEstate OTP', 'Your OTP is ' + otpCode + '. Valid for 5 minutes.');
    return res.json({ message: 'OTP sent to email.' });
  } catch (error) {
    console.error('Registration request failed:', error);
    return res.status(500).json({ message: 'Could not start registration. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req,res)=>{
  try{
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    const record = await Otp.findOneAndDelete({ email, otp });
    if(!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    const dataRec = await Otp.findOne({ email: email+'_data' });
    if(!dataRec) return res.status(400).json({ message: 'Registration data expired' });
    const data = JSON.parse(dataRec.otp);
    const user = await User.create({
      fullName: data.fullName,
      email,
      contactNumber: data.contactNumber,
      dob: data.dob,
      role: 'Tenant',
      uniqueId: data.uniqueId,
      password: data.password,
    });
    await Otp.deleteMany({ email });
    await Otp.deleteMany({ email: email+'_data' });
    res.json({ message: `Registered successfully. Your Unique ID: ${user.uniqueId}`, uniqueId: user.uniqueId });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

// Login with Email or Unique ID + Role
router.post('/login', async (req,res)=>{
  try{
    const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
    const emailOrId = typeof req.body.emailOrId === 'string' ? req.body.emailOrId.trim() : '';
    const password = req.body.password;
    if (!['Admin', 'Agent', 'Owner', 'Tenant', 'Maintenance'].includes(role)
      || !emailOrId || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Invalid login details.' });
    }
    const normalizedLookup = emailOrId.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalizedLookup }, { uniqueId: emailOrId.toUpperCase() }],
      role,
    });
    if(user && user.isActive===false) return res.status(403).json({msg:'Account deactivated. Contact admin.'});
    if(!user) return res.status(400).json({ message: "this email doesn't registered, plz first registered" });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await logAudit({ user: { id: user._id, fullName: user.fullName, role: user.role } }, 'Login', 'Logged in');
    res.json({ token, role: user.role, uniqueId: user.uniqueId, fullName: user.fullName });
  }catch(e){ console.error('Login failed:', e); res.status(500).json({ message: 'Could not complete login.' }); }
});

// Forgot Password - reset OTP pathao
router.post('/forgot-password', async (req,res)=>{
  try{
    const email = (req.body.email || '').trim();
    const user = await User.findOne({ email });
    if(!user) return res.status(404).json({ message: "this email doesn't registered, plz first registered" });
    await Otp.deleteMany({ email });
    const otpCode = randomInt(100000, 1000000).toString();
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
