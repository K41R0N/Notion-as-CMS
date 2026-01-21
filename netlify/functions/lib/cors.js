/**
 * CORS Headers Helper
 * Provides consistent CORS headers across all functions.
 * In production: requires SITE_URL to be set (fails closed for security)
 * In development: allows all origins
 */

function getCorsHeaders(methods = 'GET, OPTIONS') {
  let allowedOrigin = '*';

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SITE_URL) {
      throw new Error('SITE_URL environment variable must be set in production for CORS security');
    }
    // Normalize origin by extracting just the origin part (protocol + host)
    try {
      const siteUrl = new URL(process.env.SITE_URL);
      allowedOrigin = siteUrl.origin;
    } catch {
      // If URL parsing fails, use the raw value but strip trailing slash
      allowedOrigin = process.env.SITE_URL.replace(/\/+$/, '');
    }
  }

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
