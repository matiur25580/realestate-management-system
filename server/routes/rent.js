const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Rent = require('../models/Rent');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');
const rl = (req)=> (req.user.role||'').toLowerCase();

const propertyForManager = async (req, propertyId) => {
  const role = rl(req);
  if (role === 'admin') return Property.findById(propertyId);
  const query = role === 'owner'
    ? { _id: propertyId, $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }
    : { _id: propertyId, agentId: req.user.id };
  return Property.findOne(query);
};

const scopedIds = async (req)=>{
  const r = rl(req);
  if(r==='admin') return null;
  const pq = r==='owner'
    ? { $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }
    : { agentId: req.user.id };
  const props = await Property.find(pq).select('_id');
  return props.map(p=>p._id);
};

router.post('/', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
    const { propertyId, tenantEmailOrId, amount, month } = req.body || {};
    if(!propertyId || !tenantEmailOrId || !Number.isFinite(Number(amount)) || Number(amount)<=0 || !/^\d{4}-\d{2}$/.test(String(month||''))) {
      return res.status(400).json({message:'Provide a valid property, tenant, positive amount and rent month.'});
    }
    const property = await propertyForManager(req, propertyId);
    if(!property) return res.status(404).json({message:'Property not found or not assigned to your account.'});
    const lookup = String(tenantEmailOrId).trim();
    const tenant = await User.findOne({ $or: [{ email: lookup }, { uniqueId: lookup }], role: 'Tenant', isActive: { $ne: false } });
    if(!tenant) return res.status(404).json({ message: 'Active tenant not found' });
    const rec = await Rent.create({ property: property._id, tenant: tenant._id, amount: Number(amount), month });
    logAudit(req,'Rent Recorded','₹'+amount+' for '+month);
    try{
      await sendEmail(tenant.email, 'Rent Due - '+month,
        'Hi '+tenant.fullName+',\n\nRent of Rs.'+amount+' for '+month+' ('+property.title+') is due.\nPlease check your dashboard.\n\n- RealEstate Management System');
    }catch(e){ console.log('Rent due email failed:', e.message); }
    res.status(201).json(rec);
    await notify(tenant._id, 'Rent Due - '+month, 'Rent of Rs.'+amount+' for '+month+' is due. Please check your dashboard.', 'warning');
  }catch(e){ res.status(500).json({ message: 'Could not create rent record.' }); }
});

router.get('/my', auth, async (req,res)=>{
  if(rl(req)!=='tenant') return res.status(403).json({ message: 'Not allowed' });
  const list = await Rent.find({ tenant: req.user.id }).populate('property','title city').sort({createdAt:-1});
  res.json(list);
});

router.get('/all', auth, async (req,res)=>{
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
  const ids = await scopedIds(req);
  const q = ids ? { property: { $in: ids } } : {};
  const list = await Rent.find(q).populate('property','title city').populate('tenant','fullName email').sort({createdAt:-1});
  res.json(list);
});

router.get('/:id/receipt', auth, async (req,res)=>{
  try{
    const r = rl(req);
    const rent = await Rent.findById(req.params.id).populate('property').populate('tenant','fullName email uniqueId');
    if(!rent) return res.status(404).json({ message: 'Not found' });
    if(r==='tenant') {
      if(String(rent.tenant._id)!==String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
    } else if(['admin','agent','owner'].includes(r)) {
      const property = await propertyForManager(req, rent.property?._id);
      if(!property) return res.status(403).json({ message: 'Not allowed' });
    } else return res.status(403).json({ message: 'Not allowed' });
    if(rent.status!=='paid') return res.status(400).json({ message: 'Receipt only for paid rents' });
    const doc = new PDFDocument();
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename=rent-receipt-'+rent.month+'.pdf');
    doc.pipe(res);
    doc.fontSize(20).text('RENT PAYMENT RECEIPT', {align:'center'});
    doc.moveDown();
    doc.fontSize(12).text('Receipt No: '+rent._id);
    doc.text('Date: '+(rent.paidAt?new Date(rent.paidAt).toLocaleDateString():new Date().toLocaleDateString()));
    doc.moveDown();
    doc.text('Tenant: '+rent.tenant.fullName+' ('+rent.tenant.email+')');
    doc.text('Tenant ID: '+(rent.tenant.uniqueId||''));
    doc.text('Property: '+rent.property.title+', '+rent.property.city);
    doc.text('Rent Month: '+rent.month);
    doc.moveDown();
    doc.fontSize(16).text('Amount Paid: Rs.'+rent.amount, {align:'right'});
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your payment!', {align:'center'});
    doc.end();
  }catch(e){ res.status(500).json({ message: 'Could not generate rent receipt.' }); }
});

router.put('/:id', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Only authorized property managers can update rent status.' });
    if(!['pending','paid','overdue'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid rent status.' });
    const rent = await Rent.findById(req.params.id);
    if(!rent) return res.status(404).json({ message: 'Not found' });
    const property = await propertyForManager(req, rent.property);
    if(!property) return res.status(403).json({ message: 'You cannot manage rent for this property.' });
    rent.status = req.body.status;
    rent.paidAt = req.body.status === 'paid' ? new Date() : undefined;
    await rent.save();
    logAudit(req,'Rent '+req.body.status,'₹'+rent.amount+' for '+rent.month);
    if(req.body.status==='paid'){
      try{
        const full = await Rent.findById(rent._id).populate('tenant','fullName email').populate('property','title');
        if(full?.tenant?.email) await sendEmail(full.tenant.email, 'Rent Payment Received',
          'Hi '+full.tenant.fullName+',\n\nPayment of Rs.'+full.amount+' for '+full.month+' ('+(full.property?full.property.title:'')+') received. Thank you!\n\n- RealEstate Management System');
      }catch(e){ console.log('Payment email failed:', e.message); }
    }
    res.json({ message: 'Rent updated' });
  }catch(e){ res.status(500).json({ message: 'Could not update rent status.' }); }
});

module.exports = router;
