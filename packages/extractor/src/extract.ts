import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@soccer-card-radar/db";
import type { ExtractionResult } from "@soccer-card-radar/shared";

const EXTRACTION_PROMPT = `You are a soccer card metadata extractor. Given a listing title (and optional description), return a JSON object with:
- player: string | null  (canonical player name, full)
- year: number | null    (the card year, not the season — e.g. "2004-05 Mega Cracks" → 2004)
- set: string | null
- parallel: string | null  (e.g. "refractor", "gold /99", "auto")
- autograph: boolean
- isLot: boolean         (true if multi-card lot)
- condition: "raw" | "psa10" | "psa9" | "bgs10" | "other_graded" | null

Return ONLY the JSON. No commentary. If uncertain on any field, use null.`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for entity extraction");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function hashTitle(title: string): string {
  return createHash("sha256").update(normalizeTitle(title)).digest("hex");
}

async function getCachedExtraction(
  titleHash: string
): Promise<ExtractionResult | null> {
  const { data } = await supabase
    .from("ExtractionCache")
    .select("extracted")
    .eq("titleHash", titleHash)
    .single();

  if (data?.extracted) {
    return data.extracted as unknown as ExtractionResult;
  }
  return null;
}

async function setCachedExtraction(
  titleHash: string,
  extracted: ExtractionResult
): Promise<void> {
  await supabase.from("ExtractionCache").upsert({
    titleHash,
    extracted: extracted as unknown as Record<string, unknown>,
  });
}

async function callHaiku(
  title: string,
  description?: string
): Promise<ExtractionResult> {
  const anthropic = getClient();

  const userMessage = description
    ? `Title: ${title}\nDescription: ${description}`
    : `Title: ${title}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      player: parsed.player ?? null,
      year: parsed.year ?? null,
      set: parsed.set ?? null,
      parallel: parsed.parallel ?? null,
      autograph: Boolean(parsed.autograph),
      isLot: Boolean(parsed.isLot),
      condition: parsed.condition ?? null,
    };
  } catch {
    return {
      player: null,
      year: null,
      set: null,
      parallel: null,
      autograph: false,
      isLot: false,
      condition: null,
    };
  }
}

/**
 * Extract structured metadata from a listing title.
 * Uses SHA-256 cache on normalized title to minimize LLM calls.
 */
export async function extractListingMeta(
  title: string,
  description?: string
): Promise<ExtractionResult> {
  const titleHash = hashTitle(title);

  // Check cache first
  const cached = await getCachedExtraction(titleHash);
  if (cached) {
    return cached;
  }

  // Call Haiku
  const extracted = await callHaiku(title, description);

  // Cache the result
  await setCachedExtraction(titleHash, extracted);

  return extracted;
}
