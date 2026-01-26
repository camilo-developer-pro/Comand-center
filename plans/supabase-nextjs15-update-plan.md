# Supabase Next.js 15 Compatibility Update Plan

## Overview
Update the Supabase server client and middleware to be fully compatible with Next.js 15 async Request APIs, ensure proper database types for the new blocks table, and implement workspace-specific helper functions.

## Current State Analysis

### ✅ Already Compliant
1. `src/lib/supabase/server.ts` already uses `await cookies()` pattern (Next.js 15 compliant)
2. `blocks_v3` table exists in database schema and generated types

### ❌ Issues to Fix
1. **Database Types**: `@/db/types` import doesn't exist, `src/types/database.types.ts` has `Database = any`
2. **Middleware**: Uses synchronous `request.cookies.get()` instead of `await cookies()`
3. **Route Protection**: Only protects `/documents` routes, not `/workspace/*` routes
4. **Missing Helper**: No `createServerSupabaseClientWithWorkspace` helper function

## Implementation Plan

### 1. Create Proper Database Types (`@/db/types`)
- Create `db/types.ts` at project root
- Export comprehensive `Database` type matching Supabase schema
- Include `blocks_v3` table with proper relationships
- Include workspace-related tables and functions

### 2. Update `src/lib/supabase/server.ts`
- Change import from `@/db/types` to `@/db/types` (after creating file)
- Verify `await cookies()` pattern is already correct
- Add `createServerSupabaseClientWithWorkspace` helper function

### 3. Update `src/middleware.ts`
- Convert to use `await cookies()` pattern (Next.js 15)
- Add protection for `/workspace/*` routes
- Maintain existing `/documents` route protection
- Ensure session refresh works for workspace routes

### 4. Implement Helper Function
```typescript
export async function createServerSupabaseClientWithWorkspace(workspaceId: string) {
  const client = await createServerSupabaseClient();
  return {
    client,
    workspaceId,
    async getBlocks(parentId: string | null) {
      return client
        .from('blocks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('parent_id', parentId)
        .order('sort_order', { ascending: true });
    },
  };
}
```

### 5. Update `src/types/database.types.ts`
- Either update to proper Database type or deprecate in favor of `@/db/types`
- Ensure no breaking changes to existing code

## Files to Modify

1. `db/types.ts` (new)
2. `src/lib/supabase/server.ts`
3. `src/middleware.ts`
4. `src/types/database.types.ts` (optional)

## Verification Checklist

- [ ] `await cookies()` pattern confirmed in all files
- [ ] Database types include `blocks_v3` table
- [ ] No synchronous `cookies()` calls exist
- [ ] Auth refresh works for `/workspace/*` routes
- [ ] `createServerSupabaseClientWithWorkspace` helper works
- [ ] TypeScript compilation passes without errors
- [ ] Existing functionality remains intact

## Testing Strategy

1. **Type Checking**: Run `tsc --noEmit` to verify types
2. **Middleware Test**: Verify `/workspace/*` routes are protected
3. **Helper Test**: Test `createServerSupabaseClientWithWorkspace` with mock data
4. **Integration**: Ensure blocks queries work with workspace context

## Migration Notes

- The changes are backward compatible
- Existing code using `createServerSupabaseClient()` continues to work
- New workspace routes get proper authentication
- Database types provide better TypeScript support

## Definition of Done

1. ✅ `await cookies()` pattern confirmed (Next.js 15 compliant)
2. ✅ Database types include blocks table
3. ✅ No synchronous `cookies()` calls exist
4. ✅ Auth refresh works for workspace routes
5. ✅ Helper function implemented and tested