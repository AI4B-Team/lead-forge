/**
 * Clean-file column layouts. Phone sources export the phone-centric layout;
 * creator sources (TikTok / Instagram / YouTube) export a creator-shaped file,
 * because the deliverable there is handle + email + engagement, not a dial.
 */
import { enrichmentProfile, templateOutputType } from "@/lib/pipeline-options";
import { LEAD_FIELDS } from "@/lib/lead-fields";

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
export function cleanFileType(templateId?: string | null): "Clean" | "Dataset" {
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
    // Same registry the on-screen tables read, so the download and the screen
    // can never disagree about what a creator row contains.
    return {
      handle: first(LEAD_FIELDS.handle.value(r), r.full_name, r.business_name),
      platform: first(LEAD_FIELDS.platform.value(r), platform),
      followers: first(LEAD_FIELDS.followers.value(r), ""),
      engagement: first(LEAD_FIELDS.engagement.value(r), ""),
      email: first(LEAD_FIELDS.email.value(r), ""),
      profile_url: first(m.profile_url, m.url, m.website),
    };
  });
}