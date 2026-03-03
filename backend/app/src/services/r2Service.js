// BE/services/r2Service.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/env.js";

let _client;

function s3() {
  if (_client) return _client;

  _client = new S3Client({
    region: "auto",
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });

  return _client;
}

function clampInt(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function safeKey(key) {
  const k = String(key || "").trim();
  if (!k) return null;

  // block traversal + weird chars; allow common S3 key chars
  if (k.includes("..") || k.startsWith("/") || k.includes("\\") || /[\r\n]/.test(k)) return null;
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(k)) return null;

  return k;
}

export async function createUploadUrl({ key, contentType, expiresInSec }) {
  const safe = safeKey(key);
  if (!safe) throw Object.assign(new Error("Invalid key"), { status: 400 });

  const expiresIn = clampInt(expiresInSec, 60, 60 * 60, 15 * 60); // 1 min .. 1 hour (default 15 min)

  const cmd = new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: safe,
    ContentType: contentType ? String(contentType) : undefined,
  });

  const url = await getSignedUrl(s3(), cmd, { expiresIn });

  return {
    method: "PUT",
    url,
    key: safe,
    expires_in: expiresIn,
    headers: contentType ? { "content-type": String(contentType) } : {},
  };
}

export async function createDownloadUrl({ key, expiresInSec, downloadName }) {
  const safe = safeKey(key);
  if (!safe) throw Object.assign(new Error("Invalid key"), { status: 400 });

  const expiresIn = clampInt(expiresInSec, 60, 24 * 60 * 60, 15 * 60); // 1 min .. 24h (default 15 min)

  const cmd = new GetObjectCommand({
    Bucket: config.r2.bucket,
    Key: safe,
    ResponseContentDisposition: downloadName
      ? `attachment; filename="${String(downloadName).replace(/"/g, "")}"`
      : undefined,
  });

  const url = await getSignedUrl(s3(), cmd, { expiresIn });

  return {
    method: "GET",
    url,
    key: safe,
    expires_in: expiresIn,
  };
}