const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
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

router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, message = '', visitDate = null } = req.body || {};

    if (typeof propertyId !== 'string' || !mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({ msg: 'A valid propertyId is required.' });
    }
    if (typeof message !== 'string' || message.trim().length > 1000) {
      return res.status(400).json({ msg: 'Message must be 1,000 characters or fewer.' });
    }

    let normalizedVisitDate = null;
    if (visitDate !== null && visitDate !== '') {
      normalizedVisitDate = new Date(visitDate);
      if (Number.isNaN(normalizedVisitDate.getTime()) || normalizedVisitDate.getTime() < Date.now()) {
        return res.status(400).json({ msg: 'Choose a valid future visit date.' });
      }
    }

    const property = await Property.findOne({ _id: propertyId, status: 'approved' })
      .select('_id title owner ownerId');
    if (!property) {
      return res.status(404).json({ msg: 'This property is unavailable for booking.' });
    }

    const isOwner = String(property.ownerId || property.owner || '') === String(req.user.id);
    if (isOwner) {
      return res.status(403).json({ msg: 'You cannot book your own property.' });
    }

    const existingBooking = await Booking.exists({
      property: property._id,
      tenant: req.user.id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingBooking) {
      return res.status(409).json({ msg: 'You already have an active booking for this property.' });
    }

    const booking = await Booking.create({
      property: property._id,
      tenant: req.user.id,
      message: message.trim(),
      visitDate: normalizedVisitDate,
      status: 'pending',
    });

    await logAudit(req, 'Booking Requested', 'Booking request submitted for "' + property.title + '"');
    return res.status(201).json({ msg: 'Booking request sent', booking });
  } catch (error) {
    console.error('Booking creation failed:', error.message);
    return res.status(500).json({ msg: 'Unable to submit your booking request right now.' });
  }
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
  if(!['approved','rejected'].includes(status)) return res.status(400).json({ msg: 'Status must be approved or rejected' });

  const current = await Booking.findById(req.params.id).populate('property').populate('tenant','fullName email');
  if(!current) return res.status(404).json({ msg: 'Not found' });
  if(r==='agent' && String(current.property?.agentId)!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
  if(r==='owner'){
    const own = current.property && (String(current.property.ownerId)===String(req.user.id) || String(current.property.owner)===String(req.user.id));
    if(!own) return res.status(403).json({ msg: 'Not allowed' });
  }

  const bk = await Booking.findOneAndUpdate(
    { _id: current._id, status: 'pending' },
    { $set: { status } },
    { new: true, runValidators: true }
  ).populate('property').populate('tenant','fullName email');
  if(!bk) return res.status(409).json({ msg: 'Booking is no longer pending; refresh and try again' });

  logAudit(req,'Booking '+status,'Booking for "'+(bk.property?bk.property.title:'')+'" '+status);
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
        'Hi '+bk.tenant.fullName+',\\n\\nYour booking for "'+(bk.property?bk.property.title:'the property')+'" has been '+String(status).toUpperCase()+'.'+(ok?'\\n\\nOur team will contact you soon.':'')+'\\n\\n- RealEstate Management System');
    }catch(e){ console.log('Booking email failed:', e.message); }
  }
  res.json({ msg: 'Booking '+status });
});
router.delete('/:id', auth, async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if(!b) return res.status(404).json({ msg: 'Not found' });
  if(String(b.tenant)!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
  if(b.status!=='pending') return res.status(400).json({ msg: 'Only pending bookings can be cancelled' });
  logAudit(req,'Booking Cancelled','Booking cancelled by tenant');
  await b.deleteOne();
  res.json({ msg: 'Booking cancelled' });
});

module.exports = router;
