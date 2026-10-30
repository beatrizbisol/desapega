/** Accepts typed digits and formats as (XX) 9XXXX-XXXX */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Valid Brazilian mobile: 2-digit DDD + 9-digit number starting with 9 */
export function isValidMobilePhone(raw: string): boolean {
  const digits = phoneDigits(raw);
  return /^[1-9][0-9]9[0-9]{8}$/.test(digits);
}
