import prisma from "../db.server";

/**
 * Google Gemini AI Service for Shopify SEO Suite.
 *
 * Communicates directly with Google Generative AI v1beta REST API.
 * Supports environment variable `GEMINI_API_KEY` and store-level DB configuration.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash"];

/**
 * Retrieves the effective Gemini API Key for the store.
 * Hierarchy:
 * 1. Store-specific key in DB (`SeoSetting.gemini_api_key`)
 * 2. Server environment variable `process.env.GEMINI_API_KEY`
 */
export async function getGeminiApiKey(shopDomain?: string): Promise<string | null> {
  if (shopDomain) {
    try {
      const setting = await prisma.seoSetting.findUnique({
        where: { shop_domain: shopDomain },
        select: { gemini_api_key: true },
      });
      if (setting?.gemini_api_key && setting.gemini_api_key.trim().length > 0) {
        return setting.gemini_api_key.trim();
      }
    } catch (err) {
      console.warn("[Gemini] Failed to query shop setting for API key:", err);
    }
  }

  const envKey = process.env.GEMINI_API_KEY?.trim();
  return envKey && envKey.length > 0 ? envKey : null;
}

export async function isGeminiConfigured(shopDomain?: string): Promise<boolean> {
  const key = await getGeminiApiKey(shopDomain);
  return Boolean(key);
}

export interface GeminiCallParams {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  shopDomain?: string;
  apiKey?: string;
}

export interface GeminiCallResult {
  text: string;
  model: string;
  rawJson?: any;
}

/**
 * Executes a call to Google Gemini with automatic fallback across models.
 */
export async function callGemini(params: GeminiCallParams): Promise<GeminiCallResult> {
  const key = params.apiKey || (await getGeminiApiKey(params.shopDomain));
  if (!key) {
    throw new Error("Google Gemini API Key is not configured. Add GEMINI_API_KEY in .env or Settings.");
  }

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

      const requestBody: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: params.prompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.4,
          maxOutputTokens: params.maxTokens ?? 2048,
        },
      };

      if (params.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: params.systemInstruction }],
        };
      }

      if (params.jsonMode) {
        requestBody.generationConfig.responseMimeType = "application/json";
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let parsedMessage = errorText;
        try {
          const errObj = JSON.parse(errorText);
          parsedMessage = errObj.error?.message || errorText;
        } catch {
          // ignore json parse error
        }

        // If it's a 404 (model not found), try next fallback model
        if (res.status === 404) {
          console.warn(`[Gemini] Model ${model} not available (404), falling back...`);
          lastError = new Error(`Model ${model} not found: ${parsedMessage}`);
          continue;
        }

        throw new Error(`Google Gemini API Error (${res.status}): ${parsedMessage}`);
      }

      const data: any = await res.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p: any) => p.text || "").join("") || "";

      if (!text && candidate?.finishReason) {
        throw new Error(`Gemini finished with reason: ${candidate.finishReason}`);
      }

      let rawJson: any = null;
      if (params.jsonMode && text) {
        try {
          rawJson = JSON.parse(text);
        } catch (jsonErr) {
          // If markdown-wrapped json codeblock, clean it
          const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
          rawJson = JSON.parse(cleaned);
        }
      }

      return { text, model, rawJson };
    } catch (err) {
      lastError = err as Error;
      console.warn(`[Gemini] Request with model ${model} failed:`, (err as Error).message);
    }
  }

  throw lastError || new Error("Failed to generate response from Google Gemini.");
}

/**
 * Tests the Gemini API Key connection.
 */
