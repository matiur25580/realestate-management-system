function propertyManagerFilter(user, propertyId) {
  if (!user) return null;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return propertyId ? { _id: propertyId } : {};
  if (role === 'owner') return { ...(propertyId ? { _id: propertyId } : {}), $or: [{ ownerId: user.id }, { owner: user.id }] };
  if (role === 'agent') return { ...(propertyId ? { _id: propertyId } : {}), agentId: user.id };
  return null;
}

module.exports = { propertyManagerFilter };
