// src/lib/translateClient.js
export async function translateText(text, targetLang) {
  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Translate failed");
  return data.translatedText;
}