export async function testGeminiConnection(apiKey: string): Promise<{
  ok: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const result = await callGemini({
      prompt: "Respond with the single word 'CONNECTED'.",
      apiKey,
      maxTokens: 10,
      temperature: 0.1,
    });
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      model: result.model,
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------------------
// SEO SPECIFIC TOOLS POWERED BY GEMINI
// ---------------------------------------------------------------------------

export interface AiMetaTagResult {
  title: string;
  description: string;
  focusKeywords: string[];
  reasoning: string;
  characterCounts: {
    title: number;
    description: number;
  };
}

/**
 * Generates high-CTR, SEO-optimized Meta Title & Description for a Shopify product.
 */
export async function generateAiMetaTags(params: {
  productTitle: string;
  description?: string;
  vendor?: string;
  price?: string;
  category?: string;
  shopName: string;
  shopDomain?: string;
}): Promise<AiMetaTagResult> {
  const systemInstruction = `You are a world-class Shopify E-commerce SEO and Conversion Specialist.
Your job is to generate perfect Google Search Meta Titles and Meta Descriptions designed for:
1. Maximum organic search ranking relevance
2. High Click-Through Rate (CTR) with compelling, authentic copy
3. Strict character boundaries so Google does NOT truncate snippets.

STRICT RULES:
- Meta Title: Strictly between 50 and 60 characters. Do not end with an ellipsis. Include the main product name, key benefit/attribute, and brand or store name.
- Meta Description: Strictly between 145 and 158 characters. Include an emotional hook, primary benefit, key value prop (e.g., quality, shipping, deal), and a clear action verb (CTA).
- Do not invent false guarantees or nonexistent certifications.
- Output strictly valid JSON matching the requested schema.`;

  const prompt = `Generate optimized SEO Meta Title and Meta Description for the following Shopify product:

Product Name: ${params.productTitle}
Store Name: ${params.shopName}
Brand/Vendor: ${params.vendor || "N/A"}
Price: ${params.price || "N/A"}
Category/Type: ${params.category || "N/A"}
Existing Description: ${(params.description || "").slice(0, 500)}

Respond with JSON format:
{
  "title": "Optimized Meta Title (50-60 chars)",
  "description": "Optimized Meta Description (145-158 chars)",
  "focusKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "reasoning": "Brief explanation of why this copy ranks and converts"
}`;

  const res = await callGemini({
    prompt,
    systemInstruction,
    jsonMode: true,
    shopDomain: params.shopDomain,
    temperature: 0.3,
  });

  const parsed = res.rawJson || {};
  let title = (parsed.title || `${params.productTitle} | Buy at ${params.shopName}`).trim();
  let description = (parsed.description || `Shop ${params.productTitle} online at ${params.shopName}. Discover premium quality, best value, and fast doorstep delivery. Order today!`).trim();

  // Enforce boundary safety
  if (title.length > 65) title = title.slice(0, 62).trim() + "...";
  if (description.length > 165) description = description.slice(0, 157).trim() + "...";

  return {
    title,
    description,
    focusKeywords: Array.isArray(parsed.focusKeywords) ? parsed.focusKeywords : [],
    reasoning: parsed.reasoning || "Optimized for search intent and maximum click-through rate.",
    characterCounts: {
      title: title.length,
      description: description.length,
    },
  };
}

export interface AiProductEnrichmentResult {
  enhancedDescriptionHtml: string;
  imageAlt: string;
  suggestedProductType: string;
  tags: string[];
}

/**
 * Enhances thin product data with rich HTML description, image alt text, and categories.
 */
export async function generateAiProductEnrichment(params: {
  productTitle: string;
  existingDesc?: string;
  vendor?: string;
  category?: string;
  shopDomain?: string;
}): Promise<AiProductEnrichmentResult> {
  const prompt = `Enhance this Shopify product data to be 100% complete for Google Shopping and AI Search Engines (ChatGPT Search, Google AI Overviews).

Product Name: ${params.productTitle}
Brand/Vendor: ${params.vendor || "Artisan"}
Category: ${params.category || ""}
Existing Description: ${params.existingDesc || "None"}

Requirements:
1. Enhanced Description: 100-200 words of engaging, benefits-focused HTML using only <p>, <ul>, <li>, <strong>. Must include:
   - Overview hook
   - Key Features bullet points
   - Specifications or care
2. Image Alt Text: Concise, descriptive (10-15 words) describing the product for accessibility and visual search.
3. Suggested Product Type: Standard e-commerce category name.
4. Tags: 5-8 relevant comma-separated tags.

Respond in JSON format:
{
  "enhancedDescriptionHtml": "<p>...</p><ul><li>...</li></ul>",
  "imageAlt": "Descriptive alt text",
  "suggestedProductType": "Category",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const res = await callGemini({
    prompt,
    jsonMode: true,
    shopDomain: params.shopDomain,
    temperature: 0.3,
  });

  const parsed = res.rawJson || {};
  return {
    enhancedDescriptionHtml: parsed.enhancedDescriptionHtml || `<p>${params.productTitle} offers premium quality and reliable everyday performance. Designed with attention to detail and crafted to meet high standards.</p>`,
    imageAlt: parsed.imageAlt || `${params.productTitle} by ${params.vendor || "Brand"} front view`,
    suggestedProductType: parsed.suggestedProductType || params.category || "General Merchandise",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

/**
 * Generates an SEO article draft for a topic cluster using Google Gemini.
 */
export async function generateAiArticleContent(params: {
  topic: string;
  queries: { query: string; impressions: number; position: number }[];
  shopName: string;
  shopDomain?: string;
}): Promise<string | null> {
  const queryList = params.queries
    .slice(0, 15)
    .map((q) => `- "${q.query}" (${q.impressions} impressions, position #${q.position})`)
    .join("\n");

  const prompt = `You are writing an authoritative, search-optimized educational blog post for the Shopify store "${params.shopName}".

TOPIC: ${params.topic}

SEARCH QUERIES REAL CUSTOMERS ARE SEARCHING FOR:
${queryList}

EDITORIAL REQUIREMENTS:
- Write 800-1100 words in clean, semantic HTML: use only <h2>, <h3>, <p>, <ul>, <li>, <strong>. Do not use <html>, <head>, <body>, or <h1>.
- Direct Answer: Answer the core search questions directly in the first two paragraphs so the page is eligible for Google Featured Snippets and AI Overviews.
- In-depth, practical, helpful advice tailored to people looking to buy or learn about this category.
- Naturally weave in the search queries without keyword stuffing.
- Include a "Frequently Asked Questions" (FAQ) section at the end with 3-4 common customer questions.
- Maintain a helpful, authentic human tone. Do not invent false medical or legal claims.
- Return ONLY the HTML body content.`;

  try {
    const res = await callGemini({
      prompt,
      shopDomain: params.shopDomain,
      temperature: 0.4,
      maxTokens: 3000,
    });
    return res.text.replace(/```html/gi, "").replace(/```/g, "").trim();
  } catch (err) {
    console.warn("[Gemini Content Generator] Generation failed:", err);
    return null;
  }
}

/**
 * Queries Gemini for real shopping citation tracking (e.g., "What are the best stores to buy X?").
 */
export async function askGeminiBuyingQuestion(
  question: string,
  apiKey?: string
): Promise<string | null> {
  try {
    const res = await callGemini({
      prompt: question,
      apiKey,
      temperature: 0.3,
      maxTokens: 600,
    });
    return res.text;
  } catch (err) {
    console.warn("[Gemini Citation] Call failed:", err);
    return null;
  }
}
