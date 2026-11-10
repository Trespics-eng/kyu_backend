import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully.');

    const migrationFiles = [
      path.join(__dirname, 'migrations', '001_initial_schema.sql'),
      path.join(__dirname, 'migrations', '002_rls_policies.sql'),
      path.join(__dirname, 'migrations', '003_storage_buckets.sql'),
      path.join(__dirname, 'migrations', '004_triggers_indexes.sql'),
      path.join(__dirname, 'migrations', '006_ai_agent_schema.sql'),
      path.join(__dirname, 'migrations', '007_gemini_ai_model.sql'),
      path.join(__dirname, 'migrations', '008_ai_provider_selection.sql'),
      path.join(__dirname, 'migrations', '009_communities_links_and_seed.sql'),
      path.join(__dirname, 'migrations', '010_grant_permissions.sql'),
      path.join(__dirname, 'seeds', '001_seed_dev_data.sql'),
    ];

    for (const filePath of migrationFiles) {
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        console.log(`Executing ${fileName}...`);
        await client.query(sql);
        console.log(`✓ ${fileName} applied.`);
      }
    }

    console.log('\nAll migrations and seeds successfully applied to Supabase!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

