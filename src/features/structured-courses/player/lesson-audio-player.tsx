'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { SpeechSegment } from './lesson-speech';

// waiting: everything open has been read and the rest of the lesson is locked behind a quiz.
type PlaybackState = 'idle' | 'playing' | 'paused' | 'waiting' | 'finished';

const READING_RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

// What to tell the learner for the speech errors that have a cause they can fix. Chrome reports
// "synthesis-failed" when the device has no working speakers or headphones.
const SPEECH_ERROR_MESSAGES: Partial<Record<SpeechSynthesisErrorCode, string>> = {
  'synthesis-failed': "Your device couldn't play the audio. Check that your speakers or headphones are connected and turned on, then press Resume.",
  'audio-hardware': "Your device couldn't play the audio. Check that your speakers or headphones are connected and turned on, then press Resume.",
  'audio-busy': 'Another app is using your audio. Close it, then press Resume.',
  'not-allowed': 'Your browser blocked the audio. Press Resume to try again.',
  network: 'The voice needs an internet connection. Check your connection, then press Resume.',
  'language-unavailable': "Your device doesn't have an English voice installed.",
  'voice-unavailable': "Your device doesn't have an English voice installed.",
};

// Reads a lesson aloud with the device's own voice (the browser's speech synthesis, like the
// Listen button on PDF lessons), one segment at a time, telling the player which block is being
// read so it can be highlighted. Pause stops speech and Resume restarts the current segment,
// because speechSynthesis.pause() doesn't work on some phones. When it reaches a quiz that locks
// the rest of the lesson it waits, and carries on by itself once the quiz is answered.
export function LessonAudioPlayer({
  segments,
  hasLockedContent,
  onActiveBlockChange,
}: {
  segments: SpeechSegment[];
  hasLockedContent: boolean;
  onActiveBlockChange: (blockIndex: number | null) => void;
}) {
  const [isSupported, setIsSupported] = useState(true);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [rate, setRate] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The segment being read, or the next one to read once paused or waiting.
  const positionRef = useRef(0);
  // Bumped whenever speech is cancelled, so callbacks from a cancelled utterance are ignored.
  const tokenRef = useRef(0);
  const segmentsRef = useRef(segments);
  const hasLockedContentRef = useRef(hasLockedContent);
  const rateRef = useRef(rate);
  const onActiveBlockChangeRef = useRef(onActiveBlockChange);

  useEffect(() => {
    segmentsRef.current = segments;
    hasLockedContentRef.current = hasLockedContent;
    onActiveBlockChangeRef.current = onActiveBlockChange;
  }, [segments, hasLockedContent, onActiveBlockChange]);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    return () => {
      tokenRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakSegment = useCallback(function speak(index: number, token: number) {
    const allSegments = segmentsRef.current;
    positionRef.current = index;
    if (index >= allSegments.length) {
      if (hasLockedContentRef.current) {
        setPlaybackState('waiting');
      } else {
        positionRef.current = 0;
        setPlaybackState('finished');
        onActiveBlockChangeRef.current(null);
      }
      return;
    }

    const segment = allSegments[index]!;
    onActiveBlockChangeRef.current(segment.blockIndex);
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.rate = rateRef.current;
    utterance.onend = () => {
      if (tokenRef.current === token) speak(index + 1, token);
    };
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled' || tokenRef.current !== token) return;
      console.warn('Lesson read-aloud failed:', event.error);
      setPlaybackState('paused');
      setErrorMessage(SPEECH_ERROR_MESSAGES[event.error] ?? 'Reading stopped unexpectedly. Press Resume to try again.');
    };
    window.speechSynthesis.speak(utterance);
    setPlaybackState('playing');
  }, []);

  const speakFrom = useCallback(
    (index: number) => {
      tokenRef.current += 1;
      window.speechSynthesis.cancel();
      setErrorMessage(null);
      speakSegment(index, tokenRef.current);
    },
    [speakSegment],
  );

  // A quiz was answered while waiting: read on into the content it unlocked.
  useEffect(() => {
    if (playbackState === 'waiting' && positionRef.current < segments.length) speakFrom(positionRef.current);
  }, [playbackState, segments, speakFrom]);

  function handlePause() {
    tokenRef.current += 1;
    window.speechSynthesis.cancel();
    setPlaybackState('paused');
  }

  function handleStop() {
    tokenRef.current += 1;
    window.speechSynthesis.cancel();
    positionRef.current = 0;
    setErrorMessage(null);
    setPlaybackState('idle');
    onActiveBlockChange(null);
  }

  function handleRateChange(newRate: number) {
    setRate(newRate);
    rateRef.current = newRate;
    // Takes effect straight away rather than at the next segment.
    if (playbackState === 'playing') speakFrom(positionRef.current);
  }

  if (!isSupported) return null;

  if (playbackState === 'idle' || playbackState === 'finished') {
    return (
      <div className="print:hidden">
        <Button variant="outline" onClick={() => speakFrom(0)}>
          <Icon name="play" className="h-4 w-4" />
          {playbackState === 'finished' ? 'Listen again' : 'Listen to this lesson'}
        </Button>
      </div>
    );
  }

  const statusMessage =
    errorMessage ??
    (playbackState === 'waiting' ? 'Answer the question to keep listening' : playbackState === 'paused' ? 'Paused' : 'Reading aloud');

  return (
    <>
      {/* Keeps the button's place in the lesson while the controls float at the bottom. */}
      <div aria-hidden className="h-[38px] print:hidden" />
      <div
        role="region"
        aria-label="Lesson audio"
        className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg print:hidden"
      >
        <p aria-live="polite" className={`order-first basis-full text-xs sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto ${errorMessage ? 'text-red-600' : 'text-slate-500'}`}>
          {statusMessage}
        </p>
        {playbackState === 'playing' ? (
          <Button variant="outline" onClick={handlePause}>
            <Icon name="pause" className="h-4 w-4" /> Pause
          </Button>
        ) : (
          <Button variant="outline" onClick={() => speakFrom(positionRef.current)} disabled={playbackState === 'waiting'}>
            <Icon name="play" className="h-4 w-4" /> Resume
          </Button>
        )}
        <Button variant="outline" onClick={handleStop}>
          Stop
        </Button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          Speed
          <select
            value={rate}
            onChange={(changeEvent) => handleRateChange(Number(changeEvent.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
          >
            {READING_RATE_OPTIONS.map((rateOption) => (
              <option key={rateOption} value={rateOption}>
                {rateOption}x
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
