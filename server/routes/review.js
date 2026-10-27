const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req,res)=>{
  try{
    if(rl(req)!=='tenant') return res.status(403).json({message:'Only tenants can review'});
    const { propertyId, rating, comment } = req.body;
    const r = parseInt(rating);
    if(!r || r<1 || r>5) return res.status(400).json({message:'Rating must be 1-5'});
    let rev = await Review.findOne({ property: propertyId, tenant: req.user.id });
    if(rev){ rev.rating = r; rev.comment = comment||''; await rev.save(); }
    else rev = await Review.create({ property: propertyId, tenant: req.user.id, rating: r, comment: comment||'' });
    res.json(rev);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/summary', async (req,res)=>{
  const agg = await Review.aggregate([ { $group: { _id: '$property', avg: { $avg: '$rating' }, count: { $sum: 1 } } } ]);
  const map = {};
  agg.forEach(a=>{ map[a._id] = { avg: a.avg.toFixed(1), count: a.count }; });
  res.json(map);
});

router.get('/property/:id', async (req,res)=>{
  const list = await Review.find({ property: req.params.id }).populate('tenant','fullName').sort({createdAt:-1});
  res.json({ reviews: list });
});

router.delete('/:id', auth, async (req,res)=>{
  const rev = await Review.findById(req.params.id);
  if(!rev) return res.status(404).json({message:'Not found'});
  const r = rl(req);
  if(!['admin','agent'].includes(r) && String(rev.tenant)!==String(req.user.id)) return res.status(403).json({message:'Not allowed'});
  await rev.deleteOne();
  res.json({message:'Deleted'});
});

module.exports = router;
