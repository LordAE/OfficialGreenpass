const { getBaseUrl, getAccessToken, readJson } = require("./_utils");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  try {
    const { orderID } = await readJson(req);
    if (!orderID) {
      res.statusCode = 400;
      return res.end("Missing orderID");
    }

    const base = getBaseUrl();
    const token = await getAccessToken();

    const r = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    const data = await r.json();
    if (!r.ok) {
      res.statusCode = 400;
      return res.end(JSON.stringify(data));
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = 500;
    res.end(e.message || "Server error");
  }
};
