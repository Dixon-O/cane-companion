import { z } from 'zod';

// keep zod as peer — install at web/api when needed
export const placeSchema = z.object({
  id: z.string(),
  names: z.array(z.string()),
  aliases: z.array(z.string()),
  entrance: z.object({ lat: z.number(), lon: z.number(), radius_m: z.number() }),
  expected_sign_text: z.array(z.string())
});

export type Place = z.infer<typeof placeSchema>;

export const signReadingSchema = z.object({
  visible_text: z.array(z.string()),
  best_match_alias: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  position_in_frame: z.enum(['left','center','right','unknown']),
  frame_quality: z.enum(['good','poor'])
});
export type SignReading = z.infer<typeof signReadingSchema>;

// Arrival rule: deterministic, not model
export function isArrived(gpsDistM: number, radiusM: number, matches: number, frames: number){
  return gpsDistM <= radiusM && matches >= 2 && frames >= 3;
}
