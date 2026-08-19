"use client";

import React, { useState, useEffect } from "react";

export interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  step?: number;
}

export default function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  defaultValue = 1,
  placeholder,
  className = "",
  ariaLabel,
}: NumericInputProps) {
  const [localText, setLocalText] = useState<string>(
    value !== undefined && !isNaN(value) ? String(value) : ""
  );

  useEffect(() => {
    if (value !== undefined && !isNaN(value)) {
      setLocalText(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits only
    const cleaned = raw.replace(/[^\d]/g, "");
    setLocalText(cleaned);

    if (cleaned !== "") {
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed)) {
        if (max !== undefined && parsed > max) {
          onChange(max);
        } else if (parsed >= min) {
          onChange(parsed);
        }
      }
    }
  };

  const handleBlur = () => {
    if (localText === "") {
      const fallback = defaultValue ?? min ?? 1;
      setLocalText(String(fallback));
      onChange(fallback);
      return;
    }

    const parsed = parseInt(localText, 10);
    if (isNaN(parsed) || parsed < min) {
      const fallback = defaultValue ?? min ?? 1;
      setLocalText(String(fallback));
      onChange(fallback);
    } else if (max !== undefined && parsed > max) {
      setLocalText(String(max));
      onChange(max);
    } else {
      setLocalText(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localText}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
