import React from "react";

// Matches plain URLs so we can auto-link them
const urlRe = /(https?:\/\/[^\s)]+)/g;

export default function MultilineText({ text = "", className = "" }) {
  const safe = String(text ?? "");
  const parts = safe.split(urlRe);

  return (
    <span className={`whitespace-pre-line ${className}`}>
      {parts.map((p, i) =>
        urlRe.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline">
            {p}
          </a>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </span>
  );
}
