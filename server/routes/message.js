const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const Message = require('../models/Message');
const User = require('../models/User');

// users list (for compose dropdown)
router.get('/users', auth, async (req,res)=>{
  try{
    const users = await User.find({ _id: { $ne: req.user.id }, isActive: { $ne: false } })
      .select('fullName email role').sort({ role: 1, fullName: 1 }).limit(200);
    res.json(users);
  }catch(e){ res.status(500).json({msg:e.message}); }
});
// send
router.post('/', auth, async (req,res)=>{
  try{
    const { receiverId, subject, body } = req.body;
    if(!receiverId || !body) return res.status(400).json({msg:'Receiver and message required'});
    const m = await Message.create({ sender: req.user.id, receiver: receiverId, subject: subject||'', body });
    await notify(receiverId, 'New Message', (req.user.fullName||'Someone')+': '+(subject||body.slice(0,60)), 'info');
    logAudit(req,'Message Sent','To user '+receiverId);
    res.json(m);
  }catch(e){ res.status(500).json({msg:e.message}); }
});
// inbox
router.get('/inbox', auth, async (req,res)=>{
  try{
    res.json(await Message.find({ receiver: req.user.id }).populate('sender','fullName email role').sort({createdAt:-1}).limit(100));
  }catch(e){ res.status(500).json({msg:e.message}); }
});
// sent
router.get('/sent', auth, async (req,res)=>{
  try{
    res.json(await Message.find({ sender: req.user.id }).populate('receiver','fullName email role').sort({createdAt:-1}).limit(100));
  }catch(e){ res.status(500).json({msg:e.message}); }
});
// unread count
router.get('/unread-count', auth, async (req,res)=>{
  try{ res.json({ count: await Message.countDocuments({ receiver: req.user.id, read: false }) }); }
  catch(e){ res.status(500).json({msg:e.message}); }
});
// mark read
router.put('/:id/read', auth, async (req,res)=>{
  try{
    const m = await Message.findById(req.params.id);
    if(!m) return res.status(404).json({msg:'Not found'});
    if(String(m.receiver)!==String(req.user.id)) return res.status(403).json({msg:'Not allowed'});
    m.read = true; await m.save(); res.json(m);
  }catch(e){ res.status(500).json({msg:e.message}); }
});
module.exports = router;
