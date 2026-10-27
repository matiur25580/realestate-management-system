const express = require('express');
const router = express.Router();
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
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    const ids = await scopedIds(req);
    const inIds = ids ? { _id: { $in: ids } } : {};
    const inProp = ids ? { property: { $in: ids } } : {};
    const totalProperties = await Property.countDocuments(inIds);
    const pendingBookings = await Booking.countDocuments({ ...inProp, status:'pending' });
    const openMaintenance = await Maintenance.countDocuments({ ...inProp, status: { $ne:'done' } });
    const rentCollected = await Rent.aggregate([ { $match: { status:'paid', ...inProp } }, { $group: { _id: null, total: { $sum: '$amount' } } } ]);
    const activeLeases = await Lease.countDocuments({ status:'active', ...inProp });
    res.json({ totalProperties, pendingBookings, openMaintenance, rentCollected: rentCollected[0]?.total||0, activeLeases });
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/charts', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({message:'Not allowed'});
    const ids = await scopedIds(req);
    const inIds = ids ? { _id: { $in: ids } } : {};
    const inProp = ids ? { property: { $in: ids } } : {};
    const monthlyRent = await Rent.aggregate([
      { $match: { status:'paid', ...inProp } },
      { $group: { _id: '$month', total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);
    const bookingStatus = await Booking.aggregate([ { $match: inProp }, { $group: { _id: '$status', count: { $sum: 1 } } } ]);
    const propertyTypes = await Property.aggregate([ { $match: inIds }, { $group: { _id: '$type', count: { $sum: 1 } } } ]);
    res.json({
      monthlyRent: monthlyRent.map(x=>({ month: x._id, total: x.total })),
      bookingStatus: bookingStatus.map(x=>({ status: x._id||'pending', count: x.count })),
      propertyTypes: propertyTypes.map(x=>({ type: x._id||'Flat', count: x.count }))
    });
  }catch(e){ res.status(500).json({message:e.message}); }
});

module.exports = router;
