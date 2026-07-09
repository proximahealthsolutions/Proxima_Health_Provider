const DEFAULT_DIAL_CODE = "+234";

export function normalizePhoneForApi(value: string, dialCode = DEFAULT_DIAL_CODE) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  const countryDigits = dialCode.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith(countryDigits)) {
    return `+${digits}`;
  }

  return `+${countryDigits}${digits.replace(/^0+/, "")}`;
}

export function formatPhoneForDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits.slice(3);
  if (digits.startsWith("0") && digits.length > 1) return digits.slice(1);
  return value.replace(/[^\d\s()-]/g, "");
}
