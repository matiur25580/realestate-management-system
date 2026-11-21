const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Rent = require('../models/Rent');
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const notify = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');
const { canManageProperty, canAccessRent } = require('../utils/ownership');
const rl = (req) => String(req.user.role || '').toLowerCase();

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
    const { propertyId, tenantEmailOrId, month } = req.body || {};
    if (!mongoose.isValidObjectId(propertyId) || typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'Select a valid property and rent month (YYYY-MM).' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (!canManageProperty(req.user, property)) return res.status(403).json({ message: 'You cannot record rent for this property.' });

    const tenantLookup = typeof tenantEmailOrId === 'string' ? tenantEmailOrId.trim() : '';
    if (!tenantLookup) return res.status(400).json({ message: 'Select a tenant.' });
    const tenant = await User.findOne({
      $or: [{ email: tenantLookup.toLowerCase() }, { uniqueId: tenantLookup.toUpperCase() }],
      role: 'Tenant',
      isActive: { $ne: false }
    }).select('_id fullName email');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found.' });

    const lease = await Lease.findOne({ property: property._id, tenant: tenant._id, status: 'active' });
    if (!lease) return res.status(400).json({ message: 'An active lease is required before rent can be recorded.' });
    const monthStart = new Date(month + '-01T00:00:00.000Z');
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    if (lease.endDate < monthStart || lease.startDate >= monthEnd) {
      return res.status(400).json({ message: 'The selected month is outside the active lease period.' });
    }
    const exists = await Rent.exists({ property: property._id, tenant: tenant._id, month });
    if (exists) return res.status(409).json({ message: 'Rent for this tenant and month already exists.' });

    const amount = Number(lease.monthlyRent);
    const record = await Rent.create({ property: property._id, tenant: tenant._id, amount, month });
    logAudit(req, 'Rent Recorded', '₹' + amount + ' for ' + month);
    try {
      await sendEmail(tenant.email, 'Rent Due - ' + month,
        'Hi ' + tenant.fullName + ',\n\nRent of Rs.' + amount + ' for ' + month + ' (' + property.title + ') is due.\nPlease contact the property manager to arrange payment.\n\n- RealEstate Management System');
    } catch (error) {
      console.log('Rent due email failed:', error.message);
    }
    await notify(tenant._id, 'Rent Due - ' + month, 'Rent of Rs.' + amount + ' for ' + month + ' is due. Please contact the property manager to arrange payment.', 'warning');
    return res.status(201).json(record);
  } catch (error) {
    return res.status(500).json({ message: 'Could not record rent.' });
  }
});

router.get('/my', auth, async (req, res) => {
  if (rl(req) !== 'tenant') return res.status(403).json({ message: 'Not allowed' });
  const list = await Rent.find({ tenant: req.user.id }).populate('property', 'title city').sort({ createdAt: -1 });
  res.json(list);
});

router.get('/all', auth, async (req, res) => {
  const role = rl(req);
  if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ message: 'Not allowed' });
  const ids = await scopedIds(req);
  const query = ids ? { property: { $in: ids } } : {};
  const list = await Rent.find(query).populate('property', 'title city').populate('tenant', 'fullName email').sort({ createdAt: -1 });
  res.json(list);
});

router.get('/:id/receipt', auth, async (req, res) => {
  try {
    const rent = await Rent.findById(req.params.id).populate('property').populate('tenant', 'fullName email uniqueId');
    if (!rent) return res.status(404).json({ message: 'Not found' });
    if (!canAccessRent(req.user, rent)) return res.status(403).json({ message: 'Not allowed' });
    if (rent.status !== 'paid') return res.status(400).json({ message: 'Receipt only for paid rents' });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rent-receipt-' + String(rent.month).replace(/[^0-9-]/g, '') + '.pdf');
    doc.pipe(res);
    doc.fontSize(20).text('RENT PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Receipt No: ' + rent._id);
    doc.text('Date: ' + (rent.paidAt ? new Date(rent.paidAt).toLocaleDateString() : new Date().toLocaleDateString()));
    doc.moveDown();
    doc.text('Tenant: ' + (rent.tenant?.fullName || '') + ' (' + (rent.tenant?.email || '') + ')');
    doc.text('Tenant ID: ' + (rent.tenant?.uniqueId || ''));
    doc.text('Property: ' + (rent.property?.title || '') + ', ' + (rent.property?.city || ''));
    doc.text('Rent Month: ' + rent.month);
    doc.moveDown();
    doc.fontSize(16).text('Amount Paid: Rs.' + rent.amount, { align: 'right' });
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your payment!', { align: 'center' });
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Could not generate rent receipt.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) {
      return res.status(403).json({ message: 'Rent payment status must be confirmed by the property manager.' });
    }
    const { status } = req.body || {};
    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ message: 'Invalid rent status.' });
    }
    const rent = await Rent.findById(req.params.id).populate('property');
    if (!rent) return res.status(404).json({ message: 'Not found' });
    if (!canAccessRent(req.user, rent)) return res.status(403).json({ message: 'Not allowed' });
    if (rent.status === 'paid' && status !== 'paid') {
      return res.status(409).json({ message: 'A paid rent record cannot be reverted.' });
    }
    rent.status = status;
    if (status === 'paid') rent.paidAt = rent.paidAt || new Date();
    await rent.save();
    logAudit(req, 'Rent ' + status, '₹' + rent.amount + ' for ' + rent.month);

    if (status === 'paid') {
      try {
        const full = await Rent.findById(rent._id).populate('tenant', 'fullName email').populate('property', 'title');
        if (full?.tenant?.email) {
          await sendEmail(full.tenant.email, 'Rent Payment Confirmed',
            'Hi ' + full.tenant.fullName + ',\n\nYour rent payment of Rs.' + full.amount + ' for ' + full.month + ' (' + (full.property?.title || '') + ') has been confirmed by the property manager.\n\n- RealEstate Management System');
        }
        await notify(rent.tenant, 'Rent Payment Confirmed', 'Your rent payment for ' + rent.month + ' has been confirmed.', 'success');
      } catch (error) {
        console.log('Rent payment confirmation notification failed:', error.message);
      }
    }
    return res.json({ message: 'Rent updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update rent.' });
  }
});

module.exports = router;
