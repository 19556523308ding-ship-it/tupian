import crypto from 'node:crypto';

// 移除 PUBLIC_ 前缀，改为仅服务端可读取的环境变量，彻底消除前端 JS 泄漏风险
const SERVER_SECRET_KEY = process.env.API_SIGN_SECRET || process.env.SECRET_KEY || 'shot-easy-secret-dev-fallback';

/**
 * 计算 ArrayBuffer / Buffer 的 SHA-256 哈希
 */
export async function computeFileHash(arrayBuffer) {
  if (typeof crypto !== 'undefined' && crypto?.subtle?.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex');
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
  const hmac = crypto.createHmac('sha256', SERVER_SECRET_KEY);
  hmac.update(`${payload.t}:${payload.fileHash}`);
  const expectedSign = hmac.digest('hex');

  // 3. 常数时间比较防时序攻击
  try {
    const signBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSign, 'hex');
    if (signBuf.length !== expectedBuf.length) {
      return { ok: false, reason: 'Invalid signature length' };
    }
    const isValid = crypto.timingSafeEqual(signBuf, expectedBuf);
    return isValid ? { ok: true } : { ok: false, reason: 'Invalid signature mismatch' };
  } catch (err) {
    return { ok: false, reason: 'Signature verification error' };
  }
}
