/**
 * Crea el primer usuario del backoffice.
 *
 *   npm run db:seed -- correo@ejemplo.com "Nombre" "contraseña larga"
 *
 * Sin argumentos pide los datos por consola.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../src/lib/crypto';
import { Repository } from '../src/lib/repository';
import { getDb } from '../src/lib/db';

async function main() {
  const repo = new Repository(getDb());

  let [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    const rl = createInterface({ input: stdin, output: stdout });
    email ||= await rl.question('Email: ');
    name ||= await rl.question('Nombre: ');
    password ||= await rl.question('Contraseña (mínimo 12 caracteres): ');
    rl.close();
  }

  if (!email.includes('@')) throw new Error('El email no parece válido.');
  if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');

  if (repo.findAdminByEmail(email)) {
    console.log(`El usuario ${email} ya existe. No se ha creado nada.`);
    return;
  }

  const user = repo.createAdminUser({
    email,
    name,
    passwordHash: hashPassword(password),
    role: repo.countAdmins() === 0 ? 'admin' : 'agente',
  });

  console.log(`Usuario creado: ${user.email} (${user.role}). Ya puedes entrar en /admin/login`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
