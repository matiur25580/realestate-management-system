const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.get('/', auth, async (req,res)=>{
  const list = await Notification.find({ userId: req.user.id }).sort({createdAt:-1}).limit(50);
  res.json(list);
});
router.put('/read-all', auth, async (req,res)=>{
  await Notification.updateMany({ userId: req.user.id, isRead:false }, { isRead:true });
  res.json({ msg:'All marked read' });
});
router.put('/:id/read', auth, async (req,res)=>{
  await Notification.findOneAndUpdate({ _id:req.params.id, userId:req.user.id }, { isRead:true });
  res.json({ msg:'Read' });
});
router.post('/broadcast', auth, async (req,res)=>{
  if(rl(req)!=='admin') return res.status(403).json({ msg:'Not allowed' });
  const { title, message, role } = req.body;
  if(!title || !message) return res.status(400).json({ msg:'Title and message required' });
  const q = role ? { role: new RegExp('^'+role+'$','i') } : {};
  const users = await User.find(q).select('_id');
  if(users.length) await Notification.insertMany(users.map(u=>({ userId:u._id, title, message, type:'info' })));
  res.json({ msg:'Broadcast sent to '+users.length+' users' });
});
module.exports = router;
