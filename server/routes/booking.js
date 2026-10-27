const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
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

router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, message, visitDate } = req.body;
    const booking = await Booking.create({ property: propertyId, tenant: req.user.id, message: message||'', visitDate: visitDate||null });
    res.json({ msg: 'Booking request sent', booking });
  } catch(e){ res.status(500).json({ msg: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  const bookings = await Booking.find({ tenant: req.user.id }).populate('property').sort({createdAt:-1});
  res.json(bookings);
});

router.get('/all', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  const ids = await scopedIds(req);
  const q = ids ? { property: { $in: ids } } : {};
  const bookings = await Booking.find(q).populate('property').populate('tenant','fullName email').sort({createdAt:-1});
  res.json(bookings);
});

router.put('/:id', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  const { status } = req.body;
  const bk = await Booking.findById(req.params.id).populate('property').populate('tenant','fullName email');
  if(!bk) return res.status(404).json({ msg: 'Not found' });
  if(r==='agent' && String(bk.property?.agentId)!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
  if(r==='owner'){
    const own = bk.property && (String(bk.property.ownerId)===String(req.user.id) || String(bk.property.owner)===String(req.user.id));
    if(!own) return res.status(403).json({ msg: 'Not allowed' });
  }
  bk.status = status;
  await bk.save();
  await notify(bk.tenant?._id||bk.tenant, 'Booking '+String(status).toUpperCase(), 'Your booking for "'+(bk.property?bk.property.title:'a property')+'" has been '+status+'.', status==='approved'?'success':'info');
  if(status==='approved' && bk.property && bk.property.agentId){
    try{
      const Commission = require('../models/Commission');
      const exists = await Commission.findOne({ booking: bk._id });
      if(!exists){
        const pct = 2;
        const amt = Math.round(Number(bk.property.price||0) * pct / 100);
        await Commission.create({ agentId: bk.property.agentId, property: bk.property._id, booking: bk._id, amount: amt, percent: pct });
        await notify(bk.property.agentId, 'Commission Earned', 'You earned Rs.'+amt+' ('+pct+'%) commission for "'+bk.property.title+'".', 'success');
      }
    }catch(ce){ console.log('commission hook failed:', ce.message); }
  }
  if(bk.tenant && bk.tenant.email){
    try{
      const ok = status==='approved';
      await sendEmail(bk.tenant.email, ok?'Booking Approved':'Booking Update',
        'Hi '+bk.tenant.fullName+',\n\nYour booking for "'+(bk.property?bk.property.title:'the property')+'" has been '+String(status).toUpperCase()+'.'+(ok?'\n\nOur team will contact you soon.':'')+'\n\n- RealEstate Management System');
    }catch(e){ console.log('Booking email failed:', e.message); }
  }
  res.json({ msg: 'Booking '+status });
});

router.delete('/:id', auth, async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if(!b) return res.status(404).json({ msg: 'Not found' });
  if(String(b.tenant)!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
  if(b.status!=='pending') return res.status(400).json({ msg: 'Only pending bookings can be cancelled' });
  await b.deleteOne();
  res.json({ msg: 'Booking cancelled' });
});

module.exports = router;
