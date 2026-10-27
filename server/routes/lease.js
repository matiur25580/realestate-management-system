const express = require('express');
const router = express.Router();
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const rl = (req)=> (req.user.role||'').toLowerCase();

const withComputed = (l)=>{
  const o = l.toObject();
  const days = Math.ceil((new Date(l.endDate) - new Date())/(1000*60*60*24));
  o.daysRemaining = days;
  if(o.status==='active' && days < 0) o.status = 'expired';
  return o;
};

router.post('/', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    const { propertyId, tenantEmailOrId, startDate, endDate, monthlyRent, deposit, terms } = req.body;
    const tenant = await User.findOne({ $or: [{ email: (tenantEmailOrId||'').trim() }, { uniqueId: (tenantEmailOrId||'').trim() }] });
    if(!tenant) return res.status(404).json({message:'Tenant not found'});
    const lease = await Lease.create({ property: propertyId, tenant: tenant._id, startDate, endDate, monthlyRent: Number(monthlyRent), deposit: Number(deposit||0), terms: terms||'' });
    try{
      const prop = await Property.findById(propertyId);
      await sendEmail(tenant.email, 'New Lease Agreement',
        'Hi '+tenant.fullName+',\n\nA lease agreement has been created for "'+(prop?prop.title:'')+'".\nPeriod: '+startDate+' to '+endDate+'\nMonthly Rent: Rs.'+monthlyRent+'\nDeposit: Rs.'+(deposit||0)+'\n\nPlease check your dashboard.\n\n- RealEstate Management System');
    }catch(e){ console.log('Lease email failed:', e.message); }
    res.json(lease);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/my', auth, async (req,res)=>{
  const list = await Lease.find({ tenant: req.user.id }).populate('property','title city address').sort({createdAt:-1});
  res.json(list.map(withComputed));
});

router.get('/all', auth, async (req,res)=>{
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
  let q = {};
  if(r==='owner'){
    const props = await Property.find({ $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }).select('_id');
    q.property = { $in: props.map(p=>p._id) };
  }
  const list = await Lease.find(q).populate('property','title city').populate('tenant','fullName email').sort({createdAt:-1});
  res.json(list.map(withComputed));
});

router.put('/:id', auth, async (req,res)=>{
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
  await Lease.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({message:'Lease updated'});
});

module.exports = router;
