const encoder = new TextEncoder();
export const bytesToHex = bytes => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
export const hexToBytes = hex => {
  if (typeof hex !== 'string' || hex.length % 2 || !/^[a-f0-9]+$/i.test(hex)) return new Uint8Array();
  return Uint8Array.from(hex.match(/../g), value => Number.parseInt(value, 16));
};
export const randomToken = (bytes = 32) => {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
}
// Workerd currently rejects WebCrypto PBKDF2 counts above 100,000.
export async function pbkdf2(password, salt, iterations = 100_000) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, key, 256));
}
export function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}
export async function verifyPassword(password, saltHex, hashHex, iterations) {
  if (typeof password !== 'string' || password.length > 1024) return false;
  return constantTimeEqual(await pbkdf2(password, hexToBytes(saltHex), iterations), hexToBytes(hashHex));
}
