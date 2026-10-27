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
    const { propertyId, tenantEmailOrId, amount, month } = req.body;
    const tenant = await User.findOne({ $or: [{ email: (tenantEmailOrId||'').trim() }, { uniqueId: (tenantEmailOrId||'').trim() }] });
    if(!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const rec = await Rent.create({ property: propertyId, tenant: tenant._id, amount: Number(amount), month });
    logAudit(req,'Rent Recorded','₹'+amount+' for '+month);
    const prop = await Property.findById(propertyId);
    try{
      await sendEmail(tenant.email, 'Rent Due - '+month,
        'Hi '+tenant.fullName+',\n\nRent of Rs.'+amount+' for '+month+' ('+(prop?prop.title:'')+') is due.\nPlease pay from your dashboard.\n\n- RealEstate Management System');
    }catch(e){ console.log('Rent due email failed:', e.message); }
    res.json(rec);
    await notify(tenant._id, 'Rent Due - '+month, 'Rent of Rs.'+amount+' for '+month+' is due. Please pay from your dashboard.', 'warning');
  }catch(e){ res.status(500).json({ message: e.message }); }
});

router.get('/my', auth, async (req,res)=>{
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
    if(!['admin','agent','owner','tenant'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
    if(r==='tenant' && String(rent.tenant._id)!==String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });
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
  }catch(e){ res.status(500).json({ message: e.message }); }
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
    logAudit(req,'Rent '+status,'₹'+rent.amount+' for '+rent.month);
    if(status==='paid'){
      try{
        const full = await Rent.findById(rent._id).populate('tenant','fullName email').populate('property','title');
        if(full && full.tenant && full.tenant.email){
          await sendEmail(full.tenant.email, 'Rent Payment Received',
            'Hi '+full.tenant.fullName+',\n\nPayment of Rs.'+full.amount+' for '+full.month+' ('+(full.property?full.property.title:'')+') received. Thank you!\n\n- RealEstate Management System');
        }
      }catch(e){ console.log('Payment email failed:', e.message); }
    }
    res.json({ message: 'Rent updated' });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

module.exports = router;
