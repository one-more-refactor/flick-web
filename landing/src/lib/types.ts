/** `[text, orp_index, weight]` — one word of a flick-core timeline.
 *  The pacing/ORP engine lives ONLY in flick-core; the landing just plays
 *  pre-computed demo timelines (see demos.ts), same as the app clients. */
export type TimelineWord = [string, number, number];
