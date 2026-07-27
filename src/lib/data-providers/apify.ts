import type { BusinessScraper, BusinessScrapeParams, RawLead } from "./index";

// Apify Google Maps scraper adapter. Reads APIFY_TOKEN (and optional
// APIFY_GMAPS_ACTOR override) at call time from process.env — never at module
// scope. Falls back to a deterministic mock when the token is missing so the
// full pipeline still works out of the box.

const FRANCHISE_MARKERS = ["ServPro", "Roto-Rooter", "Mr Rooter", "Aire Serv"];
const LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Smith", "Johnson", "Lopez", "Kim", "Davis", "Martinez", "Chen"];
function pick<T>(arr: T[], i: number) { return arr[i % arr.length]!; }
function fakePhone(i: number) {
  const area = 813 + (i % 5);
  const mid = 200 + (i % 799);
  const last = 1000 + (i * 37) % 8999;
  return `+1${area}${mid}${last}`;
}

async function mockScrape(params: BusinessScrapeParams): Promise<RawLead[]> {
  const rows: RawLead[] = [];
  let i = 0;
  const targetCounties = params.counties.length ? params.counties : ["Hillsborough", "Pasco", "Pinellas"];
  const niches = params.niches.length ? params.niches : ["HVAC"];
  for (const niche of niches) {
    for (const county of targetCounties) {
      const count = 60 + ((niche.length * county.length) % 40);
      for (let n = 0; n < count; n++) {
        const isFranchise = n % 17 === 0;
        const nameBase = isFranchise ? pick(FRANCHISE_MARKERS, n) : `${pick(LAST_NAMES, n + i)} ${niche}`;
        rows.push({
          business_name: `${nameBase} · ${county}`,
          phone: fakePhone(i),
          email: `contact${i}@example.com`,
          city: county,
          state: params.state,
          source_meta: { niche, county, franchise: isFranchise, provider: "mock" },
        });
        i++;
      }
    }
  }
  return rows;
}

const APIFY_BASE = "https://api.apify.com/v2";

async function apifyScrape(token: string, actor: string, params: BusinessScrapeParams): Promise<RawLead[]> {
  const searchStrings: string[] = [];
  const niches = params.niches.length ? params.niches : ["local business"];
  const counties = params.counties.length ? params.counties : [""];
  for (const niche of niches) {
    for (const county of counties) {
      searchStrings.push(`${niche} in ${county} ${params.state}`.trim());
    }
  }

  // Kick off actor synchronously and get dataset items back.
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchStringsArray: searchStrings,
      maxCrawledPlacesPerSearch: 100,
      language: "en",
      exportPlaceUrls: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apify actor failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const items = (await res.json()) as Array<Record<string, unknown>>;
  return items.map((it) => {
    const title = (it.title as string | undefined) ?? (it.name as string | undefined) ?? null;
    const phone = (it.phone as string | undefined) ?? (it.phoneUnformatted as string | undefined) ?? null;
    const website = (it.website as string | undefined) ?? null;
    const address = (it.address as string | undefined) ?? null;
    const city = (it.city as string | undefined) ?? null;
    const state = (it.state as string | undefined) ?? params.state;
    const zip = (it.postalCode as string | undefined) ?? null;
    const categoryName = (it.categoryName as string | undefined) ?? null;
    return {
      business_name: title,
      phone,
      email: null,
      address,
      city,
      state,
      zip,
      source_meta: {
        provider: "apify",
        actor,
        website,
        category: categoryName,
        rating: it.totalScore ?? null,
        reviews: it.reviewsCount ?? null,
      },
    } satisfies RawLead;
  });
}

export function getBusinessScraper(): BusinessScraper {
  return {
    key: "apify.gmaps",
    isConfigured() {
      return Boolean(process.env.APIFY_TOKEN);
    },
    async scrape(params) {
      const token = process.env.APIFY_TOKEN;
      if (!token) return mockScrape(params);
      const actor = process.env.APIFY_GMAPS_ACTOR ?? "compass~google-maps-scraper";
      try {
        return await apifyScrape(token, actor, params);
      } catch (err) {
        console.error("[apify] scrape failed, falling back to mock:", err);
        return mockScrape(params);
      }
    },
  };
}