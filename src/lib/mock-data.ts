// Mock data for the LeadForge frontend scaffold. All strings follow the
// house style: Title Case, no em-dashes, no emojis as icons.

export type SourceType = "business" | "records" | "upload";
export type JobStatus =
  | "queued"
  | "scraping"
  | "enriching"
  | "skiptracing"
  | "scrubbing"
  | "ready"
  | "failed";

export interface MockJob {
  id: string;
  name: string;
  sourceType: SourceType;
  status: JobStatus;
  rowsIn: number;
  rowsDeduped: number;
  rowsEnriched: number;
  rowsSkipTraced: number;
  clean: number;
  dnc: number;
  litigator: number;
  qualityScore: number;
  createdAt: string;
}

export const MOCK_JOBS: MockJob[] = [
  {
    id: "job_01",
    name: "Tampa HVAC · Pasco + Hillsborough",
    sourceType: "business",
    status: "ready",
    rowsIn: 3699,
    rowsDeduped: 3120,
    rowsEnriched: 3120,
    rowsSkipTraced: 2810,
    clean: 2140,
    dnc: 512,
    litigator: 47,
    qualityScore: 82,
    createdAt: "2 Hours Ago",
  },
  {
    id: "job_02",
    name: "Hillsborough Probate · Last 90 Days",
    sourceType: "records",
    status: "scrubbing",
    rowsIn: 412,
    rowsDeduped: 402,
    rowsEnriched: 402,
    rowsSkipTraced: 388,
    clean: 0,
    dnc: 0,
    litigator: 0,
    qualityScore: 0,
    createdAt: "18 Minutes Ago",
  },
  {
    id: "job_03",
    name: "Insurance Buyer List · Q3 Import",
    sourceType: "upload",
    status: "ready",
    rowsIn: 1240,
    rowsDeduped: 1188,
    rowsEnriched: 1188,
    rowsSkipTraced: 902,
    clean: 894,
    dnc: 271,
    litigator: 23,
    qualityScore: 74,
    createdAt: "Yesterday",
  },
  {
    id: "job_04",
    name: "Solar Roofers · Central FL",
    sourceType: "business",
    status: "skiptracing",
    rowsIn: 2140,
    rowsDeduped: 1980,
    rowsEnriched: 1980,
    rowsSkipTraced: 900,
    clean: 0,
    dnc: 0,
    litigator: 0,
    qualityScore: 0,
    createdAt: "8 Minutes Ago",
  },
];

export interface MockCampaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "paused" | "done";
  listJobId: string;
  recipients: number;
  sent: number;
  delivered: number;
  replies: number;
  optOuts: number;
  dailyCap: number;
}

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  {
    id: "cmp_01",
    name: "HVAC Intro · Touch 1",
    status: "sending",
    listJobId: "job_01",
    recipients: 2140,
    sent: 1512,
    delivered: 1478,
    replies: 124,
    optOuts: 22,
    dailyCap: 1500,
  },
  {
    id: "cmp_02",
    name: "Insurance Follow-Up",
    status: "paused",
    listJobId: "job_03",
    recipients: 894,
    sent: 400,
    delivered: 391,
    replies: 41,
    optOuts: 7,
    dailyCap: 1000,
  },
  {
    id: "cmp_03",
    name: "Fresh Probate Outreach",
    status: "draft",
    listJobId: "job_02",
    recipients: 0,
    sent: 0,
    delivered: 0,
    replies: 0,
    optOuts: 0,
    dailyCap: 800,
  },
];

export interface MockNumber {
  id: string;
  phone: string;
  areaCode: string;
  region: "East" | "Central" | "Mountain" | "West";
  healthScore: number;
  optOutRate: number;
  status: "active" | "cooling" | "retired";
}

export const MOCK_NUMBERS: MockNumber[] = [
  { id: "n1", phone: "+1 (813) 555-0142", areaCode: "813", region: "East", healthScore: 96, optOutRate: 1.2, status: "active" },
  { id: "n2", phone: "+1 (727) 555-0188", areaCode: "727", region: "East", healthScore: 92, optOutRate: 1.8, status: "active" },
  { id: "n3", phone: "+1 (512) 555-0121", areaCode: "512", region: "Central", healthScore: 88, optOutRate: 2.4, status: "active" },
  { id: "n4", phone: "+1 (602) 555-0177", areaCode: "602", region: "Mountain", healthScore: 74, optOutRate: 4.1, status: "cooling" },
  { id: "n5", phone: "+1 (415) 555-0155", areaCode: "415", region: "West", healthScore: 91, optOutRate: 1.6, status: "active" },
  { id: "n6", phone: "+1 (305) 555-0133", areaCode: "305", region: "East", healthScore: 45, optOutRate: 6.2, status: "retired" },
];

export const MOCK_CREDITS = {
  scrape: 41200,
  skipTrace: 18740,
  sms: 24980,
};

export const MOCK_METRICS = {
  leads: 12480,
  lists: 24,
  activeCampaigns: 3,
  deliverability: 94,
};

export const INDUSTRIES = [
  { key: "insurance", label: "Insurance" },
  { key: "real_estate", label: "Real Estate" },
  { key: "solar", label: "Solar & Roofing" },
  { key: "home_services", label: "Home Services" },
  { key: "agency", label: "Agencies" },
  { key: "other", label: "Other" },
] as const;

export const COUNTIES = [
  { name: "Hillsborough, FL", coverage: "live" },
  { name: "Pasco, FL", coverage: "live" },
  { name: "Pinellas, FL", coverage: "live" },
  { name: "Polk, FL", coverage: "live" },
  { name: "Hernando, FL", coverage: "live" },
  { name: "Harris, TX", coverage: "beta" },
  { name: "Maricopa, AZ", coverage: "beta" },
  { name: "Pima, AZ", coverage: "requested" },
  { name: "Dallas, TX", coverage: "requested" },
  { name: "Fulton, GA", coverage: "requested" },
] as const;

export const RECORD_TYPES = [
  "Probate",
  "Code Violation",
  "Pre-Foreclosure / Lis Pendens",
  "Tax Default / Delinquency",
  "Vacancy / Demolition Notice",
  "Eviction",
] as const;

export const NICHES = [
  "Electrician",
  "HVAC",
  "Plumber",
  "Roofer",
  "Solar Installer",
  "Landscaper",
  "Pest Control",
  "General Contractor",
  "Insurance Agent",
  "Mortgage Broker",
] as const;

export function statusLabel(s: JobStatus): string {
  return {
    queued: "Queued",
    scraping: "Scraping",
    enriching: "Enriching",
    skiptracing: "Skip Tracing",
    scrubbing: "Scrubbing",
    ready: "Ready",
    failed: "Failed",
  }[s];
}