const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Maintenance = require('../models/Maintenance');
const Rent = require('../models/Rent');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req,res)=>{
  try{
    const r = (req.user.role||'').toLowerCase();
    let propQuery = {};
    if(r==='owner') propQuery = { $or: [{ ownerId: req.user.id }, { owner: req.user.id }] };
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
    const properties = await Property.countDocuments(propQuery);
    let propIds = null;
    if(r==='owner'){
      const props = await Property.find(propQuery).select('_id');
      propIds = props.map(p=>p._id);
    }
    const bq = propIds ? { property: { $in: propIds } } : {};
    const mq = propIds ? { property: { $in: propIds } } : {};
    const rq = propIds ? { property: { $in: propIds } } : {};
    const bookings = await Booking.countDocuments(bq);
    const pendingBookings = await Booking.countDocuments({ ...bq, status: { $nin: ['approved','rejected'] } });
    const maintenance = await Maintenance.countDocuments(mq);
    const openMaint = await Maintenance.countDocuments({ ...mq, status: { $nin: ['done'] } });
    const pendingRents = await Rent.find({ ...rq, status: { $ne: 'paid' } });
    const paidRents = await Rent.find({ ...rq, status: 'paid' });
    const pendingAmount = pendingRents.reduce((s,x)=> s+(x.amount||0), 0);
    const collectedAmount = paidRents.reduce((s,x)=> s+(x.amount||0), 0);
    res.json({ properties, bookings, pendingBookings, maintenance, openMaint, pendingAmount, collectedAmount });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

router.get('/charts', auth, async (req,res)=>{
  try{
    const r = (req.user.role||'').toLowerCase();
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({ message: 'Not allowed' });
    let propIds = null;
    if(r==='owner'){
      const props = await Property.find({ $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }).select('_id');
      propIds = props.map(p=>p._id);
    }
    const rq = propIds ? { property: { $in: propIds } } : {};
    const bq = propIds ? { property: { $in: propIds } } : {};
    const paid = await Rent.find({ ...rq, status: 'paid' });
    const monthly = {};
    paid.forEach(x=>{
      const m = x.month || (x.paidAt ? new Date(x.paidAt).toISOString().slice(0,7) : 'unknown');
      monthly[m] = (monthly[m]||0) + (x.amount||0);
    });
    const monthlyData = Object.keys(monthly).sort().slice(-6).map(m=>({ month: m, amount: monthly[m] }));
    const bookings = await Booking.find(bq);
    const bStatus = {};
    bookings.forEach(b=>{ const s = b.status||'pending'; bStatus[s]=(bStatus[s]||0)+1; });
    const bookingData = Object.keys(bStatus).map(s=>({ name: s, value: bStatus[s] }));
    const typeQ = propIds ? { _id: { $in: propIds } } : {};
    const pTypes = await Property.aggregate([ { $match: typeQ }, { $group: { _id: '$type', count: { $sum: 1 } } } ]);
    const typeData = pTypes.map(t=>({ name: t._id||'Other', value: t.count }));
    res.json({ monthlyData, bookingData, typeData });
  }catch(e){ res.status(500).json({ message: e.message }); }
});

module.exports = router;
