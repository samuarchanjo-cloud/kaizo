import { useState } from "react";

export const parseBRLInput = (input: string): number => {
  const cleaned = input.replace(/[^0-9.,]/g, "");
  if (!cleaned) return 0;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  const decimalIndex = comma >= 0 && dot >= 0 ? Math.max(comma, dot) : comma >= 0 ? comma : dot >= 0 && cleaned.length - dot - 1 <= 2 ? dot : -1;
  const integerDigits = (decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned).replace(/\D/g, "") || "0";
  const decimalDigits = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1).replace(/\D/g, "").slice(0, 2) : "";
  const value = Number(`${integerDigits}.${decimalDigits || "0"}`);
  return Number.isFinite(value) ? value : 0;
};

export const formatBRLInput = (value: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function CurrencyInput({ name, label, defaultValue = 0, required = false, placeholder = "0,00", onValueChange }: { name: string; label: string; defaultValue?: number; required?: boolean; placeholder?: string; onValueChange?: (value: number) => void }) {
  const [text, setText] = useState(defaultValue ? formatBRLInput(defaultValue) : "");
  const value = parseBRLInput(text);

  return <div className="currency-input">
    <span>R$</span>
    <input aria-label={label} inputMode="decimal" autoComplete="off" placeholder={placeholder} value={text} required={required} onChange={(event) => { const next = event.target.value.replace(/[^0-9.,]/g, ""); setText(next); onValueChange?.(parseBRLInput(next)); }} onBlur={() => text && setText(formatBRLInput(value))} />
    <input type="hidden" name={name} value={text ? String(value) : ""} />
  </div>;
}
