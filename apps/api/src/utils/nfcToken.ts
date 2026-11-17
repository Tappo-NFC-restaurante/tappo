// Alfabeto seguro sem caracteres ambíguos:
// Exclui '0', 'O', '1', 'I', 'l'
export const SAFE_NFC_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/**
 * Gera um token NFC alfanumérico seguro e não ambíguo de 6 caracteres
 */
export function generateNfcToken(length = 6): string {
  let token = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * SAFE_NFC_ALPHABET.length);
    token += SAFE_NFC_ALPHABET[idx];
  }
  return token;
}
