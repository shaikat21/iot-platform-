//src/utils/meCache.js

import crypto from "crypto";

const TTL = 5 * 60 * 1000; // 5 minutes
const store = new Map();

function key(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getCachedMe(token) {
  const k = key(token);
  const v = store.get(k);
  if (!v) return null;
  if (Date.now() > v.exp) {
    store.delete(k);
    return null;
  }
  return v.data;
}

export function setCachedMe(token, data) {
  store.set(key(token), {
    exp: Date.now() + TTL,
    data
  });
}
