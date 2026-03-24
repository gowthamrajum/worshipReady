/**
 * Add this reCAPTCHA verification middleware to your server.js backend.
 *
 * 1. Set env var: RECAPTCHA_SECRET_KEY=your-secret-key
 * 2. Paste the middleware function below into server.js
 * 3. Add it to the routes you want to protect (see examples at bottom)
 */

/*
// ── reCAPTCHA verification middleware ──
async function verifyCaptcha(req, res, next) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return next(); // skip if not configured

  const token = req.headers["x-recaptcha-token"];
  if (!token) {
    return res.status(403).json({ error: "CAPTCHA token required" });
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!data.success) {
      return res.status(403).json({ error: "CAPTCHA verification failed" });
    }
    next();
  } catch (err) {
    console.error("CAPTCHA verification error:", err.message);
    return res.status(500).json({ error: "CAPTCHA verification error" });
  }
}

// ── Apply to routes: ──
// Replace your existing route definitions with these:
//
// app.post("/songs", verifyCaptcha, async (req, res) => { ... });
// app.post("/songs/parse-lyrics", verifyCaptcha, async (req, res) => { ... });
*/
