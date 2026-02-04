//auth/cookieAuth.js

export function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

// export middleware
export function cookieAuthBridge(req, _res, next) {
  if (!req.headers.authorization) {
    const access = getCookie(req, "iot_access");
    if (access) {
      req.headers.authorization = `Bearer ${access}`;
      return next();
    }

    const anon = getCookie(req, "iot_anon");
    if (anon) {
      req.headers.authorization = `Bearer ${anon}`;
      return next();
    }
  }
  next();
}

