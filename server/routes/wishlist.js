const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const auth = require('../middleware/auth');

router.post('/', auth, async (req,res)=>{
  try{
    const { propertyId } = req.body;
    const ex = await Wishlist.findOne({ user: req.user.id, property: propertyId });
    if(ex){ await ex.deleteOne(); return res.json({ saved: false }); }
    await Wishlist.create({ user: req.user.id, property: propertyId });
    res.json({ saved: true });
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/my', auth, async (req,res)=>{
  const list = await Wishlist.find({ user: req.user.id }).populate('property');
  res.json(list);
});

module.exports = router;
