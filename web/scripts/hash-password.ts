/**
 * Genera el hash scrypt de una contraseña.
 *
 *   npm run admin:hash -- "mi contraseña"
 */
import { hashPassword } from '../src/lib/crypto';

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run admin:hash -- "tu contraseña"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Usa al menos 12 caracteres.');
  process.exit(1);
}

console.log(hashPassword(password));
