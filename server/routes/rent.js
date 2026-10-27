const express = require('express');
const router = express.Router();
const Rent = require('../models/Rent');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
    const { propertyId, tenantEmailOrId, amount, month } = req.body;
    const tenant = await User.findOne({ $or: [{ email: (tenantEmailOrId||'').trim() }, { uniqueId: (tenantEmailOrId||'').trim() }] });
    if(!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const rec = await Rent.create({ property: propertyId, tenant: tenant._id, amount: Number(amount), month });
    res.json(rec);
  }catch(e){ res.status(500).json({ message: e.message }); }
});

router.get('/my', auth, async (req,res)=>{
  const list = await Rent.find({ tenant: req.user.id }).populate('property','title city').sort({createdAt:-1});
  res.json(list);
});

router.get('/all', auth, async (req,res)=>{
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
  let q = {};
  if(r==='owner'){
    const props = await Property.find({ $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }).select('_id');
    q.property = { $in: props.map(p=>p._id) };
  }
  const list = await Rent.find(q).populate('property','title city').populate('tenant','fullName email').sort({createdAt:-1});
  res.json(list);
});

router.put('/:id', auth, async (req,res)=>{
  try{
    const r = rl(req);
    const { status } = req.body;
    const rent = await Rent.findById(req.params.id);
    if(!rent) return res.status(404).json({ message: 'Not found' });
    if(r==='tenant'){
      if(String(rent.tenant)!==String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
      if(status!=='paid') return res.status(403).json({ message: 'Not allowed' });
    } else if(!['admin','agent','owner'].includes(r)){
      return res.status(403).json({ message: 'Not allowed' });
    }
    rent.status = status;
    if(status==='paid') rent.paidAt = new Date();
    await rent.save();
    res.json({ message: 'Rent updated' });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

module.exports = router;
