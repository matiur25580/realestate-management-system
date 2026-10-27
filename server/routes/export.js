const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Rent = require('../models/Rent');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

const toCSV = (rows)=> rows.map(r=>r.map(v=>{
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}).join(',')).join('\n');

const sendCSV = (res, name, rows)=>{
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename='+name+'.csv');
  res.send(toCSV(rows));
};

router.get('/properties', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  const list = await Property.find().sort({createdAt:-1});
  const rows = [['Title','Type','Price','Area','Address','City','Created']];
  list.forEach(p=>rows.push([p.title,p.type,p.price,p.area,p.address,p.city,new Date(p.createdAt).toLocaleDateString()]));
  sendCSV(res,'properties',rows);
});

router.get('/bookings', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  const list = await Booking.find().populate('property','title').populate('tenant','fullName email').sort({createdAt:-1});
  const rows = [['Property','Tenant','Email','Message','Visit Date','Status','Created']];
  list.forEach(b=>rows.push([b.property?.title||'',b.tenant?.fullName||'',b.tenant?.email||'',b.message||'',b.visitDate?new Date(b.visitDate).toLocaleDateString():'',b.status,new Date(b.createdAt).toLocaleDateString()]));
  sendCSV(res,'bookings',rows);
});

router.get('/rents', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({message:'Not allowed'});
  const list = await Rent.find().populate('property','title').populate('tenant','fullName email').sort({createdAt:-1});
  const rows = [['Property','Tenant','Email','Amount','Month','Status','Paid At']];
  list.forEach(r=>rows.push([r.property?.title||'',r.tenant?.fullName||'',r.tenant?.email||'',r.amount,r.month,r.status,r.paidAt?new Date(r.paidAt).toLocaleDateString():'']));
  sendCSV(res,'rents',rows);
});

module.exports = router;
