import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verify() {
    console.log('Testing connection to:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1 });

    if (error) {
        console.error('❌ Auth Admin check failed:', error.message);
        process.exit(1);
    }

    console.log('✅ Successfully connected and authenticated as admin');
    console.log('Sample user ID:', users[0]?.id);
}

verify().catch(console.error);
