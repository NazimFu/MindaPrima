/**
 * Spreadsheet formula injection guard.
 * Any text starting with = + - @ (or a tab / carriage return) is stored with a leading apostrophe,
 * and the apostrophe is removed again when the value is read back.
 */
const DANGEROUS = /^[=+\-@\t\r]/;
const ESCAPED = /^'[=+\-@\t\r]/;

export function toSheet(value: string): string {
  return DANGEROUS.test(value) ? `'${value}` : value;
}

export function fromSheet(value: string): string {
  return ESCAPED.test(value) ? value.slice(1) : value;
}
