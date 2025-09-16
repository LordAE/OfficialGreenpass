const { getBaseUrl, getAccessToken, readJson } = require("./_utils");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  try {
    const { amount, currency = "USD", description, registrationId, payerName, payerEmail } =
      await readJson(req);

    if (!amount) {
      res.statusCode = 400;
      return res.end("Missing amount");
    }

    const base = getBaseUrl();
    const token = await getAccessToken();

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: String(Number(amount).toFixed(2)),
          },
          description: description || "Event registration",
          custom_id: registrationId ? String(registrationId) : undefined,
        },
      ],
      payer: {
        name: payerName
          ? { given_name: payerName.split(" ")[0], surname: payerName.split(" ").slice(1).join(" ") || " " }
          : undefined,
        email_address: payerEmail || undefined,
      },
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    };

    const r = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });

    const data = await r.json();
    if (!r.ok) {
      res.statusCode = 400;
      return res.end(JSON.stringify(data));
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ id: data.id }));
  } catch (e) {
    res.statusCode = 500;
    res.end(e.message || "Server error");
  }
};
