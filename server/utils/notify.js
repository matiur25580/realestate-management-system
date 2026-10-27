const Notification = require('../models/Notification');
module.exports = async (userId, title, message, type='info')=>{
  if(!userId) return;
  try{ await Notification.create({ userId, title, message, type }); }
  catch(e){ console.log('notify failed:', e.message); }
};
