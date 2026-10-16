// Server Actions receive whatever the browser sends. TypeScript types are erased at runtime, so
// an action that passes its input object straight to the database lets a caller write any column
// (another user's id, a course's owner...). Actions copy only the fields their form sends with
// this; fields that are missing or undefined are left out, so partial updates keep working.
export function pickFields<T extends object, K extends keyof T>(input: T, keys: readonly K[]): Pick<T, K> {
  const picked = {} as Pick<T, K>;
  if (typeof input !== 'object' || input === null) return picked;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) picked[key] = input[key];
  }
  return picked;
}
