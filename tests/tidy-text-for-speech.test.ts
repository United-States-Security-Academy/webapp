import { describe, expect, it } from 'vitest';
import { tidyTextForSpeech } from '@/features/pdf/tidy-text-for-speech';

describe('tidyTextForSpeech', () => {
  it('turns a table-of-contents dot leader into "page N"', () => {
    expect(tidyTextForSpeech('Introduction ........................ 23')).toBe('Introduction, page 23.');
  });

  it('handles several entries and leaders broken up by spaces', () => {
    expect(
      tidyTextForSpeech('Patrol Basics ....... ................................ ... 23 Report Writing . . . . . . . 50'),
    ).toBe('Patrol Basics, page 23. Report Writing, page 50.');
  });

  it('handles the single-character ellipsis used as a leader', () => {
    expect(tidyTextForSpeech('Use of Force ………… 7')).toBe('Use of Force, page 7.');
  });

  it('replaces a leader with no page number by a short pause', () => {
    expect(tidyTextForSpeech('Name .................... Date')).toBe('Name, Date');
  });

  it('leaves ordinary sentences and a normal ellipsis alone', () => {
    expect(tidyTextForSpeech('Wait for backup... then proceed. Section 1.2 covers this.')).toBe(
      'Wait for backup... then proceed. Section 1.2 covers this.',
    );
  });
});
