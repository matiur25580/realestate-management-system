const express = require('express');
const router = express.Router();
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');
const { propertyManagerFilter } = require('../utils/propertyAccess');
const rl = (req)=> (req.user.role||'').toLowerCase();

const propertyForManager = async (req, propertyId) => {
  const filter = propertyManagerFilter(req.user, propertyId);
  return filter ? Property.findOne(filter) : null;
};

const withComputed = (l)=>{
  const o = l.toObject();
  const days = Math.ceil((new Date(l.endDate) - new Date())/(1000*60*60*24));
  o.daysRemaining = days;
  if(o.status==='active' && days < 0) o.status = 'expired';
  return o;
};

const scopedIds = async (req)=>{
  const filter = propertyManagerFilter(req.user);
  if (!filter) return [];
  const props = await Property.find(filter).select('_id');
  return props.map(p=>p._id);
};

router.post('/', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    const { propertyId, tenantEmailOrId, startDate, endDate, monthlyRent, deposit, terms } = req.body || {};
    if(!propertyId || !tenantEmailOrId || !startDate || !endDate
      || Number.isNaN(new Date(startDate).getTime()) || Number.isNaN(new Date(endDate).getTime())
      || new Date(endDate) <= new Date(startDate)
      || !Number.isFinite(Number(monthlyRent)) || Number(monthlyRent) <= 0
      || !Number.isFinite(Number(deposit || 0)) || Number(deposit || 0) < 0) {
      return res.status(400).json({message:'Provide a valid property, tenant, lease period, rent and deposit.'});
    }
    const property = await propertyForManager(req, propertyId);
    if(!property) return res.status(404).json({message:'Property not found or not assigned to your account.'});
    const lookup = String(tenantEmailOrId).trim();
    const tenant = await User.findOne({ $or: [{ email: lookup }, { uniqueId: lookup }], role: 'Tenant', isActive: { $ne: false } });
    if(!tenant) return res.status(404).json({message:'Active tenant not found.'});
    const lease = await Lease.create({ property: property._id, tenant: tenant._id, startDate, endDate, monthlyRent: Number(monthlyRent), deposit: Number(deposit||0), terms: terms||'' });
    logAudit(req,'Lease Created','₹'+monthlyRent+'/month lease');
    try{
      await sendEmail(tenant.email, 'New Lease Agreement',
        'Hi '+tenant.fullName+',\n\nA lease agreement has been created for "'+property.title+'".\nPeriod: '+startDate+' to '+endDate+'\nMonthly Rent: Rs.'+monthlyRent+'\nDeposit: Rs.'+(deposit||0)+'\n\nPlease check your dashboard.\n\n- RealEstate Management System');
    }catch(e){ console.log('Lease email failed:', e.message); }
    res.status(201).json(lease);
    await notify(tenant._id, 'New Lease Agreement', 'A new lease ('+startDate+' to '+endDate+', Rs.'+monthlyRent+'/month) has been created for you. Check your dashboard.', 'success');
  }catch(e){ res.status(500).json({message:'Could not create lease.'}); }
});

router.get('/my', auth, async (req,res)=>{
  if(rl(req)!=='tenant') return res.status(403).json({message:'Not allowed'});
  const list = await Lease.find({ tenant: req.user.id }).populate('property','title city address').sort({createdAt:-1});
  res.json(list.map(withComputed));
});

router.get('/all', auth, async (req,res)=>{
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
  const ids = await scopedIds(req);
  const q = ids ? { property: { $in: ids } } : {};
  const list = await Lease.find(q).populate('property','title city').populate('tenant','fullName email').sort({createdAt:-1});
  res.json(list.map(withComputed));
});

router.put('/:id', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    if(!['active','expired','terminated'].includes(req.body.status)) return res.status(400).json({message:'Invalid lease status.'});
    const lease = await Lease.findById(req.params.id);
    if(!lease) return res.status(404).json({message:'Lease not found.'});
    const property = await propertyForManager(req, lease.property);
    if(!property) return res.status(403).json({message:'You cannot manage leases for this property.'});
    lease.status = req.body.status;
    await lease.save();
    logAudit(req,'Lease Updated','Lease status set to '+lease.status);
    res.json({message:'Lease updated',lease});
  }catch(e){ res.status(500).json({message:'Could not update lease.'}); }
});

module.exports = router;
