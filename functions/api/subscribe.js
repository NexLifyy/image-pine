// Cloudflare Pages Function: functions/api/subscribe.js
// Handles POST /api/subscribe

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

// In-memory rate limit map (per isolate lifetime)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function verifyTurnstile(token, ip, secret) {
  if (!secret) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

async function addToBrevo(email, apiKey) {
  if (!apiKey) return { ok: false, message: 'Server configuration error.' };
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ email: email.trim().toLowerCase(), updateEnabled: false }),
    });
    if (res.status === 201 || res.status === 204) {
      return { ok: true, message: "You're on the list! Thanks for subscribing." };
    }
    const data = await res.json().catch(() => ({}));
    if (data?.code === 'duplicate_parameter') {
      return { ok: true, message: "You're already subscribed!" };
    }
    return { ok: false, message: 'Could not save your email. Please try again.' };
  } catch {
    return { ok: false, message: 'Could not save your email. Please try again.' };
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0';

  if (!checkRateLimit(ip)) {
    return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const { email, token } = body || {};

  if (!email || !isValidEmail(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  if (!token) {
    return json({ error: 'Verification token missing.' }, 400);
  }

  const turnstileOk = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY);
  if (!turnstileOk) {
    return json({ error: 'Verification failed. Please try again.' }, 403);
  }

  const result = await addToBrevo(email, env.BREVO_API_KEY);
  if (!result.ok) {
    return json({ error: result.message }, 500);
  }

  return json({ success: true, message: result.message }, 200);
}

// Handle OPTIONS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}