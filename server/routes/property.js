const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

const resolveUser = async (emailOrId)=>{
  if(!emailOrId || !String(emailOrId).trim()) return null;
  const v = String(emailOrId).trim();
  return await User.findOne({ $or: [{ email: v }, { uniqueId: v }] });
};

router.post('/', auth, async (req,res)=>{
  try{
    const r = rl(req);
    if(!['admin','agent','owner'].includes(r)) return res.status(403).json({msg:'Not allowed'});
    let ownerId = null, agentId = null;
    if(r==='owner'){
      ownerId = req.user.id;
    } else if(r==='agent'){
      agentId = req.user.id;
      const ou = await resolveUser(req.body.ownerEmailOrId);
      if(ou) ownerId = ou._id;
    } else {
      const ou = await resolveUser(req.body.ownerEmailOrId);
      if(ou) ownerId = ou._id;
      const au = await resolveUser(req.body.agentEmailOrId);
      if(au) agentId = au._id;
    }
    const { ownerEmailOrId, agentEmailOrId, ...data } = req.body;
    const p = await Property.create({ ...data, price: Number(data.price), owner: req.user.id, ownerId, agentId });
    res.json(p);
  }catch(e){ res.status(500).json({msg:e.message}); }
});

router.get('/', async (req,res)=>{
  try{
    const { search='', type='', city='' } = req.query;
    let q = {};
    if(search) q.title = { $regex: search, $options: 'i' };
    if(type) q.type = type;
    if(city) q.city = { $regex: city, $options: 'i' };
    const list = await Property.find(q).sort({createdAt:-1});
    res.json(list);
  }catch(e){ res.status(500).json({msg:e.message}); }
});

router.delete('/:id', auth, async (req,res)=>{
  const r = rl(req);
  const p = await Property.findById(req.params.id);
  if(!p) return res.status(404).json({msg:'Not found'});
  const ok = r==='admin'
    || (r==='agent' && String(p.agentId)===String(req.user.id))
    || (r==='owner' && String(p.ownerId)===String(req.user.id));
  if(!ok) return res.status(403).json({msg:'Not allowed'});
  await p.deleteOne();
  res.json({msg:'Deleted'});
});

router.put('/:id', auth, async (req,res)=>{
  try{
    const r = rl(req);
    const p = await Property.findById(req.params.id);
    if(!p) return res.status(404).json({msg:'Not found'});
    const ok = r==='admin'
      || (r==='agent' && String(p.agentId)===String(req.user.id))
      || (r==='owner' && String(p.ownerId)===String(req.user.id));
    if(!ok) return res.status(403).json({msg:'Not allowed'});
    let ownerId = p.ownerId, agentId = p.agentId;
    if(r==='admin'){
      if(req.body.ownerEmailOrId){
        const ou = await resolveUser(req.body.ownerEmailOrId);
        if(ou) ownerId = ou._id;
      }
      if(req.body.agentEmailOrId){
        const au = await resolveUser(req.body.agentEmailOrId);
        if(au) agentId = au._id;
      }
    }
    const { ownerEmailOrId, agentEmailOrId, ...data } = req.body;
    if(data.price) data.price = Number(data.price);
    Object.assign(p, data, { ownerId, agentId });
    await p.save();
    res.json(p);
  }catch(e){ res.status(500).json({msg:e.message}); }
});
module.exports = router;

