// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://palmoni.vercel.app',
  'https://www.palmoni.app',
  'https://palmoni.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Setup CORS headers with domain restriction
 */
export function setupCors(req, res) {
  const origin = req.headers.origin || '';

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.vercel.app')
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

/**
 * Handle OPTIONS preflight request
 * @returns {boolean} true if this was an OPTIONS request (and handled)
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
