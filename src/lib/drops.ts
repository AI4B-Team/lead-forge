// Drop planning: large clean lists are split into fixed-size drops (default 500)
// and spread across the day instead of one simultaneous blast.

export const DEFAULT_DROP_TIMES = ["10:00", "12:00", "15:00", "17:00"];

export type PlannedDrop = { drop_index: number; scheduled_at: string; size: number };

/** Split `total` contacts into `dropSize` batches scheduled across `times` per day. */
export function planDrops(
  total: number,
  dropSize = 500,
  times: string[] = DEFAULT_DROP_TIMES,
  from: Date = new Date(),
): PlannedDrop[] {
  const size = Math.max(1, dropSize);
  const slots = times.length ? times : DEFAULT_DROP_TIMES;
  const count = Math.ceil(Math.max(0, total) / size);
  const drops: PlannedDrop[] = [];
  let remaining = total;
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / slots.length);
    const [h, m] = slots[i % slots.length].split(":").map(Number);
    const when = new Date(from);
    when.setDate(when.getDate() + dayOffset);
    when.setHours(h, m || 0, 0, 0);
    // Never schedule a new drop in the past on day 0 — push it to the next slot.
    if (when.getTime() < from.getTime()) when.setDate(when.getDate() + 1);
    drops.push({
      drop_index: i + 1,
      scheduled_at: when.toISOString(),
      size: Math.min(size, remaining),
    });
    remaining -= size;
  }
  return drops;
}

/** SMS segment count for GSM-7 style bodies (160 / 153 concatenated). */
export function segmentsFor(body: string): number {
  const len = body.length;
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

/** Estimated credits for a full campaign: recipients x segments across all steps. */
export function estimateCost(
  recipients: number,
  steps: Array<{ message_variants: string[] }>,
  creditsPerSegment = 1,
) {
  let segmentsPerRecipient = 0;
  for (const s of steps) {
    const longest = s.message_variants.reduce((a, b) => (b.length > a.length ? b : a), "");
    segmentsPerRecipient += segmentsFor(longest);
  }
  const segments = recipients * segmentsPerRecipient;
  return { recipients, segmentsPerRecipient, segments, credits: segments * creditsPerSegment };
}