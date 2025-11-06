import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/common/enums/user';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  try {
    // Check if admin user already exists
    const existingAdmin = await userService.findByEmail('admin@tcg-nexus.com');

    if (!existingAdmin) {
      // Create default admin user
      const adminUser = await userService.create({
        email: 'admin@tcg-nexus.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'admin123456',
        role: UserRole.ADMIN
      });

      console.log('Admin user created successfully:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
    } else {
      console.log('Admin user already exists');
    }

    // Create a test regular user
    const existingUser = await userService.findByEmail('user@tcg-nexus.com');

    if (!existingUser) {
      const testUser = await userService.create({
        email: 'user@tcg-nexus.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'user123456',
        role: UserRole.USER
      });

      console.log('Test user created successfully:', {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });
    } else {
      console.log('Test user already exists');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
