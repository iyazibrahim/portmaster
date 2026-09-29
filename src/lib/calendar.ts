/** Calendar date in Asia/Kuala_Lumpur as YYYY-MM-DD. Safe to import from client code. */
export function todayMYT(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function ageFromDob(dob: string, onDate = todayMYT()): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [cy, cm, cd] = onDate.split("-").map(Number);
  let age = cy - y;
  if (cm < m || (cm === m && cd < d)) age -= 1;
  return age;
}
