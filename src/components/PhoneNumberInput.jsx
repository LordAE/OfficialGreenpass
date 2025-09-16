import React from 'react';
import { Input } from "@/components/ui/input";

export default function PhoneNumberInput({ 
  value, 
  onChange, 
  required = false,
  placeholder = "Enter phone number",
  className = ""
}) {
  const handleChange = (e) => {
    if (onChange && typeof onChange === 'function') {
      onChange(e.target.value);
    }
  };

  return (
    <Input
      type="tel"
      value={value || ''}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
      className={className}
    />
  );
}