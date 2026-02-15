/**
 * Reset admin password script.
 * Usage: npx ts-node prisma/reset-admin-password.ts <email> <new-password>
 * Example: npx ts-node prisma/reset-admin-password.ts admin@example.com NewPass123!
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.error('Usage: npx ts-node prisma/reset-admin-password.ts <email> <new-password>');
    console.error('Example: npx ts-node prisma/reset-admin-password.ts admin@example.com MyNewPass1!');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`Error: No user found with email "${email}".`);
      process.exit(1);
    }

    if (user.role !== 'ADMIN') {
      console.error(`Error: User "${email}" is not an admin (role: ${user.role}).`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log(`Password reset successfully for admin: ${email}`);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
