// 仅服务端可读取的环境变量，彻底消除前端 JS 泄漏风险
const SERVER_SECRET_KEY = process.env.API_SIGN_SECRET || process.env.SECRET_KEY || 'shot-easy-secret-dev-fallback';

/**
 * 计算 ArrayBuffer 的 SHA-256 哈希（十六进制字符串）
 * 使用 Web Crypto API，兼容 Node 与 Cloudflare Workers 运行时。
 */
export async function computeFileHash(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 将 UTF-8 字符串编码为 ArrayBuffer
 */
function encodeUtf8(str) {
  return new TextEncoder().encode(str);
}

/**
 * 计算 HMAC-SHA256（十六进制字符串）
 * 使用 Web Crypto API，兼容 Cloudflare Workers。
 */
async function hmacSha256Hex(keyStr, messageStr) {
  const key = await crypto.subtle.importKey(
    'raw',
    encodeUtf8(keyStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encodeUtf8(messageStr));
  const bytes = Array.from(new Uint8Array(sig));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 常数时间比较两个十六进制字符串（防时序攻击）
 */
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 服务端鉴权核心方法
 * @param {Object} payload { t: 时间戳毫秒, fileHash: 文件内容sha256 }
 * @param {string} signature 客户端提交的签名
 * @param {number} maxDriftMs 允许的时间窗口偏差（默认 2 分钟）
 */
export async function verifyApiSignature(payload, signature, maxDriftMs = 120000) {
  if (!signature || !payload || !payload.t || !payload.fileHash) {
    return { ok: false, reason: 'Missing required signature payload' };
  }

  const now = Date.now();
  const timestamp = Number(payload.t);

  // 1. 严格时间戳有效性校验（防无限重放）
  if (Number.isNaN(timestamp) || Math.abs(now - timestamp) > maxDriftMs) {
    return { ok: false, reason: 'Request expired or timestamp invalid' };
  }

  // 2. 服务端私密 HMAC-SHA256 计算
  const expectedSign = await hmacSha256Hex(SERVER_SECRET_KEY, `${payload.t}:${payload.fileHash}`);

  // 3. 常数时间比较防时序攻击
  try {
    const isValid = timingSafeEqualHex(signature, expectedSign);
    return isValid ? { ok: true } : { ok: false, reason: 'Invalid signature mismatch' };
  } catch (err) {
    return { ok: false, reason: 'Signature verification error' };
  }
}
