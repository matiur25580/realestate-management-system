const AuditLog = require('../models/AuditLog');
async function logAudit(req, action, details){
  try{
    await AuditLog.create({
      userId: req.user?.id || null,
      userName: req.user?.fullName || 'System',
      userRole: req.user?.role || 'system',
      action, details: details || ''
    });
  }catch(e){ console.error('Audit failed:', e.message); }
}
module.exports = { logAudit };
