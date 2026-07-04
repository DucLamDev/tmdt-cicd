import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const SOURCE_DB = process.env.MONGODB_URI;
const TARGET_DB = process.env.MONGODB_TARGET_URI;

const COLLECTIONS = [
  'users',
  'products',
  'orders',
  'reviews',
  'shops',
  'payments',
  'codtransactions',
  'coupons',
  'conversations',
  'messages',
  'contactmessages',
  'wishlists'
];

async function migrateDatabase() {
  let sourceConnection = null;
  let targetConnection = null;

  try {
    console.log('🚀 Starting database migration...\n');
    if (!SOURCE_DB || !TARGET_DB) {
      throw new Error('MONGODB_URI and MONGODB_TARGET_URI are required');
    }

    console.log('📡 Connecting to SOURCE database...');
    sourceConnection = await mongoose.createConnection(SOURCE_DB).asPromise();
    console.log('✅ Connected to SOURCE database\n');

    console.log('📡 Connecting to TARGET database...');
    targetConnection = await mongoose.createConnection(TARGET_DB).asPromise();
    console.log('✅ Connected to TARGET database\n');

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      collections: {}
    };

    for (const collectionName of COLLECTIONS) {
      try {
        console.log(`\n📦 Processing collection: ${collectionName}`);
        
        const sourceCollections = await sourceConnection.db.listCollections({ name: collectionName }).toArray();
        
        if (sourceCollections.length === 0) {
          console.log(`⚠️  Collection '${collectionName}' not found in source database, skipping...`);
          stats.collections[collectionName] = { count: 0, status: 'skipped' };
          continue;
        }

        const sourceCollection = sourceConnection.db.collection(collectionName);
        const targetCollection = targetConnection.db.collection(collectionName);

        const documents = await sourceCollection.find({}).toArray();
        const count = documents.length;

        console.log(`   Found ${count} documents`);

        if (count > 0) {
          console.log(`   Migrating ${count} documents...`);
          
          await targetCollection.deleteMany({});
          console.log(`   Cleared existing data in target collection`);
          
          await targetCollection.insertMany(documents, { ordered: false });
          console.log(`   ✅ Successfully migrated ${count} documents`);
          
          stats.success += count;
          stats.collections[collectionName] = { count, status: 'success' };
        } else {
          console.log(`   ⚠️  No documents to migrate`);
          stats.collections[collectionName] = { count: 0, status: 'empty' };
        }

        stats.total += count;

      } catch (error) {
        console.error(`   ❌ Error migrating collection '${collectionName}':`, error.message);
        stats.failed++;
        stats.collections[collectionName] = { count: 0, status: 'failed', error: error.message };
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total documents processed: ${stats.total}`);
    console.log(`Successfully migrated: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log('\nCollection Details:');
    
    for (const [collection, info] of Object.entries(stats.collections)) {
      const statusIcon = info.status === 'success' ? '✅' : 
                        info.status === 'failed' ? '❌' : 
                        info.status === 'empty' ? '⚠️' : '⏭️';
      console.log(`  ${statusIcon} ${collection}: ${info.count} documents (${info.status})`);
      if (info.error) {
        console.log(`     Error: ${info.error}`);
      }
    }
    
    console.log('='.repeat(60));
    console.log('\n✨ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    if (sourceConnection) {
      await sourceConnection.close();
      console.log('🔌 Source database connection closed');
    }
    if (targetConnection) {
      await targetConnection.close();
      console.log('🔌 Target database connection closed');
    }
  }
}

migrateDatabase()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
