// A run of 4+ dots (or "…" characters), allowing spaces between them: the dot leaders a table of
// contents uses to join a heading to its page number. Three dots on their own stay untouched, so
// an ordinary "..." in a sentence is still read as a pause.
const DOT_LEADER = String.raw`(?:[.…]\s*){4,}`;

const LEADER_THEN_PAGE_NUMBER = new RegExp(String.raw`\s*${DOT_LEADER}(\d{1,4})\b\.?`, 'g');
const LEADER_WITHOUT_NUMBER = new RegExp(String.raw`\s*${DOT_LEADER}`, 'g');

// Rewrites text so read-aloud sounds natural: "Introduction ........ 23" becomes
// "Introduction, page 23." instead of the voice saying "dot dot dot…" or stalling.
export function tidyTextForSpeech(text: string): string {
  return text
    .replace(LEADER_THEN_PAGE_NUMBER, ', page $1. ')
    .replace(LEADER_WITHOUT_NUMBER, ', ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}
