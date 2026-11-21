const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { canManageProperty } = require('../utils/ownership');
const rl = (req) => (req.user.role || '').toLowerCase();
const editableFields = ['title', 'type', 'price', 'area', 'address', 'city', 'image', 'images'];

const resolveUser = async (emailOrId, role) => {
  if (!emailOrId || !String(emailOrId).trim()) return null;
  const value = String(emailOrId).trim();
  return User.findOne({
    $or: [{ email: value.toLowerCase() }, { uniqueId: value.toUpperCase() }],
    role
  }).select('_id');
};

function pickPropertyFields(input) {
  const result = {};
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) result[field] = input[field];
  }
  if (result.price !== undefined) {
    const price = Number(result.price);
    if (!Number.isFinite(price) || price <= 0) return { error: 'Price must be a positive number.' };
    result.price = price;
  }
  if (result.title !== undefined && (typeof result.title !== 'string' || !result.title.trim() || result.title.trim().length > 160)) {
    return { error: 'Title must be between 1 and 160 characters.' };
  }
  if (result.type !== undefined && !['Flat', 'House', 'Office', 'Shop'].includes(result.type)) {
    return { error: 'Choose a supported property type.' };
  }
  for (const field of ['area', 'address', 'city']) {
    if (result[field] !== undefined && (typeof result[field] !== 'string' || !result[field].trim() || result[field].trim().length > 300)) {
      return { error: field + ' must be a non-empty string.' };
    }
  }
  if (result.images !== undefined && (!Array.isArray(result.images) || result.images.length > 20 || result.images.some((value) => typeof value !== 'string' || value.length > 2048))) {
    return { error: 'Images must be a list of at most 20 valid image references.' };
  }
  return { data: result };
}

router.post('/', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ msg: 'Not allowed' });

    const validation = pickPropertyFields(req.body || {});
    if (validation.error) return res.status(400).json({ msg: validation.error });
    const data = validation.data;
    if (!data.title || !data.type || !data.price || !data.area || !data.address || !data.city) {
      return res.status(400).json({ msg: 'Title, type, price, area, address, and city are required.' });
    }

    let ownerId = null;
    let agentId = null;
    if (role === 'owner') {
      ownerId = req.user.id;
    } else if (role === 'agent') {
      agentId = req.user.id;
      const owner = await resolveUser(req.body.ownerEmailOrId, 'Owner');
      if (!owner) return res.status(400).json({ msg: 'Select a valid property owner.' });
      ownerId = owner._id;
    } else {
      if (req.body.ownerEmailOrId) {
        const owner = await resolveUser(req.body.ownerEmailOrId, 'Owner');
        if (!owner) return res.status(400).json({ msg: 'Select a valid property owner.' });
        ownerId = owner._id;
      }
      if (req.body.agentEmailOrId) {
        const agent = await resolveUser(req.body.agentEmailOrId, 'Agent');
        if (!agent) return res.status(400).json({ msg: 'Select a valid property agent.' });
        agentId = agent._id;
      }
    }

    const property = await Property.create({
      ...data,
      owner: req.user.id,
      ownerId,
      agentId,
      status: role === 'admin' ? 'approved' : 'pending'
    });
    logAudit(req, 'Property Created', '"' + property.title + '" added');
    return res.status(201).json(property);
  } catch (error) {
    return res.status(400).json({ msg: 'Could not create property with the supplied details.' });
  }
});

