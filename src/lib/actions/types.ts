/**
 * Standardized action result types for Server Actions
 */

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: string };

export function success<T>(data: T): ActionResult<T> {
    return { success: true, data };
}

export function failure(error: string, code?: string): ActionResult<never> {
    return { success: false, error, code };
}

/**
 * Type guard for checking if action succeeded
 */
export function isSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
    return result.success === true;
}
