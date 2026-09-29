const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const MAX_BODY_BYTES = 16 * 1024;
const RATE_BUCKETS = new Map();
const DIGITAL_PRODUCTS = Object.freeze({
  'services-site': { title: 'موقع شركة خدمات', price: 349 },
  'starter-store': { title: 'متجر إلكتروني جاهز', price: 449 },
  'landing-page': { title: 'صفحة هبوط تسويقية', price: 199 },
  'consulting-site': { title: 'موقع مكتب استشارات', price: 399 },
  'orders-dashboard': { title: 'لوحة إدارة الطلبات', price: 599 },
  'fashion-store': { title: 'تصميم متجر أزياء', price: 449 }
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function dataFile(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readRecords(name) {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(name), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(name, records) {
  const target = dataFile(name);
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

function baseHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  };
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, baseHeaders(type));
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error('Body too large'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (settled) return;
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', (error) => {
      if (!settled) reject(error);
    });
  });
}

function isAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  const supplied = Buffer.from(String(req.headers['x-admin-token'] || ''));
  const expected = Buffer.from(String(ADMIN_TOKEN));
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(supplied, expected);
}

function cleanText(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function clientKey(req, bucket) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket.remoteAddress || 'unknown';
  return `${bucket}:${ip}`;
}

function withinRateLimit(req, bucket, limit, windowMs) {
  const key = clientKey(req, bucket);
  const now = Date.now();
  const previous = RATE_BUCKETS.get(key) || [];
  const recent = previous.filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    RATE_BUCKETS.set(key, recent);
    return false;
  }
  recent.push(now);
  RATE_BUCKETS.set(key, recent);
  if (RATE_BUCKETS.size > 2000) {
    for (const [storedKey, times] of RATE_BUCKETS) {
      if (!times.some((time) => now - time < windowMs)) RATE_BUCKETS.delete(storedKey);
    }
  }
  return true;
}

