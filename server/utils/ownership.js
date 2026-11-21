function roleOf(user) {
  return String(user?.role || '').toLowerCase();
}

function canManageProperty(user, property) {
  if (!user || !property) return false;
  const role = roleOf(user);
  if (role === 'admin') return true;
  if (role === 'agent') return String(property.agentId || '') === String(user.id || '');
  if (role === 'owner') {
    return String(property.ownerId || property.owner || '') === String(user.id || '')
      || String(property.owner || '') === String(user.id || '');
  }
  return false;
}

function canAccessLease(user, lease) {
  if (!user || !lease) return false;
  if (roleOf(user) === 'tenant') return String(lease.tenant?._id || lease.tenant || '') === String(user.id || '');
  return canManageProperty(user, lease.property);
}

function canAccessRent(user, rent) {
  if (!user || !rent) return false;
  if (roleOf(user) === 'tenant') return String(rent.tenant?._id || rent.tenant || '') === String(user.id || '');
  return canManageProperty(user, rent.property);
}

module.exports = { roleOf, canManageProperty, canAccessLease, canAccessRent };
