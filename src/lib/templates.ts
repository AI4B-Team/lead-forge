import { Building2, Search, MapPin, Scale, Hammer, FileWarning, Landmark, Home, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TemplateCategory = "business" | "records" | "upload";

export type Template = {
  id: string;
  title: string;
  subtitle: string;
  category: TemplateCategory;
  prompt: string;
  icon: LucideIcon;
  tint: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "gmaps",
    title: "Google Maps Businesses",
    subtitle: "Businesses By Trade + Location. Franchises Removed.",
    category: "business",
    prompt: "Scrape all HVAC and plumbing businesses on Google Maps across every county in Florida, remove franchises",
    icon: Building2,
    tint: "bg-primary/10 text-primary",
  },
  {
    id: "gserp",
    title: "Google Search Scraper",
    subtitle: "Businesses By SERP Results And Keyword.",
    category: "business",
    prompt: "Find all roofing companies ranking on Google for roof repair in Texas metros",
    icon: Search,
    tint: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "directory",
    title: "Local Directory Scraper",
    subtitle: "Contractors And Trades From Local Listings.",
    category: "business",
    prompt: "Pull electricians and general contractors from local business directories in Ohio",
    icon: MapPin,
    tint: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "probate",
    title: "Probate Records",
    subtitle: "New Probate Filings, Heirs Auto Skip Traced.",
    category: "records",
    prompt: "Pull all new probate filings in Hillsborough County FL from the last 90 days and skip trace the heirs",
    icon: Scale,
    tint: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "code",
    title: "Code Violations",
    subtitle: "Distressed Properties With Open Violations.",
    category: "records",
    prompt: "Find all code violation properties in Pinellas County FL and skip trace the owners",
    icon: FileWarning,
    tint: "bg-rose-500/10 text-rose-600",
  },
  {
    id: "prefc",
    title: "Pre-Foreclosures",
    subtitle: "Lis Pendens + Notice Of Default Filings.",
    category: "records",
    prompt: "Get pre-foreclosure and lis pendens filings in Pasco County FL from the last 30 days",
    icon: Hammer,
    tint: "bg-orange-500/10 text-orange-600",
  },
  {
    id: "tax",
    title: "Tax Defaults (Beta)",
    subtitle: "Tax Delinquent Property Owners.",
    category: "records",
    prompt: "Pull tax delinquent property owners in Polk County FL",
    icon: Landmark,
    tint: "bg-indigo-500/10 text-indigo-600",
  },
  {
    id: "vacancy",
    title: "Vacancy / Demolition",
    subtitle: "Uninhabitable + Demolition-Notice Homes.",
    category: "records",
    prompt: "Find vacancy and demolition notices in Hernando County FL and skip trace owners",
    icon: Home,
    tint: "bg-slate-500/10 text-slate-600",
  },
  {
    id: "upload",
    title: "Upload My List",
    subtitle: "Drop A CSV, Skip Trace And Scrub It.",
    category: "upload",
    prompt: "Upload my CSV list, map the columns, skip trace missing numbers, and scrub it",
    icon: Upload,
    tint: "bg-yellow-500/10 text-yellow-700",
  },
];