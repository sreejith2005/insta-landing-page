export function normalizeIndianPhone(input: string): string {
  let digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (!/^[6-9][0-9]{9}$/.test(digits) || /^([0-9])\1{9}$/.test(digits)) {
    throw new Error("Enter a valid Indian mobile number.");
  }
  return digits;
}
