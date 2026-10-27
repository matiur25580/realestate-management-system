const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const Expense = require('../models/Expense');
const Property = require('../models/Property');
const rl = (req)=> (req.user.role||'').toLowerCase();
router.post('/', auth, async (req,res)=>{
  try{
    if(rl(req)!=='owner') return res.status(403).json({msg:'Not allowed'});
    const { propertyId, title, category, amount, date, notes } = req.body;
    const p = await Property.findById(propertyId);
    const oid = p ? (p.ownerId || p.owner) : null;
    if(!p || String(oid)!==String(req.user.id)) return res.status(403).json({msg:'Not your property'});
    const e = await Expense.create({ property: propertyId, ownerId: req.user.id, title, category: category||'Other', amount: Number(amount), date: date||new Date(), notes: notes||'' });
    logAudit(req,'Expense Added',req.body.title||'');
    res.json(e);
  }catch(e){ res.status(500).json({msg:e.message}); }
});
router.get('/my', auth, async (req,res)=>{
  if(rl(req)!=='owner') return res.status(403).json({msg:'Not allowed'});
  res.json(await Expense.find({ ownerId: req.user.id }).populate('property','title city').sort({date:-1}));
});
router.get('/all', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({msg:'Not allowed'});
  res.json(await Expense.find().populate('property','title city').populate('ownerId','fullName email').sort({date:-1}));
});
router.delete('/:id', auth, async (req,res)=>{
  const e = await Expense.findById(req.params.id);
  if(!e) return res.status(404).json({msg:'Not found'});
  if(rl(req)!=='admin' && String(e.ownerId)!==String(req.user.id)) return res.status(403).json({msg:'Not allowed'});
  await e.deleteOne(); res.json({msg:'Deleted'});
});
module.exports = router;
