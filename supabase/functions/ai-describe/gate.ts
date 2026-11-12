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
 * The gate only ever answers yes or no. It never sees the catalogue and it
 * never writes a name.
 */

/** The gate's answer. */
export type GateVerdict = 'garment' | 'not_garment' | 'unclear';

export interface GateResult {
  verdict: GateVerdict;
  /** What the gate thinks the photo shows, for the message to the user. */
  subject: string;
  /** The model's own words for the reason, when it refused. */
  reason: string;
}

export const GATE_PROMPT = `You are a photo classifier for a wedding dress atelier.

Look at the photo and decide ONE thing: is any wearable garment of clothing visible in it?

Answer "garment" if you can see a dress, gown, jumpsuit, suit, cape, bolero, veil, abaya, kaftan or similar wearable garment - whether it is being WORN by a person, on a mannequin, on a hanger, or laid flat.

A BRIDE WEARING HER WEDDING GOWN IS A GARMENT PHOTO. This is the most common catalogue photograph there is. A face in the frame does NOT make the answer "not_garment". If the person is wearing something and you can see the fabric, the neckline, the sleeve, the bodice or the skirt, the answer is "garment".

Answer "not_garment" only when NO wearable garment is visible at all: a bare face, or a head-and-shoulders portrait with no clothing in frame, a room, a wall, a computer screen, a document, food, a landscape, a car, a bag, shoes alone, jewellery alone, or a pile of fabric with no finished garment.

Answer "unclear" if you genuinely cannot tell - the photo is so dark or so blurred that you cannot see whether anyone is wearing anything.

Be strict about refusing a photograph with no garment in it, but do NOT refuse a photograph of a person who is wearing a garment. Low light and blur are not reasons to refuse: if you can tell it is a bridal gown, answer "garment" even if the picture is dim.

Reply with JSON only, no other text:
{"verdict":"garment"|"not_garment"|"unclear","subject":"what you actually see, 4 words max","reason":"one short sentence"}`;

/**
 * Turns the gate's raw answer into a verdict.
 *
 * The model is asked for JSON, but a small model can still answer in prose,
 * so the text is searched for the verdict rather than trusted blindly.
 */
export function parseGate(raw: string): GateResult {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let subject = '';
  let reason = '';
  let verdict: GateVerdict | null = null;

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const v = typeof record.verdict === 'string' ? record.verdict.trim().toLowerCase() : '';
      if (v === 'garment' || v === 'not_garment' || v === 'unclear') {
        verdict = v;
      }
      if (typeof record.subject === 'string') subject = record.subject.trim().slice(0, 80);
      if (typeof record.reason === 'string') reason = record.reason.trim().slice(0, 200);
    } else if (typeof parsed === 'string') {
      // A bare string answer, e.g. "garment".
      const v = parsed.trim().toLowerCase();
      if (v === 'garment' || v === 'not_garment' || v === 'unclear') verdict = v;
    }
  } catch {
    // Not JSON. Fall back to reading the words out of it.
    const lower = cleaned.toLowerCase();
    if (lower.includes('not_garment') || lower.includes('not a garment')) {
      verdict = 'not_garment';
    } else if (lower.includes('unclear')) {
      verdict = 'unclear';
    } else if (lower.includes('garment')) {
      verdict = 'garment';
    }
  }

  if (!verdict) {
    // The model said something we cannot read. Treat it as unclear and let
    // the full description decide, rather than refusing a real dress.
    return { verdict: 'unclear', subject, reason };
  }

  return { verdict, subject, reason };
}
