const getBaseUrl = () =>
  process.env.PAYPAL_ENV === "live"
    ? "https://api.paypal.com"
    : "https://api.sandbox.paypal.com";

async function getAccessToken() {
  const base = getBaseUrl();
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("PayPal token error: " + t);
  }
  const json = await res.json();
  return json.access_token;
}

async function readJson(req) {
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (typeof req.body === "string" && req.body.length) return JSON.parse(req.body);
  } catch {}
  // Manual parse (covers older runtimes)
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = { getBaseUrl, getAccessToken, readJson };
