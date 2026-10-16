export function getStoryGuestToken(): string {
  const key = "aegis:story-guest-token";
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const token = crypto.randomUUID();
  localStorage.setItem(key, token);
  return token;
}
