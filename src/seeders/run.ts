import { seedDatabase } from './index';

// Run the seeder
seedDatabase().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});