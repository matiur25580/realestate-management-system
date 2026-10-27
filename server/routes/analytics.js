const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Maintenance = require('../models/Maintenance');
const Rent = require('../models/Rent');
const Lease = require('../models/Lease');
const auth = require('../middleware/auth');
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

router.get('/summary', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner','tenant'].includes(r)) return res.status(403).json({message:'Not allowed'});
    if(r==='tenant'){
      const tm = { tenant: new mongoose.Types.ObjectId(req.user.id) };
      const bookings = await Booking.countDocuments(tm);
      const pendingBookings = await Booking.countDocuments({ ...tm, status:'pending' });
      const maintenance = await Maintenance.countDocuments(tm);
      const openMaint = await Maintenance.countDocuments({ ...tm, status:{ $ne:'done' } });
      const due = await Rent.aggregate([ { $match:{ ...tm, status:{ $in:['pending','overdue'] } } }, { $group:{ _id:null, total:{ $sum:'$amount' } } } ]);
      const paid = await Rent.aggregate([ { $match:{ ...tm, status:'paid' } }, { $group:{ _id:null, total:{ $sum:'$amount' } } } ]);
      const activeLeases = await Lease.countDocuments({ ...tm, status:'active' });
      return res.json({ bookings, pendingBookings, maintenance, openMaint, pendingAmount: due[0]?.total||0, collectedAmount: paid[0]?.total||0, activeLeases });
    }
    const ids = await scopedIds(req);
    const inIds = ids ? { _id:{ $in: ids } } : {};
    const inProp = ids ? { property:{ $in: ids } } : {};
    const properties = await Property.countDocuments(inIds);
    const bookings = await Booking.countDocuments(inProp);
    const pendingBookings = await Booking.countDocuments({ ...inProp, status:'pending' });
    const maintenance = await Maintenance.countDocuments(inProp);
    const openMaint = await Maintenance.countDocuments({ ...inProp, status:{ $ne:'done' } });
    const due = await Rent.aggregate([ { $match:{ ...inProp, status:{ $in:['pending','overdue'] } } }, { $group:{ _id:null, total:{ $sum:'$amount' } } } ]);
    const paid = await Rent.aggregate([ { $match:{ ...inProp, status:'paid' } }, { $group:{ _id:null, total:{ $sum:'$amount' } } } ]);
    const activeLeases = await Lease.countDocuments({ status:'active', ...inProp });
    res.json({ properties, bookings, pendingBookings, maintenance, openMaint, pendingAmount: due[0]?.total||0, collectedAmount: paid[0]?.total||0, activeLeases });
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/charts', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    const ids = await scopedIds(req);
    const inIds = ids ? { _id:{ $in: ids } } : {};
    const inProp = ids ? { property:{ $in: ids } } : {};
    const monthly = await Rent.aggregate([
      { $match:{ status:'paid', ...inProp } },
      { $group:{ _id:'$month', total:{ $sum:'$amount' } } },
      { $sort:{ _id:1 } }
    ]);
    const bStatus = await Booking.aggregate([ { $match: inProp }, { $group:{ _id:'$status', count:{ $sum:1 } } } ]);
    const pTypes = await Property.aggregate([ { $match: inIds }, { $group:{ _id:'$type', count:{ $sum:1 } } } ]);
    res.json({
      monthlyData: monthly.map(x=>({ month: x._id, amount: x.total })),
      bookingData: bStatus.map(x=>({ name: x._id||'pending', value: x.count })),
      typeData: pTypes.map(x=>({ name: x._id||'Flat', value: x.count }))
    });
  }catch(e){ res.status(500).json({message:e.message}); }
});

module.exports = router;
