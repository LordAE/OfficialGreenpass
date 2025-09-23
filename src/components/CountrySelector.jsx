// src/components/CountrySelector.jsx
import React, { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// You can prune or extend this list. It already includes:
// Australia, Germany, Ireland, United Kingdom, United States, New Zealand
const DEFAULT_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh",
  "Belarus","Belgium","Bolivia","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Costa Rica","Croatia",
  "Czech Republic","Denmark","Ecuador","Egypt","Estonia","Finland","France","Germany","Ghana","Greece","Hungary","Iceland",
  "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","South Korea","Kuwait",
  "Latvia","Lebanon","Lithuania","Malaysia","Mexico","Morocco","Nepal","Netherlands","New Zealand","Nigeria","Norway",
  "Pakistan","Peru","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia","Singapore","Slovakia","South Africa",
  "Spain","Sri Lanka","Sweden","Switzerland","Taiwan","Thailand","Turkey","Ukraine","United Arab Emirates",
  "United Kingdom","United States","Uruguay","Venezuela","Vietnam",
];

export default function CountrySelector({
  value,
  onChange,
  options,
  includeAll = true,
  allLabel = "All Countries",
  placeholder = "Select Country",
  className = "",
}) {
  const items = useMemo(() => {
    const base = (options && options.length ? options : DEFAULT_COUNTRIES).filter(Boolean);
    // dedupe + A–Z
    return Array.from(new Set(base)).sort((a, b) => a.localeCompare(b));
  }, [options]);

  return (
    <Select value={value ?? undefined} onValueChange={(v) => onChange && onChange(v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {items.map((country) => (
          <SelectItem key={country} value={country}>
            {country}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
