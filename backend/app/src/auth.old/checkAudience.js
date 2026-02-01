// src/auth/checkAudience.js
export function checkAudience(req, res, next) {
  let aud = req.auth?.aud;  // audience from token
  const expected = process.env.ZITADEL_PROJECT_ID;

  console.log("Token aud:", aud);
  console.log("Expected:", expected);

  if (!aud) {
    return res.status(401).json({
      error: "No audience claim in token",
      expected
    });
  }

  // If aud is a string → convert to array
  if (typeof aud === "string") {
    aud = [aud];
  }

  if (!Array.isArray(aud)) {
    return res.status(401).json({
      error: "Audience not an array",
      received: aud
    });
  }

  if (!aud.includes(expected)) {
    return res.status(401).json({
      error: "Invalid audience",
      expected,
      received: aud
    });
  }

  next();
}

