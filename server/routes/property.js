const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req,res)=>{
  try{
    if(!['admin','agent'].includes(rl(req))) return res.status(403).json({msg:'Not allowed'});
    let ownerId = null;
    if(req.body.ownerEmailOrId && req.body.ownerEmailOrId.trim()){
      const ou = await User.findOne({ $or: [{ email: req.body.ownerEmailOrId.trim() }, { uniqueId: req.body.ownerEmailOrId.trim() }] });
      if(ou) ownerId = ou._id;
    }
    const { ownerEmailOrId, ...data } = req.body;
    const p = await Property.create({ ...data, price: Number(data.price), owner: req.user.id, ownerId });
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
  if(!['admin','agent'].includes(rl(req))) return res.status(403).json({msg:'Not allowed'});
  await Property.findByIdAndDelete(req.params.id);
  res.json({msg:'Deleted'});
});
module.exports = router;
