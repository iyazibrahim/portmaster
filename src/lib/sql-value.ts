/**
 * postgres.js with `prepare: false` writes query params via Buffer.utf8Write.
 * Next.js server bundles can drop the Date serializer, so a JS Date is passed
 * straight through and throws:
 *   TypeError: The "string" argument must be of type string ... Received an instance of Date
 */
export function asSqlTimestamp(value: Date | string | number): string {
  if (typeof value === "string") {
    if (!value.trim()) {
      throw new TypeError("asSqlTimestamp: empty string");
    }
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("asSqlTimestamp: invalid date");
  }
  return date.toISOString();
}
