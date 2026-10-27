const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notify = require('../utils/notify');
const Commission = require('../models/Commission');
const rl = (req)=> (req.user.role||'').toLowerCase();
router.get('/my', auth, async (req,res)=>{
  if(rl(req)!=='agent') return res.status(403).json({msg:'Not allowed'});
  res.json(await Commission.find({ agentId: req.user.id }).populate('property','title city price').sort({createdAt:-1}));
});
router.get('/all', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({msg:'Not allowed'});
  res.json(await Commission.find().populate('agentId','fullName email').populate('property','title city').sort({createdAt:-1}));
});
router.put('/:id/pay', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({msg:'Not allowed'});
  const c = await Commission.findById(req.params.id);
  if(!c) return res.status(404).json({msg:'Not found'});
  c.status = 'paid'; await c.save();
  await notify(c.agentId, 'Commission Paid', 'Your commission of Rs.'+c.amount+' has been paid.', 'success');
  res.json(c);
});
module.exports = router;
