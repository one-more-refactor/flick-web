// flick-core-generated demo timelines, copied from the app (flick/web/src/lib/
// demos.ts). ORP index + weight are engine truth — never recompute them here.
import type { TimelineWord } from './types';

/** "You are reading at seven hundred words per minute. …" */
export const AUTH_DEMO_WORDS: TimelineWord[] = [
  ['You', 1, 1.0],
  ['are', 1, 1.0],
  ['reading', 2, 1.0],
  ['at', 1, 1.0],
  ['seven', 1, 1.0],
  ['hundred', 2, 1.0],
  ['words', 1, 1.0],
  ['per', 1, 1.0],
  ['minute.', 2, 2.1],
  ['One', 1, 1.0],
  ['word', 1, 1.0],
  ['at', 1, 1.0],
  ['a', 0, 1.0],
  ['time.', 1, 2.1],
  ['Your', 1, 1.0],
  ['eye', 1, 1.0],
  ['never', 1, 1.0],
  ['moves.', 1, 2.1],
];

/** Tiny loop for the phone vignette in the use-cases grid. Hand-authored for
 *  the landing with the same classic ORP rule the engine timelines above
 *  follow (len 1 → 0, 2–5 → 1, 6–9 → 2, 10+ → 3; punctuation counts). */
export const COMMUTE_DEMO_WORDS: TimelineWord[] = [
  ['one', 1, 1.0],
  ['word', 1, 1.0],
  ['is', 1, 1.0],
  ['plenty', 2, 1.0],
  ['on', 1, 1.0],
  ['a', 0, 1.0],
  ['crowded', 2, 1.0],
  ['train.', 2, 2.1],
];

/** How the accent letter anchors the eye (the pivot / ORP explainer). */
export const ANCHOR_DEMO_WORDS: TimelineWord[] = [
  ['The', 1, 1.0],
  ['red', 1, 1.0],
  ['letter', 2, 1.0],
  ['is', 1, 1.0],
  ['the', 1, 1.0],
  ['anchor.', 2, 2.1],
  ['Your', 1, 1.0],
  ['eye', 1, 1.0],
  ['locks', 1, 1.0],
  ['onto', 1, 1.0],
  ['it,', 1, 1.6],
  ['and', 1, 1.0],
  ['the', 1, 1.0],
  ['words', 1, 1.0],
  ['come', 1, 1.0],
  ['to', 1, 1.0],
  ['you', 1, 1.0],
  ['instead.', 2, 2.1],
];
