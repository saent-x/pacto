// Crockford-ish alphabet: removes O, 0, I, 1, L to avoid confusion.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars
const LENGTH = 6;

export function generateInviteCode(): string {
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== LENGTH) return false;
  for (const ch of code) if (!ALPHABET.includes(ch)) return false;
  return true;
}