router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (rl(req) !== 'admin') return res.status(403).json({ msg: 'Not allowed' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ msg: 'Not found' });
    property.status = 'approved';
    await property.save();
    const notify = require('../utils/notify');
    logAudit(req, 'Property Approved', '"' + property.title + '" approved');
    await notify(property.ownerId || property.owner, 'Property Approved', 'Your property "' + property.title + '" is approved and now live.', 'success');
    return res.json(property);
  } catch (error) {
    return res.status(500).json({ msg: 'Could not approve property.' });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    if (rl(req) !== 'admin') return res.status(403).json({ msg: 'Not allowed' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ msg: 'Not found' });
    property.status = 'rejected';
    await property.save();
    const notify = require('../utils/notify');
    logAudit(req, 'Property Rejected', '"' + property.title + '" rejected');
    await notify(property.ownerId || property.owner, 'Property Rejected', 'Your property "' + property.title + '" was rejected. Please contact admin.', 'warning');
    return res.json(property);
  } catch (error) {
    return res.status(500).json({ msg: 'Could not reject property.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search = '', type = '', city = '' } = req.query;
    const query = { status: 'approved' };
    if (typeof search === 'string' && search.trim()) query.title = { $regex: search.trim().slice(0, 80), $options: 'i' };
    if (typeof type === 'string' && type) query.type = type;
    if (typeof city === 'string' && city.trim()) query.city = { $regex: city.trim().slice(0, 80), $options: 'i' };
    const list = await Property.find(query).sort({ createdAt: -1 }).limit(200);
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ msg: 'Could not load properties.' });
  }
});

router.get('/managed', auth, async (req, res) => {
  try {
    const role = rl(req);
    if (!['admin', 'agent', 'owner'].includes(role)) return res.status(403).json({ msg: 'Not allowed' });
    const query = role === 'admin'
      ? {}
      : role === 'agent'
        ? { agentId: req.user.id }
        : { $or: [{ ownerId: req.user.id }, { owner: req.user.id }] };
    if (typeof req.query.search === 'string' && req.query.search.trim()) query.title = { $regex: req.query.search.trim().slice(0, 80), $options: 'i' };
    if (typeof req.query.type === 'string' && req.query.type) query.type = req.query.type;
    if (typeof req.query.city === 'string' && req.query.city.trim()) query.city = { $regex: req.query.city.trim().slice(0, 80), $options: 'i' };
    const list = await Property.find(query).sort({ createdAt: -1 }).limit(500);
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ msg: 'Could not load managed properties.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ msg: 'Not found' });
    if (!canManageProperty(req.user, property)) return res.status(403).json({ msg: 'Not allowed' });
    await property.deleteOne();
    logAudit(req, 'Property Deleted', '"' + property.title + '" removed');
    return res.json({ msg: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ msg: 'Could not delete property.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ msg: 'Not found' });
    if (!canManageProperty(req.user, property)) return res.status(403).json({ msg: 'Not allowed' });

    const role = rl(req);
    if (role !== 'admin' && (Object.prototype.hasOwnProperty.call(req.body || {}, 'status')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'owner')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'ownerId')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'agentId')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'ownerEmailOrId')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'agentEmailOrId'))) {
      return res.status(403).json({ msg: 'Only administrators can change property approval or ownership.' });
    }

    const validation = pickPropertyFields(req.body || {});
    if (validation.error) return res.status(400).json({ msg: validation.error });
    if (!Object.keys(validation.data).length && role !== 'admin') {
      return res.status(400).json({ msg: 'Provide valid property fields to update.' });
    }
    Object.assign(property, validation.data);

    if (role === 'admin') {
      if (req.body.status !== undefined) {
        if (!['pending', 'approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ msg: 'Invalid property status.' });
        property.status = req.body.status;
      }
      if (req.body.ownerEmailOrId) {
        const owner = await resolveUser(req.body.ownerEmailOrId, 'Owner');
        if (!owner) return res.status(400).json({ msg: 'Select a valid property owner.' });
        property.ownerId = owner._id;
      }
      if (req.body.agentEmailOrId) {
        const agent = await resolveUser(req.body.agentEmailOrId, 'Agent');
        if (!agent) return res.status(400).json({ msg: 'Select a valid property agent.' });
        property.agentId = agent._id;
      }
    }
    await property.save();
    logAudit(req, 'Property Updated', '"' + property.title + '" updated');
    return res.json(property);
  } catch (error) {
    return res.status(400).json({ msg: 'Could not update property with the supplied details.' });
  }
});

module.exports = router;
