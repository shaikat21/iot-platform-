// BE/controllers/r2Controller.js
import { createUploadUrl, createDownloadUrl } from "../services/r2Service.js";

export async function getUploadUrl(req, res) {
  try {
    const { key, content_type, expires_in, download_name } = req.body || {};

    const r = await createUploadUrl({
      key,
      contentType: content_type,
      expiresInSec: expires_in,
      // download_name not used for upload; kept for symmetry if you want later
    });

    return res.json(r);
  } catch (err) {
    const code = err?.status || 500;
    return res.status(code).json({ error: err?.message || "Failed to create upload url" });
  }
}

export async function getDownloadUrl(req, res) {
  try {
    const { key, expires_in, download_name } = req.body || {};

    const r = await createDownloadUrl({
      key,
      expiresInSec: expires_in,
      downloadName: download_name,
    });

    return res.json(r);
  } catch (err) {
    const code = err?.status || 500;
    return res.status(code).json({ error: err?.message || "Failed to create download url" });
  }
}