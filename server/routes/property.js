const express = require('express');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req,res)=>{
  try{
    const prop = await Property.create({ ...req.body, ownerId: req.user.id });
    res.json(prop);
  }catch(e){ res.status(500).json({ message: e.message }); }
});

router.get('/', async (req,res)=>{
  const list = await Property.find().sort({ createdAt: -1 });
  res.json(list);
});

router.delete('/:id', auth, async (req,res)=>{
  await Property.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