function generateTrackingCode() {
  return `INT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function askOpenAI(message) {
  if (!OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: 'أنت مساعد مبيعات عربي لمشروع انطلاقة للخدمات الرقمية في السعودية. أجب باختصار وبوضوح. الخدمات تشمل التخطيط والاستشارات، الهوية والمحتوى، المواقع، التطبيقات، رفع التطبيقات، البرمجة والأنظمة، ربط الذكاء الاصطناعي كموظف رقمي، التسويق الرقمي، التسويق بالعمولة، الدروب شوبنج، المتاجر، SEO، وإدارة حسابات التواصل. لا تخترع أسعارًا أو وعودًا. إذا لم تعرف السعر فقل إنه يحدد حسب نطاق العمل. وجّه العميل نحو الخدمة المناسبة واطلب تفاصيل المشروع عند الحاجة.'
        },
        { role: 'user', content: message }
      ],
      max_output_tokens: 220
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}): ${details.slice(0, 200)}`);
  }

  const data = await response.json();
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    if (!withinRateLimit(req, 'assistant', 20, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم تجاوز عدد المحاولات مؤقتًا. حاول لاحقًا.' });
    try {
      const payload = await readBody(req);
      const message = cleanText(payload.message, 1000);
      if (!message) return send(res, 400, { ok: false, message: 'اكتب سؤالك أولًا.' });
      const reply = await askOpenAI(message);
      if (!reply) return send(res, 503, { ok: false, message: 'المساعد الذكي غير مفعّل على الخادم بعد.' });
      return send(res, 200, { ok: true, reply });
    } catch (error) {
      console.error('Assistant error:', error.message);
      return send(res, 502, { ok: false, message: 'تعذر الاتصال بالمساعد الذكي حاليًا.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/customers') {
    if (!withinRateLimit(req, 'customers', 8, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم استلام عدة محاولات تسجيل. حاول لاحقًا.' });
    try {
      const payload = await readBody(req);
      const name = cleanText(payload.name, 120);
      const phone = cleanText(payload.phone, 30).replace(/\s+/g, '');
      if (!name || name.length < 2) return send(res, 400, { ok: false, message: 'اكتب الاسم بشكل صحيح.' });
      if (!/^\+9665\d{8}$/.test(phone)) return send(res, 400, { ok: false, message: 'رقم الجوال غير صحيح.' });
      const customers = readRecords('customers');
      const existing = customers.find((item) => item.phone === phone);
      if (existing) return send(res, 409, { ok: false, message: 'رقم الجوال مسجل مسبقًا.', customerCode: existing.customerCode });
      const record = {
        id: crypto.randomUUID(),
        customerCode: `CUS-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        name,
        phone,
        status: 'مسجل',
        createdAt: new Date().toISOString()
      };
      customers.push(record);
      writeRecords('customers', customers);
      return send(res, 201, { ok: true, customerCode: record.customerCode });
    } catch (error) {
      return send(res, error.message === 'Body too large' ? 413 : 400, { ok: false, message: 'تعذر تسجيل العميل.' });
    }
  }

  if (req.method === 'POST' && ['/api/leads', '/api/contracts'].includes(url.pathname)) {
    try {
      const payload = await readBody(req);
      const collection = url.pathname === '/api/leads' ? 'leads' : 'contracts';

      let safePayload;
      if (collection === 'leads') {
        if (!withinRateLimit(req, 'leads', 8, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم استلام عدة طلبات من هذا الاتصال. حاول لاحقًا.' });
        const name = cleanText(payload.name, 120);
        const contact = cleanText(payload.contact, 180);
        if (!name || !contact) return send(res, 400, { ok: false, message: 'الاسم وبيانات التواصل مطلوبة.' });
        safePayload = { name, contact };
      } else {
        if (!withinRateLimit(req, 'contracts', 10, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم استلام عدة طلبات من هذا الاتصال. حاول لاحقًا.' });
        const customerCode = cleanText(payload.customerCode, 40);
        const customerPhone = cleanText(payload.customerPhone, 30).replace(/\s+/g, '');
        const customer = readRecords('customers').find((item) => item.customerCode === customerCode && item.phone === customerPhone);
        if (!customer) return send(res, 400, { ok: false, message: 'يجب تسجيل العميل وربطه بالطلب قبل طلب الخدمة.' });
        const clientName = cleanText(payload.clientName, 160) || customer.name;
        const agreement = cleanText(payload.agreement || payload.service, 2500);
        if (!agreement) return send(res, 400, { ok: false, message: 'نص الاتفاق مطلوب.' });
        safePayload = {
          customerCode: customer.customerCode,
          customerPhone: customer.phone,
          clientName,
          agreement,
          service: agreement.slice(0, 180),
          price: cleanText(payload.price, 80),
          agreementDate: cleanText(payload.agreementDate, 30),
          deliveryDate: cleanText(payload.deliveryDate, 30)
        };
      }

      const record = {
        ...safePayload,
        id: crypto.randomUUID(),
        trackingCode: generateTrackingCode(),
        status: 'جديد',
        createdAt: new Date().toISOString()
      };

      const records = readRecords(collection);
      records.push(record);
      writeRecords(collection, records);
      return send(res, 201, { ok: true, id: record.id, trackingCode: record.trackingCode });
    } catch (error) {
      const status = error.message === 'Body too large' ? 413 : 400;
      return send(res, status, { ok: false, message: 'تعذر حفظ البيانات.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/site-orders') {
    if (!withinRateLimit(req, 'site-orders', 8, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم استلام عدة طلبات من هذا الاتصال. حاول لاحقًا.' });
    try {
      const payload = await readBody(req);
      const customerCode = cleanText(payload.customerCode, 40);
      const customerPhone = cleanText(payload.customerPhone, 30).replace(/\s+/g, '');
      const customer = readRecords('customers').find((item) => item.customerCode === customerCode && item.phone === customerPhone);
      if (!customer) return send(res, 400, { ok: false, message: 'سجل العميل أولًا قبل إرسال طلب المشروع.' });
      const name = customer.name;
      const contact = customer.phone;
      const projectType = cleanText(payload.projectType, 80);
      const projectTitle = cleanText(payload.projectTitle, 160);
      if (!projectType || !projectTitle) return send(res, 400, { ok: false, message: 'نوع المشروع مطلوب.' });
      const safeList = (value, limit = 12) => Array.isArray(value) ? value.slice(0, limit).map((item) => cleanText(item, 100)).filter(Boolean) : [];
      const record = {
        id: crypto.randomUUID(),
        orderCode: `WEB-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        customerCode: customer.customerCode, customerPhone: customer.phone,
        name, contact, projectType, projectTitle,
        startingPrice: cleanText(payload.startingPrice, 80),
        businessName: cleanText(payload.businessName, 160),
        businessActivity: cleanText(payload.businessActivity, 200),
        colors: cleanText(payload.colors, 220),
        pages: safeList(payload.pages),
        features: safeList(payload.features),
        references: cleanText(payload.references, 1200),
        notes: cleanText(payload.notes, 1800),
        status: 'جديد',
        createdAt: new Date().toISOString()
      };
      const records = readRecords('site-orders');
      records.push(record);
      writeRecords('site-orders', records);
      return send(res, 201, { ok: true, orderCode: record.orderCode, status: record.status });
    } catch (error) {
      return send(res, error.message === 'Body too large' ? 413 : 400, { ok: false, message: 'تعذر حفظ وصف المشروع.' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/site-orders') {
    if (!isAdmin(req)) return send(res, 401, { ok: false, message: 'رمز الإدارة غير صحيح.' });
    return send(res, 200, readRecords('site-orders'));
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    return send(res, 200, { ok: true, products: DIGITAL_PRODUCTS });
  }

  if (req.method === 'POST' && url.pathname === '/api/digital-orders') {
    if (!withinRateLimit(req, 'digital-orders', 10, 10 * 60 * 1000)) return send(res, 429, { ok: false, message: 'تم استلام عدة طلبات. حاول لاحقًا.' });
    try {
      const payload = await readBody(req);
      const productId = cleanText(payload.productId, 80);
      const product = DIGITAL_PRODUCTS[productId];
      const name = cleanText(payload.name, 120);
      const email = cleanText(payload.email, 180).toLowerCase();
      const phone = cleanText(payload.phone, 40);
      if (!product) return send(res, 400, { ok: false, message: 'المنتج غير موجود.' });
      if (!name || !email.includes('@') || !phone) return send(res, 400, { ok: false, message: 'أكمل بيانات المشتري بشكل صحيح.' });
      const record = {
        id: crypto.randomUUID(),
        orderCode: `DIG-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        productId, productTitle: product.title, amount: product.price, currency: 'SAR',
        name, email, phone, status: 'pending_payment', createdAt: new Date().toISOString()
      };
      const records = readRecords('digital-orders'); records.push(record); writeRecords('digital-orders', records);
      return send(res, 201, { ok: true, orderCode: record.orderCode, status: record.status, amount: record.amount, currency: record.currency });
    } catch (error) {
      return send(res, error.message === 'Body too large' ? 413 : 400, { ok: false, message: 'تعذر إنشاء طلب المنتج.' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/track/')) {
    const code = cleanText(decodeURIComponent(url.pathname.split('/').pop()), 40).toUpperCase();
    const record = readRecords('contracts').find((item) => item.trackingCode === code);
    if (!record) return send(res, 404, { ok: false, message: 'لم يتم العثور على طلب بهذا الرقم.' });
    return send(res, 200, {
      ok: true,
      trackingCode: record.trackingCode,
      status: record.status,
      service: record.service,
      createdAt: record.createdAt,
      deliveryDate: record.deliveryDate
    });
  }

  if (req.method === 'GET' && ['/api/customers', '/api/leads', '/api/contracts'].includes(url.pathname)) {
    if (!isAdmin(req)) return send(res, 401, { ok: false, message: 'رمز الإدارة غير صحيح.' });
    const collection = url.pathname === '/api/customers' ? 'customers' : (url.pathname === '/api/leads' ? 'leads' : 'contracts');
    return send(res, 200, readRecords(collection));
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/contracts/')) {
    if (!isAdmin(req)) return send(res, 401, { ok: false, message: 'رمز الإدارة غير صحيح.' });
    try {
      const id = url.pathname.split('/').pop();
      const payload = await readBody(req);
      const allowedStatuses = new Set(['جديد', 'قيد المراجعة', 'قيد التنفيذ', 'مكتمل', 'ملغى']);
      const status = cleanText(payload.status, 50);
      if (!allowedStatuses.has(status)) return send(res, 400, { ok: false, message: 'حالة الطلب غير صالحة.' });

      const records = readRecords('contracts');
      const record = records.find((item) => item.id === id);
      if (!record) return send(res, 404, { ok: false, message: 'العقد غير موجود.' });
      record.status = status;
      writeRecords('contracts', records);
      return send(res, 200, { ok: true, record });
    } catch {
      return send(res, 400, { ok: false, message: 'تعذر تحديث العقد.' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      service: 'انطلاقة – للتجارة الإلكترونية',
      aiConfigured: Boolean(OPENAI_API_KEY),
      time: new Date().toISOString()
    });
  }

  if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { ok: false, message: 'Method not allowed' });

  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/private-products/') || url.pathname.split('/').some((part) => part.startsWith('.'))) {
    return send(res, 404, { ok: false, message: 'Not found' });
  }

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requested);
  } catch {
    return send(res, 400, { ok: false, message: 'Bad request' });
  }

  // Apply private-file rules after decoding so percent-encoded paths cannot bypass them.
  const segments = decodedPath.split('/').filter(Boolean);
  const privateNames = new Set(['data', 'private-products', 'node_modules', 'server.js']);
  const publicExtensions = new Set(['.html', '.css', '.js', '.jpeg', '.jpg', '.png', '.webp', '.svg']);
  if (segments.some((part) => part.startsWith('.') || privateNames.has(part)) ||
      !publicExtensions.has(path.extname(decodedPath).toLowerCase())) {
    return send(res, 404, { ok: false, message: 'Not found' });
  }

  const rootResolved = path.resolve(ROOT);
  const filePath = path.resolve(ROOT, `.${decodedPath}`);
  const relative = path.relative(rootResolved, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 403, { ok: false, message: 'Forbidden' });

  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, 404, { ok: false, message: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const cacheControl = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)
      ? 'public, max-age=604800'
      : ['.css', '.js'].includes(ext)
        ? 'public, max-age=3600'
        : 'no-cache';
    res.writeHead(200, { ...baseHeaders(type), 'Cache-Control': cacheControl });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});

server.listen(PORT, () => {
  console.log(`انطلاقة تعمل على http://localhost:${PORT}`);
  console.log(`المساعد الذكي: ${OPENAI_API_KEY ? `مفعّل (${OPENAI_MODEL})` : 'غير مفعّل — أضف OPENAI_API_KEY'}`);
});
