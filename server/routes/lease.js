const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');
const { canManageProperty, canAccessLease } = require('../utils/ownership');
const rl = (req) => String(req.user.role || '').toLowerCase();

const withComputed = (lease) => {
  const result = lease.toObject();
  const days = Math.ceil((new Date(lease.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  result.daysRemaining = days;
  if (result.status === 'active' && days < 0) result.status = 'expired';
  return result;
};

const scopedIds = async (req) => {
  const role = rl(req);
  if (role === 'admin') return null;
  const query = role === 'owner'
    ? { $or: [{ ownerId: req.user.id }, { owner: req.user.id }] }
    : { agentId: req.user.id };
  const properties = await Property.find(query).select('_id');
  return properties.map((property) => property._id);
};

router.post('/', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ message: 'Not allowed' });
    const { propertyId, tenantEmailOrId, startDate, endDate, monthlyRent, deposit = 0, terms = '' } = req.body || {};
    if (!mongoose.isValidObjectId(propertyId)) return res.status(400).json({ message: 'Select a valid property.' });

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (!canManageProperty(req.user, property)) return res.status(403).json({ message: 'You cannot create a lease for this property.' });
    if (property.status !== 'approved') return res.status(400).json({ message: 'Only approved properties can be leased.' });

    const tenantLookup = typeof tenantEmailOrId === 'string' ? tenantEmailOrId.trim() : '';
    if (!tenantLookup) return res.status(400).json({ message: 'Select a tenant.' });
    const tenant = await User.findOne({
      $or: [{ email: tenantLookup.toLowerCase() }, { uniqueId: tenantLookup.toUpperCase() }],
      role: 'Tenant',
      isActive: { $ne: false }
    }).select('_id fullName email');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found.' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const rent = Number(monthlyRent);
    const securityDeposit = Number(deposit);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start
      || !Number.isFinite(rent) || rent <= 0 || !Number.isFinite(securityDeposit) || securityDeposit < 0
      || typeof terms !== 'string' || terms.length > 5000) {
      return res.status(400).json({ message: 'Provide valid lease dates, rent, deposit, and terms.' });
    }

    const lease = await Lease.create({
      property: property._id,
      tenant: tenant._id,
      startDate: start,
      endDate: end,
      monthlyRent: rent,
      deposit: securityDeposit,
      terms
    });
    logAudit(req, 'Lease Created', '₹' + rent + '/month lease');
    try {
      await sendEmail(tenant.email, 'New Lease Agreement',
        'Hi ' + tenant.fullName + ',\n\nA lease agreement has been created for "' + property.title + '".\nPeriod: ' + start.toISOString().slice(0, 10) + ' to ' + end.toISOString().slice(0, 10) + '\nMonthly Rent: Rs.' + rent + '\nDeposit: Rs.' + securityDeposit + '\n\nPlease check your dashboard.\n\n- RealEstate Management System');
    } catch (error) {
      console.log('Lease email failed:', error.message);
    }
    await notify(tenant._id, 'New Lease Agreement', 'A new lease (' + start.toISOString().slice(0, 10) + ' to ' + end.toISOString().slice(0, 10) + ', Rs.' + rent + '/month) has been created for you. Check your dashboard.', 'success');
    return res.status(201).json(lease);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create lease.' });
  }
});

router.get('/my', auth, async (req, res) => {
  if (rl(req) !== 'tenant') return res.status(403).json({ message: 'Not allowed' });
  const list = await Lease.find({ tenant: req.user.id }).populate('property', 'title city address').sort({ createdAt: -1 });
  res.json(list.map(withComputed));
});

router.get('/all', auth, async (req, res) => {
  const role = rl(req);
  if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ message: 'Not allowed' });
  const ids = await scopedIds(req);
  const query = ids ? { property: { $in: ids } } : {};
  const list = await Lease.find(query).populate('property', 'title city').populate('tenant', 'fullName email').sort({ createdAt: -1 });
  res.json(list.map(withComputed));
});

router.put('/:id', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ message: 'Not allowed' });
    if (!['active', 'expired', 'terminated'].includes(req.body?.status)) {
      return res.status(400).json({ message: 'Invalid lease status.' });
    }
    const lease = await Lease.findById(req.params.id).populate('property');
    if (!lease) return res.status(404).json({ message: 'Lease not found.' });
    if (!canAccessLease(req.user, lease)) return res.status(403).json({ message: 'You cannot update this lease.' });
    lease.status = req.body.status;
    await lease.save();
    logAudit(req, 'Lease ' + lease.status, 'Lease updated for property "' + (lease.property?.title || '') + '".');
    return res.json({ message: 'Lease updated', lease });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update lease.' });
  }
});

module.exports = router;
