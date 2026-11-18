function parseAllowedOrigins(value, nodeEnv = process.env.NODE_ENV) {
  const entries = typeof value === 'string'
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  if (entries.includes('*')) {
    throw new Error('CLIENT_URL must list explicit origins; wildcard origins are not allowed.');
  }

  if (entries.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('CLIENT_URL must be configured with at least one trusted frontend origin in production.');
    }
    return ['http://localhost:5173'];
  }

  const origins = entries.map((entry) => {
    let parsed;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error('CLIENT_URL entries must be valid absolute HTTP(S) origins.');
    }
    const normalized = entry.replace(/\/$/, '');
    if (!['http:', 'https:'].includes(parsed.protocol)
      || parsed.origin !== normalized
      || parsed.username || parsed.password || parsed.pathname !== '/'
      || parsed.search || parsed.hash) {
      throw new Error('CLIENT_URL entries must be plain HTTP(S) origins without paths or credentials.');
    }
    return parsed.origin;
  });

  return [...new Set(origins)];
}

function isAllowedOrigin(origin, allowedOrigins) {
  return origin === undefined || allowedOrigins.includes(origin);
}

module.exports = { parseAllowedOrigins, isAllowedOrigin };
