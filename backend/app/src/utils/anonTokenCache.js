let cached = null;
let exp = 0;

/**
 * Return cached anon token if still valid
 */
export function getCachedAnonToken() {
  if (cached && Date.now() < exp) {
    return cached;
  }
  return null;
}

/**
 * Store anon token with early expiry buffer
 */
export function setCachedAnonToken(token, expiresInSec) {
  cached = token;
  // expire 30s early to avoid edge expiry
  exp = Date.now() + (expiresInSec - 30) * 1000;
}
