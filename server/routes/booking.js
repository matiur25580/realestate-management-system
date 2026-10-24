const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, message } = req.body;
    const booking = await Booking.create({
      property: propertyId,
      tenant: req.user.id,
      message
    });
    res.json({ msg: 'Booking request sent', booking });
  } catch(e){ res.status(500).json({ msg: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  const bookings = await Booking.find({ tenant: req.user.id }).populate('property');
  res.json(bookings);
});

router.get('/all', auth, async (req, res) => {
  if(!['admin','agent'].includes(req.user.role)) return res.status(403).json({ msg: 'Not allowed' });
  const bookings = await Booking.find().populate('property').populate('tenant','fullName email');
  res.json(bookings);
});

router.put('/:id', auth, async (req, res) => {
  if(!['admin','agent'].includes(req.user.role)) return res.status(403).json({ msg: 'Not allowed' });
  const { status } = req.body;
  await Booking.findByIdAndUpdate(req.params.id, { status });
  res.json({ msg: `Booking ${status}` });
});

module.exports = router;
