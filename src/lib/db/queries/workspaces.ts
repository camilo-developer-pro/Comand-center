import { db } from '../index';
import type { InsertableTable, SelectableTable } from '../index';

export async function createWorkspace(
    data: InsertableTable<'workspaces'>
): Promise<SelectableTable<'workspaces'>> {
    return await db
        .insertInto('workspaces')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function getWorkspacesByUserId(
    userId: string
): Promise<SelectableTable<'workspaces'>[]> {
    return await db
        .selectFrom('workspaces')
        .innerJoin(
            'workspace_members',
            'workspace_members.workspace_id',
            'workspaces.id'
        )
        .where('workspace_members.user_id', '=', userId)
        .selectAll('workspaces')
        .execute();
}

export async function getWorkspaceBySlug(
    slug: string
): Promise<SelectableTable<'workspaces'> | undefined> {
    return await db
        .selectFrom('workspaces')
        .where('slug', '=', slug.toLowerCase())
        .selectAll()
        .executeTakeFirst();
}
