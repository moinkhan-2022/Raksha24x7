import mongoose from 'mongoose';
import '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import Admin from '../src/models/admin.model.js';

const SUPER_ADMIN = {
  fullName: 'Moin Khan',
  email: 'moin.rafeek883@gmail.com',
  password: 'mOIN@123',
  role: 'super_admin',
  status: 'active',
  permissions: ['*']
};

const createAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email: SUPER_ADMIN.email }).lean();
    if (existingAdmin) {
      console.log('Admin already exists.');
      return;
    }

    await Admin.create(SUPER_ADMIN);

    console.log('✅ Super Admin created successfully.');
    console.log('');
    console.log('Email:');
    console.log(SUPER_ADMIN.email);
    console.log('');
    console.log('Password:');
    console.log(SUPER_ADMIN.password);
  } catch (error) {
    console.error('Failed to create Super Admin.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();
