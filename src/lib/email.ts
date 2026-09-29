/** Local part, @, domain, and a letter TLD of at least 2 characters. */
export function isValidEmail(raw: string) {
  const email = raw.trim();
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
}
