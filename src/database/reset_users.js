import 'dotenv/config';
import { getSupabaseAdmin } from '../config/supabase.js';

async function resetAllUsers() {
  console.log('🔄 Starting user wipe & database reset...');
  const supabase = getSupabaseAdmin();

  // 1. Fetch all auth users
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list auth users:', listError.message);
    process.exit(1);
  }

  const users = data?.users || [];
  console.log(`Found ${users.length} user(s) in auth.users:`);
  users.forEach((u) => console.log(` - ${u.email} (${u.id})`));

  // 2. Delete public table data associated with users
  console.log('Clearing public tables (profiles, settings, etc.)...');
  try {
    await supabase.from('user_settings').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('user_settings clear warning:', err.message);
  }

  try {
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('profiles clear warning:', err.message);
  }

  // 3. Delete each user from Supabase Auth
  for (const user of users) {
    console.log(`Deleting auth user: ${user.email} (${user.id})...`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`❌ Failed to delete ${user.email}:`, deleteError.message);
    } else {
      console.log(`✓ Deleted ${user.email}`);
    }
  }

  // 4. Verify that auth.users and profiles are completely empty
  const { data: remainingData } = await supabase.auth.admin.listUsers();
  const remainingCount = remainingData?.users?.length || 0;
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  console.log('\n=======================================');
  console.log(`🎉 Reset complete!`);
  console.log(`Remaining auth users: ${remainingCount}`);
  console.log(`Remaining profiles:   ${profileCount ?? 0}`);
  console.log('You can now start completely fresh and register a new admin account.');
  console.log('=======================================\n');
}

resetAllUsers().catch((err) => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});

