const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const rl = (req)=> (req.user.role||'').toLowerCase();

router.post('/', auth, async (req, res) => {
  const { propertyId, issue } = req.body;
  const m = await Maintenance.create({ property: propertyId, tenant: req.user.id, issue });
  res.json({ msg: 'Maintenance request created', m });
});

router.get('/my', auth, async (req, res) => {
  const list = await Maintenance.find({ tenant: req.user.id }).populate('property');
  res.json(list);
});

router.get('/all', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner','maintenance'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  let q = {};
  if(r==='owner' || r==='agent'){
    const pq = r==='owner'
      ? { $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }
      : { agentId: req.user.id };
    const props = await Property.find(pq).select('_id');
    q.property = { $in: props.map(p=>p._id) };
  }
  const list = await Maintenance.find(q).populate('property').populate('tenant','fullName contactNumber');
  res.json(list);
});

router.put('/:id', auth, async (req, res) => {
  const r = rl(req);
  if(!['admin','agent','owner','maintenance','tenant'].includes(r)) return res.status(403).json({ msg: 'Not allowed' });
  const m = await Maintenance.findById(req.params.id).populate('property').populate('tenant','fullName email');
  if(!m) return res.status(404).json({ msg: 'Not found' });
  if(r==='tenant'){
    const tid = m.tenant && m.tenant._id ? String(m.tenant._id) : String(m.tenant);
    if(tid!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
    if(m.status!=='pending') return res.status(400).json({ msg: 'Only pending requests can be edited' });
    if(req.body.issue) m.issue = req.body.issue;
    await m.save();
    return res.json({ msg: 'Request updated' });
  }
  if(r==='agent' && String(m.property?.agentId)!==String(req.user.id)) return res.status(403).json({ msg: 'Not allowed' });
  if(r==='owner'){
    const own = m.property && (String(m.property.ownerId)===String(req.user.id) || String(m.property.owner)===String(req.user.id));
    if(!own) return res.status(403).json({ msg: 'Not allowed' });
  }
  if(req.body.status) m.status = req.body.status;
  if(req.body.note !== undefined) m.note = req.body.note;
  await m.save();
  if(m.tenant && m.tenant.email && req.body.status){
    try{
      await sendEmail(m.tenant.email, 'Maintenance Update: '+req.body.status,
        'Hi '+m.tenant.fullName+',\n\nYour maintenance request "'+m.issue+'" is now: '+String(req.body.status).toUpperCase()+'.'+(m.note?'\nWork note: '+m.note:'')+'\n\n- RealEstate Management System');
    }catch(e){ console.log('Maintenance email failed:', e.message); }
  }
  res.json({ msg: 'Updated' });
});

router.delete('/:id', auth, async (req, res) => {
  const r = rl(req);
  const m = await Maintenance.findById(req.params.id);
  if(!m) return res.status(404).json({ msg: 'Not found' });
  const ownPending = String(m.tenant)===String(req.user.id) && m.status==='pending';
  if(r==='admin' || (r==='tenant' && ownPending)){
    await m.deleteOne();
    return res.json({ msg: 'Deleted' });
  }
  return res.status(403).json({ msg: 'Not allowed' });
});

module.exports = router;
