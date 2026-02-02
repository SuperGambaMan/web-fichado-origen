import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../config/database.config';

async function seed() {
  console.log('🌱 Starting database seed...');

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  console.log('📦 Connected to database');

  const userRepository = dataSource.getRepository('users');

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@empresa.com' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists, skipping...');
  } else {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 12);

    const adminUser = userRepository.create({
      email: 'admin@empresa.com',
      password: hashedPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: 'admin',
      status: 'active',
      department: 'IT',
    });

    await userRepository.save(adminUser);
    console.log('✅ Admin user created successfully');
    console.log('   📧 Email: admin@empresa.com');
    console.log('   🔑 Password: Admin123!');
  }

  // Create sample employee
  const existingEmployee = await userRepository.findOne({
    where: { email: 'empleado@empresa.com' },
  });

  if (existingEmployee) {
    console.log('⚠️  Sample employee already exists, skipping...');
  } else {
    const hashedPassword = await bcrypt.hash('Empleado123!', 12);

    const employeeUser = userRepository.create({
      email: 'empleado@empresa.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'García',
      role: 'employee',
      status: 'active',
      department: 'Desarrollo',
    });

    await userRepository.save(employeeUser);
    console.log('✅ Sample employee created successfully');
    console.log('   📧 Email: empleado@empresa.com');
    console.log('   🔑 Password: Empleado123!');
  }

  // Create sample intern
  const existingIntern = await userRepository.findOne({
    where: { email: 'estudiante@empresa.com' },
  });

  if (existingIntern) {
    console.log('⚠️  Sample intern already exists, skipping...');
  } else {
    const hashedPassword = await bcrypt.hash('Estudiante123!', 12);

    const internUser = userRepository.create({
      email: 'estudiante@empresa.com',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'López',
      role: 'intern',
      status: 'active',
      department: 'Prácticas',
      hireDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    });

    await userRepository.save(internUser);
    console.log('✅ Sample intern created successfully');
    console.log('   📧 Email: estudiante@empresa.com');
    console.log('   🔑 Password: Estudiante123!');
  }

  await dataSource.destroy();
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Users created:');
  console.log('┌─────────────────────────────┬────────────────┬──────────┐');
  console.log('│ Email                       │ Password       │ Role     │');
  console.log('├─────────────────────────────┼────────────────┼──────────┤');
  console.log('│ admin@empresa.com           │ Admin123!      │ admin    │');
  console.log('│ empleado@empresa.com        │ Empleado123!   │ employee │');
  console.log('│ estudiante@empresa.com      │ Estudiante123! │ intern   │');
  console.log('└─────────────────────────────┴────────────────┴──────────┘');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
