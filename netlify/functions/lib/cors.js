/**
 * CORS Headers Helper
 * Provides consistent CORS headers across all functions.
 * Uses SITE_URL in production, allows all origins in development.
 */

function getCorsHeaders(methods = 'GET, OPTIONS') {
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.SITE_URL || '*')
    : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': methods,
    'Content-Type': 'application/json'
  };
}

/**
 * Handle OPTIONS preflight request
 */
function handleOptions(headers) {
  return {
    statusCode: 200,
    headers,
    body: ''
  };
}

module.exports = {
  getCorsHeaders,
  handleOptions
};
