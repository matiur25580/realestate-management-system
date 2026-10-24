const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const auth = require('../middleware/auth');

router.post('/', auth, async (req,res)=>{
  try{
    if(!['admin','agent'].includes(req.user.role.toLowerCase())) return res.status(403).json({msg:'Not allowed'});
    const p = await Property.create({ ...req.body, owner: req.user.id });
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
  if(!['admin','agent'].includes(req.user.role.toLowerCase())) return res.status(403).json({msg:'Not allowed'});
  await Property.findByIdAndDelete(req.params.id);
  res.json({msg:'Deleted'});
});
module.exports = router;
