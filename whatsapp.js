const crypto = require('crypto');

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || '';
const ORDER_TEMPLATE = process.env.WHATSAPP_ORDER_TEMPLATE || '';
const ADMIN_REVIEW_TEMPLATE = process.env.WHATSAPP_ADMIN_REVIEW_TEMPLATE || '';
const ADMIN_PHONE = process.env.WHATSAPP_ADMIN_PHONE || '';
const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isWhatsAppConfigured() {
  return Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID && GRAPH_API_VERSION);
}

function isOrderTemplateConfigured() {
  return Boolean(ORDER_TEMPLATE);
}

function verifyWebhookChallenge(url) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !VERIFY_TOKEN || !challenge || !safeEqual(token, VERIFY_TOKEN)) {
    return null;
  }

  return challenge;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!APP_SECRET) return true;
  const signature = String(signatureHeader || '');
  if (!signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
  return safeEqual(signature, expected);
}

function normalizeWhatsAppNumber(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) digits = '966' + digits.slice(1);
  if (/^5\d{8}$/.test(digits)) digits = '966' + digits;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

async function sendWhatsAppTemplate(to, templateName, parameters = [], languageCode = TEMPLATE_LANGUAGE) {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };

  const recipient = normalizeWhatsAppNumber(to);
  const name = String(templateName || '').trim();
  if (!recipient || !name) return { ok: false, skipped: true, reason: 'template_not_configured' };

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const bodyParameters = parameters.map((value) => ({
    type: 'text',
    text: String(value ?? '').slice(0, 1024)
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name,
        language: { code: languageCode },
        components: bodyParameters.length
          ? [{ type: 'body', parameters: bodyParameters }]
          : []
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`WhatsApp template request failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }

  return { ok: true, data };
}

async function sendOrderNotification(to, customerName, orderCode, status) {
  return sendWhatsAppTemplate(
    to,
    ORDER_TEMPLATE,
    [customerName, orderCode, status]
  );
}

async function sendAdminReviewNotification(customerName, orderCode, service) {
  if (!isAdminNotificationConfigured()) {
    return { ok: false, skipped: true, reason: 'admin_notification_not_configured' };
  }
  return sendWhatsAppTemplate(
    ADMIN_PHONE,
    ADMIN_REVIEW_TEMPLATE,
    [customerName, orderCode, service]
  );
}

async function sendWhatsAppText(to, message) {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };

  const recipient = normalizeWhatsAppNumber(to);
  const body = String(message || '').trim().slice(0, 4096);
  if (!recipient || !body) return { ok: false, skipped: true, reason: 'invalid_payload' };

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: false, body }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`WhatsApp request failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }

  return { ok: true, data };
}

function extractWebhookEvents(payload) {
  const events = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};

      for (const message of value.messages || []) {
        events.push({
          kind: 'message',
          id: String(message.id || ''),
          from: normalizeWhatsAppNumber(message.from) || String(message.from || ''),
          type: String(message.type || ''),
          text: String(message.text?.body || '').slice(0, 4000),
          timestamp: String(message.timestamp || ''),
          createdAt: new Date().toISOString()
        });
      }

      for (const status of value.statuses || []) {
        events.push({
          kind: 'status',
          id: String(status.id || ''),
          recipient: normalizeWhatsAppNumber(status.recipient_id) || String(status.recipient_id || ''),
          status: String(status.status || ''),
          timestamp: String(status.timestamp || ''),
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  return events;
}

module.exports = {
  extractWebhookEvents,
  isWhatsAppConfigured,
  isOrderTemplateConfigured,
  sendOrderNotification,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  verifyWebhookChallenge,
  verifyWebhookSignature
};
