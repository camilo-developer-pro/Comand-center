// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

describe('Supabase Connectivity Test', () => {
    it('should list users', async () => {
        const supabase = createClient(
            process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
        if (error) throw error;
        expect(data.users).toBeDefined();
    });
});
