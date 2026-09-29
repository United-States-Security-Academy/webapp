// Next.js redacts thrown Error messages from Server Actions by default in production — a client
// component's `catch (error) { error.message }` only ever sees a generic "error occurred in the
// Server Components render" string, no matter what was actually thrown. Returning the error as
// plain data instead (rather than throwing) is the documented way to get a real, useful message
// to the client in production. Every Server Action a client component calls directly should
// return this shape instead of throwing for validation/business-logic failures.
export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };
