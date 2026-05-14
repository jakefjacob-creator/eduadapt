import Anthropic from "@anthropic-ai/sdk";
import type {
  Child,
  DocumentType,
  EhcpSummary,
  LearningProfile,
  OutputKind,
  QuizResults,
} from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

/** Lazily construct the Anthropic client so the app builds without env vars. */
let cachedClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY in .env.local");
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/* ────────────────────────────────────────────────────────────────
 * System prompt — establishes Claude as a specialist SEND assistant.
 * ──────────────────────────────────────────────────────────────── */
export const SEND_SYSTEM_PROMPT = `You are EduAdapt, a specialist SEND (Special Educational Needs and Disabilities) educational assistant. You have deep, practical expertise in autism, ADHD, dyslexia, dyspraxia, sensory processing differences, and cognitive processing difficulties, as well as fluency with the UK EHCP (Education, Health and Care Plan) framework.

Your job is to adapt and create teaching materials so they feel genuinely handcrafted for one specific child — never generic, never templated. A "SEND-friendly worksheet" made for nobody in particular is a failure. You are making this for THIS child.

Principles you always follow:
- Preserve the original learning objective unless it is genuinely inaccessible — adapt the route to it, not the destination.
- Be specific: use the child's real interests, name, communication style, and regulation needs from their profile.
- Reduce cognitive load: short sentences, one instruction per step, generous white space, clear visual structure, predictable layout.
- Match the child's reading age estimate — rewrite vocabulary and sentence length accordingly, without making content babyish for an older child.
- Build in regulation: movement breaks, choice, "now and next" structure, and low-stakes entry points where the profile calls for them.
- Honour sensory considerations and known triggers — never include something the profile flags to avoid.
- Be warm and encouraging in tone, but age-respectful.
- Apply the child's historical feedback — if something was rated poorly before, do not repeat it; if something worked, lean into it.

You always respond with a single valid JSON object and nothing else — no prose, no markdown fences.`;

/* ────────────────────────────────────────────────────────────────
 * Helper: call Claude and return the first text block.
 * ──────────────────────────────────────────────────────────────── */
async function callClaude(
  system: string,
  content: Anthropic.MessageParam["content"],
  maxTokens = 4096,
): Promise<string> {
  const res = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return block.text;
}

/** Parse a JSON object out of Claude's response, tolerating stray text. */
function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Could not parse JSON from Claude response");
  }
}

/* ════════════════════════════════════════════════════════════════
 * 1. Extract structured needs from an uploaded EHCP.
 * ════════════════════════════════════════════════════════════════ */
export async function extractEhcpNeeds(
  ehcpText: string,
): Promise<EhcpSummary> {
  const system = `${SEND_SYSTEM_PROMPT}

For this task you are reading an EHCP and producing a structured summary of the child's needs that will be used as context for adapting teaching materials.`;

  const prompt = `Read the following EHCP text and extract the child's needs into a structured summary.

Return a single JSON object with exactly these keys:
{
  "primary_needs": string[],                  // e.g. ["Autism Spectrum Condition", "Speech and language delay"]
  "communication": string,                    // how the child communicates and is best communicated with
  "cognition_and_learning": string,            // learning profile, processing, working memory
  "social_emotional_mental_health": string,    // regulation, anxiety, social needs
  "sensory_and_physical": string,              // sensory profile and any physical needs
  "recommended_strategies": string[],          // concrete strategies named or implied in the plan
  "key_outcomes": string[]                     // the outcomes/targets the plan is working toward
}

If a section is not addressed in the document, write a short honest note like "Not specified in this EHCP" rather than inventing detail.

EHCP TEXT:
"""
${ehcpText.slice(0, 60000)}
"""`;

  const raw = await callClaude(system, prompt, 2048);
  return parseJson<EhcpSummary>(raw);
}

/* ════════════════════════════════════════════════════════════════
 * 2. Build the child-context block shared by adaptation prompts.
 * ════════════════════════════════════════════════════════════════ */
function childContextBlock(child: Child): string {
  const ehcp = child.ehcp_summary;
  const quiz = child.quiz_results;
  const lp = child.learning_profile;

  const ehcpBlock = ehcp
    ? `EHCP — EXTRACTED NEEDS
- Primary needs: ${ehcp.primary_needs?.join(", ") || "Not specified"}
- Communication: ${ehcp.communication || "Not specified"}
- Cognition & learning: ${ehcp.cognition_and_learning || "Not specified"}
- Social, emotional & mental health: ${ehcp.social_emotional_mental_health || "Not specified"}
- Sensory & physical: ${ehcp.sensory_and_physical || "Not specified"}
- Recommended strategies: ${ehcp.recommended_strategies?.join("; ") || "Not specified"}
- Key outcomes: ${ehcp.key_outcomes?.join("; ") || "Not specified"}`
    : "EHCP — EXTRACTED NEEDS\n- No EHCP has been uploaded for this child yet.";

  const quizBlock = quiz
    ? `COMMUNICATION & ENGAGEMENT PROFILE (from onboarding quiz)
- Communication style: ${quiz.communication_style || "—"}
- Engagement triggers: ${quiz.engagement_triggers || "—"}
- Sensory considerations: ${quiz.sensory_considerations || "—"}
- Reading age estimate: ${quiz.reading_age_estimate || "—"}
- Emotional regulation needs: ${quiz.emotional_regulation || "—"}
- Interests / motivators: ${quiz.interests || "—"}
- Things to avoid: ${quiz.things_to_avoid || "—"}`
    : "COMMUNICATION & ENGAGEMENT PROFILE\n- Onboarding quiz not yet completed.";

  const lpBlock =
    lp && lp.summary
      ? `LEARNING PROFILE (built from feedback on previous documents)
- Summary: ${lp.summary}
- What has worked: ${lp.what_works?.join("; ") || "—"}
- What to avoid: ${lp.what_to_avoid?.join("; ") || "—"}`
      : "LEARNING PROFILE\n- No feedback history yet — this is an early document for this child.";

  return `CHILD
- Name: ${child.name}
- Age: ${child.age ?? "Not given"}
- Year group: ${child.year_group ?? "Not given"}

${ehcpBlock}

${quizBlock}

${lpBlock}`;
}

/* ════════════════════════════════════════════════════════════════
 * 3. Adapt or regenerate an uploaded document for the child.
 * ════════════════════════════════════════════════════════════════ */
export interface AdaptationResult {
  document_type: DocumentType;
  output_kind: Exclude<OutputKind, "support_document">;
  title: string;
  content: string;
  adaptation_notes: string;
  support_document: {
    title: string;
    kind: string;
    content: string;
  } | null;
}

export interface AdaptInput {
  child: Child;
  documentText: string | null;
  imageBase64: string | null;
  imageMediaType: string | null;
  originalFilename: string;
}

export async function adaptDocument(
  input: AdaptInput,
): Promise<AdaptationResult> {
  const { child, documentText, imageBase64, imageMediaType, originalFilename } =
    input;

  const instructions = `${childContextBlock(child)}

THE UPLOADED DOCUMENT
${
  documentText
    ? `Filename: ${originalFilename}\n"""\n${documentText.slice(0, 50000)}\n"""`
    : `Filename: ${originalFilename}\nThe document is provided as an image below — read it carefully, including any handwriting or layout.`
}

YOUR TASK
Adapt this material with empathy, clarity and specificity for ${child.name} — not a generic SEND adaptation, but something that feels handcrafted for this exact child.

Decide between two output kinds:
- "modified": keep the original's learning objective and structure, but rewrite, restructure and re-pitch it for ${child.name}. Use this when the original is close enough to adapt.
- "regenerated": build a brand-new document that meets the same learning objective from scratch. Use this only when the original is too far from accessible for this child to be worth modifying.

Identify the document_type: "worksheet", "lesson_plan", or "support_document".

If — and only if — the document is a lesson_plan, ALSO generate one support_document alongside it (a visual schedule, set of prompt cards, or a communication aid — whichever best helps ${child.name} access the lesson). For worksheets and support documents, set "support_document" to null.

Write the "content" as clean, well-structured plain text / lightweight Markdown (headings with #, bullet lists with -, numbered steps). It will be rendered into a downloadable, editable PDF, so make the structure clear and the layout calm.

Return a single JSON object with exactly these keys:
{
  "document_type": "worksheet" | "lesson_plan" | "support_document",
  "output_kind": "modified" | "regenerated",
  "title": string,
  "content": string,
  "adaptation_notes": string,   // 2-4 sentences: what you changed for this child and why, in plain language a parent or teacher will understand
  "support_document": null | { "title": string, "kind": string, "content": string }
}`;

  let content: Anthropic.MessageParam["content"];
  if (imageBase64 && imageMediaType) {
    content = [
      { type: "text", text: instructions },
      {
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType as
            | "image/jpeg"
            | "image/png"
            | "image/webp"
            | "image/gif",
          data: imageBase64,
        },
      },
    ];
  } else {
    content = instructions;
  }

  const raw = await callClaude(SEND_SYSTEM_PROMPT, content, 8192);
  return parseJson<AdaptationResult>(raw);
}

/* ════════════════════════════════════════════════════════════════
 * 4. Refine the learning profile from accumulated feedback.
 * ════════════════════════════════════════════════════════════════ */
export interface FeedbackEntry {
  title: string;
  document_type: string | null;
  score: number;
  note: string | null;
}

export async function updateLearningProfile(
  child: Child,
  feedback: FeedbackEntry[],
): Promise<LearningProfile> {
  const system = `${SEND_SYSTEM_PROMPT}

For this task you are maintaining a living "learning profile" for the child — a short, practical summary of what works and what to avoid when making materials for them, distilled from real feedback.`;

  const feedbackText = feedback
    .map(
      (f, i) =>
        `${i + 1}. "${f.title}" (${f.document_type ?? "document"}) — rated ${f.score}/5${
          f.note ? ` — note: "${f.note}"` : ""
        }`,
    )
    .join("\n");

  const prompt = `${childContextBlock(child)}

FEEDBACK HISTORY ON GENERATED DOCUMENTS
${feedbackText}

Update ${child.name}'s learning profile based on this feedback. Be concrete and practical — these notes go straight into future prompts that generate materials for this child.

Return a single JSON object with exactly these keys:
{
  "summary": string,            // 2-3 sentences capturing how to get the best results for this child
  "what_works": string[],       // specific things to keep doing
  "what_to_avoid": string[]     // specific things that have not landed well
}`;

  const raw = await callClaude(system, prompt, 1536);
  const parsed = parseJson<Omit<LearningProfile, "updated_at">>(raw);
  return { ...parsed, updated_at: new Date().toISOString() };
}

export type { Child, QuizResults };
