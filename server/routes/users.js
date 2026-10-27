const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();
const ROLEMAP = { admin:'Admin', agent:'Agent', owner:'Owner', tenant:'Tenant', maintenance:'Maintenance' };

router.put('/me', auth, async (req,res)=>{
  const u = await User.findById(req.user.id);
  if(!u) return res.status(404).json({message:'Not found'});
  if(req.body.fullName) u.fullName = req.body.fullName;
  if(req.body.contactNumber) u.contactNumber = req.body.contactNumber;
  await u.save();
  res.json({message:'Profile updated'});
});

router.get('/all', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  const users = await User.find().select('-password').sort({createdAt:-1});
  res.json(users);
});

router.put('/:id/role', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  const R = ROLEMAP[String(req.body.role||'').toLowerCase()];
  if(!R) return res.status(400).json({message:'Invalid role'});
  if(String(req.params.id)===String(req.user.id)) return res.status(400).json({message:'Cannot change own role'});
  await User.findByIdAndUpdate(req.params.id, { role: R });
  res.json({message:'Role updated to '+R});
});

router.put('/:id/status', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  if(String(req.params.id)===String(req.user.id)) return res.status(400).json({message:'Cannot deactivate self'});
  const active = !!req.body.isActive;
  await User.findByIdAndUpdate(req.params.id, { isActive: active });
  res.json({message: active ? 'User activated' : 'User deactivated'});
});

module.exports = router;
