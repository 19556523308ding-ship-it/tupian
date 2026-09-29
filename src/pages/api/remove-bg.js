import { verifyApiSignature, computeFileHash } from '@lib/auth.server';

const apiKey = process.env.REMOVE_API_KEY || import.meta.env.REMOVE_API_KEY;

// 简单内存滑动窗口限流器 (IP -> [timestamp, ...])
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 10;     // 每IP每分钟最多10次
const requestBuckets = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = requestBuckets.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  validTimestamps.push(now);
  requestBuckets.set(ip, validTimestamps);
  return true;
}

export const POST = async ({ request, clientAddress }) => {
  // 1. 限流防护
  const clientIp = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: { message: 'Too many requests. Please slow down.' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  // 2. 表单解析
  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: 'Invalid form data' } }), { status: 400 });
  }

  const image = formData.get('image');
  const time = formData.get('time');
  const sign = formData.get('sign');

  if (!image || typeof image === 'string' || !time || !sign) {
    return new Response(JSON.stringify({ error: { message: 'Missing image or signature parameters' } }), { status: 400 });
  }

  // 3. 校验文件大小（上限 10MB）与类型
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (image.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: { message: 'File too large (max 10MB)' } }), { status: 413 });
  }
  if (!image.type?.startsWith('image/')) {
    return new Response(JSON.stringify({ error: { message: 'Only image files are allowed' } }), { status: 415 });
  }

  // 4. 读取内容计算哈希并验签（内容哈希绑定）
  const arrayBuffer = await image.arrayBuffer();
  const fileHash = await computeFileHash(arrayBuffer);
  
  const authCheck = await verifyApiSignature({ t: time, fileHash }, sign);
  if (!authCheck.ok) {
    return new Response(JSON.stringify({ error: { message: authCheck.reason } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'Backend service API key not configured' } }), { status: 500 });
  }

  // 5. 转发向上游 remove.bg 付费接口
  const upstreamFormData = new FormData();
  upstreamFormData.append('size', 'auto');
  upstreamFormData.append('image_file', new Blob([arrayBuffer], { type: image.type }), image.name || 'image.png');

  try {
    const upstreamRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: upstreamFormData,
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return new Response(errText, { status: upstreamRes.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await upstreamRes.blob();
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: 'Upstream gateway error' } }), { status: 502 });
  }
};
