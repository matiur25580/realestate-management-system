function generateUniqueId(role, fullName, dob) {
  // dob format DDMMYYYY
  const r = role.charAt(0).toUpperCase();
  const parts = fullName.trim().split(' ');
  const n = parts[0].charAt(0).toUpperCase();
  const s = parts.length > 1 ? parts[parts.length-1].charAt(0).toUpperCase() : 'X';
  return `RE${r}${n}${s}${dob}`;
}
module.exports = generateUniqueId;
