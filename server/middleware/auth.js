const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Resolves the current account from a verified JWT so route handlers use database-backed roles and status.
module.exports = async (req, res, next) => {
  try {
    const authorization = req.header('Authorization') || '';
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) return res.status(401).json({ msg: 'Authentication required.' });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(503).json({ msg: 'Authentication is temporarily unavailable.' });
    }

    const payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const userId = payload.id || payload._id;
    if (!userId) return res.status(401).json({ msg: 'Invalid token.' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ msg: 'Invalid token.' });
    if (user.isActive === false) return res.status(403).json({ msg: 'Account deactivated. Contact an administrator.' });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ msg: 'Invalid or expired token.' });
  }
};
