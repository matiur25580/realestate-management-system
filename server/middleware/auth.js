const jwt = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async (req,res,next)=>{
  try{
    const h = req.header('Authorization')||'';
    const token = h.replace('Bearer ','');
    if(!token) return res.status(401).json({msg:'No token'});
    const d = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(d.id || d._id).select('-password');
    if(!u) return res.status(401).json({msg:'User not found'});
    if(u.isActive===false) return res.status(403).json({msg:'Account deactivated. Contact admin.'});
    req.user = { id: u._id.toString(), role: u.role, email: u.email, fullName: u.fullName };
    next();
  }catch(e){ return res.status(401).json({msg:'Invalid token'}); }
};
