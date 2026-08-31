export interface ParsedHtmlMetadata {
  url: string;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string | null;
  h1Count: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  imageAlts: string[];
  jsonLdBlocks: Record<string, any>[];
  wordCount: number;
  isReachable: boolean;
  statusCode: number;
}

export function parseHtmlContent(url: string, htmlText: string, statusCode = 200): ParsedHtmlMetadata {
  // Title extraction
  const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Meta description extraction
  const descMatch = htmlText.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
                    htmlText.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : null;

  // Canonical extraction
  const canonicalMatch = htmlText.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i) ||
                         htmlText.match(/<link\s+href=["']([\s\S]*?)["']\s+rel=["']canonical["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  // Robots meta extraction
  const robotsMatch = htmlText.match(/<meta\s+name=["']robots["']\s+content=["']([\s\S]*?)["']/i);
  const robotsMeta = robotsMatch ? robotsMatch[1].trim() : null;

  // H1 extraction
  const h1Matches = Array.from(htmlText.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1 = h1Matches.length > 0 ? h1Matches[0][1].replace(/<[^>]+>/g, "").trim() : null;

  // Images & ALT text extraction
  const imgMatches = Array.from(htmlText.matchAll(/<img[^>]+>/gi));
  let imagesMissingAlt = 0;
  const imageAlts: string[] = [];
  for (const imgTag of imgMatches) {
    const altMatch = imgTag[0].match(/alt=["']([\s\S]*?)["']/i);
    if (!altMatch || !altMatch[1].trim()) {
      imagesMissingAlt++;
    } else {
      imageAlts.push(altMatch[1].trim());
    }
  }

  // JSON-LD blocks extraction
  const jsonLdBlocks: Record<string, any>[] = [];
  const scriptMatches = Array.from(htmlText.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const scriptTag of scriptMatches) {
    try {
      const parsed = JSON.parse(scriptTag[1].trim());
      jsonLdBlocks.push(parsed);
    } catch {
      // Ignore invalid JSON-LD syntax
    }
  }

  // Word count estimation
  const textOnly = htmlText.replace(/<script[\s\S]*?<\/script>/gi, "")
                           .replace(/<style[\s\S]*?<\/style>/gi, "")
                           .replace(/<[^>]+>/g, " ")
                           .replace(/\s+/g, " ")
                           .trim();
  const wordCount = textOnly ? textOnly.split(" ").length : 0;

  return {
    url,
    title,
    titleLength: title ? title.length : 0,
    description,
    descriptionLength: description ? description.length : 0,
    canonical,
    robotsMeta,
    h1,
    h1Count: h1Matches.length,
    imagesTotal: imgMatches.length,
    imagesMissingAlt,
    imageAlts,
    jsonLdBlocks,
    wordCount,
    isReachable: statusCode >= 200 && statusCode < 400,
    statusCode,
  };
}

export async function fetchAndParsePage(url: string): Promise<ParsedHtmlMetadata> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ProofSEO-Parser/1.0 (+https://proofseo.app)" },
      redirect: "follow",
      // Without this a single hanging page stalls an entire crawl.
      signal: AbortSignal.timeout(12_000),
    });
    const htmlText = await response.text();
    return parseHtmlContent(url, htmlText, response.status);
  } catch (err) {
    return {
      url,
      title: null,
      titleLength: 0,
      description: null,
      descriptionLength: 0,
      canonical: null,
      robotsMeta: null,
      h1: null,
      h1Count: 0,
      imagesTotal: 0,
      imagesMissingAlt: 0,
      imageAlts: [],
      jsonLdBlocks: [],
      wordCount: 0,
      isReachable: false,
      statusCode: 500,
    };
  }
}
