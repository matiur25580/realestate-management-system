const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const auth = require('../middleware/auth');

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
  if(!['admin','agent'].includes(req.user.role)) return res.status(403).json({ msg: 'Not allowed' });
  const list = await Maintenance.find().populate('property').populate('tenant','fullName');
  res.json(list);
});

router.put('/:id', auth, async (req, res) => {
  if(!['admin','agent'].includes(req.user.role)) return res.status(403).json({ msg: 'Not allowed' });
  await Maintenance.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({ msg: 'Updated' });
});

module.exports = router;
