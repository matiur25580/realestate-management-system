const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const rl = (req)=> String(req.user?.role||'').toLowerCase();
router.get('/', auth, async (req,res)=>{
  try{
    if(rl(req)!=='admin') return res.status(403).json({msg:'Not allowed'});
    const q = {};
    if(req.query.action) q.action = req.query.action;
    if(req.query.role) q.userRole = req.query.role;
    res.json(await AuditLog.find(q).sort({createdAt:-1}).limit(200));
  }catch(e){ res.status(500).json({msg:e.message}); }
});
router.get('/actions', auth, async (req,res)=>{
  try{
    if(rl(req)!=='admin') return res.status(403).json({msg:'Not allowed'});
    res.json(await AuditLog.distinct('action'));
  }catch(e){ res.status(500).json({msg:e.message}); }
});
module.exports = router;
