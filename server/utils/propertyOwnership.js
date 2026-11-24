function isPropertyOwner(property, userId) {
  if (!property || userId === undefined || userId === null) return false;
  const id = String(userId);
  return [property.ownerId, property.owner]
    .some(ownerId => ownerId !== undefined && ownerId !== null && String(ownerId) === id);
}

module.exports = { isPropertyOwner };
