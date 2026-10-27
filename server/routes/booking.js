const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, message } = req.body;
    const booking = await Booking.create({ property: propertyId, tenant: req.user.id, message });
    res.json({ msg: 'Booking request sent', booking });
  } catch(e){ res.status(500).json({ msg: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  const bookings = await Booking.find({ tenant: req.user.id }).populate('property');
  res.json(bookings);
});

router.get('/all', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  let q = {};
  if(r==='owner'){
    const props = await Property.find({ $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }).select('_id');
    q.property = { $in: props.map(p=>p._id) };
  }
  const bookings = await Booking.find(q).populate('property').populate('tenant','fullName email');
  res.json(bookings);
});

router.put('/:id', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  const { status } = req.body;
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('tenant','fullName email').populate('property','title');
  if(booking && booking.tenant && booking.tenant.email){
    try{
      const ok = status==='approved';
      await sendEmail(booking.tenant.email, ok?'Booking Approved':'Booking Update',
        'Hi '+booking.tenant.fullName+',\n\nYour booking for "'+(booking.property?booking.property.title:'the property')+'" has been '+String(status).toUpperCase()+'.'+(ok?'\n\nOur team will contact you soon.':'')+'\n\n- RealEstate Management System');
    }catch(e){ console.log('Booking email failed:', e.message); }
  }
  res.json({ msg: 'Booking '+status });
});

module.exports = router;
