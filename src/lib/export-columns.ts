/**
 * Clean-file column layouts. Phone sources export the phone-centric layout;
 * creator sources (TikTok / Instagram / YouTube) export a creator-shaped file,
 * because the deliverable there is handle + email + engagement, not a dial.
 */
import { enrichmentProfile, templateOutputType } from "@/lib/pipeline-options";

export type ExportShape = "phone" | "creator" | "data";

export function exportShapeFor(templateId?: string | null): ExportShape {
  if (templateOutputType(templateId) === "data") return "data";
  const profile = enrichmentProfile(templateId);
  return profile === "creator" || profile === "seller" ? "creator" : "phone";
}

/**
 * File-type word used in the download name and menu. Research datasets are a
 * "Dataset", never a "Clean" list of leads.
 */
export function cleanFileType(templateId?: string | null): string {
  return templateOutputType(templateId) === "data" ? "Dataset" : "Clean";
}

const CREATOR_PLATFORM: Record<string, string> = {
  tiktok: "TikTok",
  "tiktok-hashtag": "TikTok",
  instagram: "Instagram",
  "instagram-hashtag": "Instagram",
  youtube: "YouTube",
  "youtube-search": "YouTube",
  amazon: "Amazon",
  ebay: "eBay",
  etsy: "Etsy",
  walmart: "Walmart",
  shopify: "Shopify",
  alibaba: "Alibaba",
};

type Row = Record<string, unknown>;

const meta = (row: Row): Row => {
  const m = row.source_meta;
  return m && typeof m === "object" ? (m as Row) : {};
};

const first = (...vals: unknown[]) => vals.find((v) => v != null && v !== "") ?? "";

/** Reshape clean rows for the file the operator actually expects. */
export function shapeExportRows(rows: Row[], shape: ExportShape, templateId?: string | null): Row[] {
  if (shape !== "creator") return rows;
  const platform = CREATOR_PLATFORM[templateId ?? ""] ?? "Social";
  return rows.map((r) => {
    const m = meta(r);
    return {
      handle: first(m.handle, m.username, r.full_name, r.business_name),
      platform: first(m.platform, platform),
      followers: first(m.followers, m.follower_count, ""),
      engagement: first(m.engagement, m.engagement_rate, ""),
      email: first(r.email, m.email),
      profile_url: first(m.profile_url, m.url, m.website),
    };
  });
}