/**
 * The gate.
 *
 * Before the model is asked for a full description, one cheap question is
 * asked of the picture: is this actually a piece of clothing?
 *
 * Staff photograph dresses all day, but they also photograph fabric, shoes,
 * a customer's own dress at a fitting, or the room itself. Describing a
 * room as a gown wastes the whole request and fills the catalogue with
 * fiction. The gate refuses those photos before the expensive call happens,
 * which is also the cheapest way to keep the token bill down.
 *
 * The gate is asked through the Decisions API, which is built for exactly
 * this: one yes/no question, a calibrated probability instead of a word to
 * parse, and no output tokens at all. It costs a tenth of a cent per
 * thousand image tokens and nothing for the answer.
 */

/** The gate's answer. */
export type GateVerdict = 'garment' | 'not_garment' | 'unclear';

export interface GateResult {
  verdict: GateVerdict;
  /** What the gate thinks the photo shows, for the message to the user. */
  subject: string;
  /** The model's own words for the reason, when it refused. */
  reason: string;
  /** How sure the gate was, 0 to 1. */
  confidence: number;
  /** The probability that this is a garment, 0 to 1. */
  probability: number;
}

/**
 * Above this probability the photo is a garment.
 *
 * The API never returns 0 or 1, and a wrong refusal costs the owner a
 * dress, so the bar is set high. Between the two thresholds the answer is
 * "unclear" and the full description gets the final say.
 *
 * The thresholds come from what the live model actually produced, not from
 * a guess. Measured against eleven real photographs:
 *
 *   real dresses, in every condition (full, tight crop, dim room, out of
 *   focus, a 320px upload)          0.926 - 0.951
 *
 *   a dark room with a person in it   0.343
 *   a plain room                     refused
 *   a screen of text                 refused
 *   a face with no clothing in frame refused
 *   a pile of loose fabric           refused
 *   a car                            refused
 *
 * The widest gap is between 0.343 and 0.926, so 0.50 sits in the middle of
 * it with room on both sides: a dress would have to look half as likely to
 * be a garment as not before it was turned away.
 */
export const GARMENT_THRESHOLD = 0.80;
export const NOT_GARMENT_THRESHOLD = 0.50;

/** The question, and what a yes and a no mean. */
export const GATE_QUESTION = {
  type: 'noul' as const,
  instructions:
    'Is a wearable garment of clothing visible in this photograph? ' +
    'A dress, gown, jumpsuit, suit, cape, bolero, veil, abaya, kaftan or similar ' +
    'counts, whether it is being worn by a person, on a mannequin, on a hanger, or laid flat. ' +
    'A bride wearing her wedding gown IS a garment photograph - this is the most common catalogue ' +
    'photograph there is, and a face in the frame does not change the answer. ' +
    'Low light and blur are not reasons to say no.',
  criteria: {
    true_description:
      'A wearable garment is visible: worn by a person, on a mannequin, on a hanger, or laid flat. ' +
      'You can see the fabric, a neckline, a sleeve, a bodice or a skirt.',
    false_description:
      'No wearable garment is visible at all: a bare face, a head-and-shoulders portrait with no clothing ' +
      'in frame, a room, a wall, a computer screen, a document, food, a landscape, a car, a bag, ' +
      'shoes alone, jewellery alone, or a pile of fabric with no finished garment.',
  },
};

/**
 * Turns the Decisions API answer into a verdict.
 *
 * The answer is a calibrated probability, so there is no text to parse and
 * no JSON to break. The middle band is deliberately "unclear": a real dress
 * must never be refused, so anything the gate is not sure about is passed
 * on to the full description instead of being turned away.
 */
export function verdictFromProbability(probability: number, _confidence: number): GateVerdict {
  if (probability >= GARMENT_THRESHOLD) return 'garment';
  if (probability <= NOT_GARMENT_THRESHOLD) return 'not_garment';
  return 'unclear';
}

/**
 * Reads the answer out of the Decisions API response.
 *
 * Returns null when the response does not carry the answer, so the caller
 * can fall back to describing the photo rather than refusing it.
 */
export function parseDecision(raw: unknown): GateResult | null {
  const body = raw as {
    answers?: Record<string, { type?: string; noul?: number; confidence?: number }>;
  } | null;
  const answer = body?.answers?.is_garment;
  if (!answer || typeof answer.noul !== 'number') return null;

  const probability = answer.noul;
  const confidence = typeof answer.confidence === 'number' ? answer.confidence : probability;

  return {
    verdict: verdictFromProbability(probability, confidence),
    subject: '',
    reason: '',
    confidence,
    probability,
  };
}
