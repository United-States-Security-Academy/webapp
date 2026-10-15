import { describe, expect, it } from 'vitest';
import { pickFields } from '@/pick-fields';

describe('pickFields', () => {
  it('keeps only the allowed fields, dropping anything extra a caller sent', () => {
    const input = { title: 'New title', ownerId: 'someone-else', status: 'published' } as { title: string };
    expect(pickFields(input, ['title'])).toEqual({ title: 'New title' });
  });

  it('leaves out missing and undefined fields but keeps null, for partial updates', () => {
    const input: { title?: string; summary?: string | null; timeLimitMinutes?: number | null } = { title: undefined, timeLimitMinutes: null };
    expect(pickFields(input, ['title', 'summary', 'timeLimitMinutes'])).toEqual({ timeLimitMinutes: null });
  });

  it('ignores inherited properties and non-object input', () => {
    const input = Object.create({ title: 'inherited' }) as { title?: string };
    expect(pickFields(input, ['title'])).toEqual({});
    expect(pickFields(null as unknown as { title: string }, ['title'])).toEqual({});
  });
});
