import {
  Building2, Search, MapPin, Scale, Hammer, FileWarning, Landmark, Home, Upload,
  Briefcase, ShoppingCart, Star, Users, Globe, Newspaper, Megaphone, GraduationCap,
  Car, Utensils, Stethoscope, Wrench, Camera, Music, Plane, Store,
  Mail, Rocket, BadgeCheck, Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TemplateCategory =
  | "business"
  | "directories"
  | "records"
  | "social"
  | "ecommerce"
  | "jobs"
  | "reviews"
  | "realestate"
  | "upload";

export type Template = {
  id: string;
  title: string;
  subtitle: string;
  category: TemplateCategory;
  prompt: string;
  icon: LucideIcon;
  tint: string;
  /** Marks the template as Beta in the UI. */
  beta?: boolean;
  /** Domain used to fetch the real company logo (favicon). */
  logoDomain?: string;
};

export const TEMPLATES: Template[] = [
  // ---------- Business & Local ----------
  {
    id: "gmaps",
    title: "Google Maps Businesses",
    subtitle: "Businesses By Trade + Location. Franchises Removed.",
    category: "business",
    prompt: "Scrape all HVAC and plumbing businesses on Google Maps across every county in Florida, remove franchises",
    icon: MapPin,
    tint: "bg-primary/10 text-primary",
    logoDomain: "google.com/maps",
  },
  {
    id: "gserp",
    title: "Google Search Scraper",
    subtitle: "Websites, Emails, And Socials From Google Results By Keyword.",
    category: "business",
    prompt: "Scrape websites, emails, and social profiles from Google search results for a keyword and location",
    icon: Search,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "google.com",
  },
  {
    id: "glocal",
    title: "Google Local Services",
    subtitle: "Local Service Providers With Name, Phone, Website, And Address.",
    category: "business",
    prompt: "Scrape local service providers from Google Local Services by keyword and location",
    icon: BadgeCheck,
    tint: "bg-emerald-500/10 text-emerald-600",
    logoDomain: "google.com",
  },
  {
    id: "contact-details",
    title: "Contact Details Scraper (Any Site)",
    subtitle: "Pull Emails, Phones, And Social Profiles From Any Webpage.",
    category: "business",
    prompt: "Extract emails, phone numbers, and social media profiles from these websites",
    icon: Mail,
    tint: "bg-primary/10 text-primary",
  },
  {
    id: "universal-crawl",
    title: "Universal Site + Subpage Scraper",
    subtitle: "Crawl A Site And Its Subpages For All Contact Details.",
    category: "business",
    prompt: "Crawl this website and its subpages and extract all contact details",
    icon: Network,
    tint: "bg-indigo-500/10 text-indigo-600",
  },
  {
    id: "yelp",
    title: "Yelp Businesses",
    subtitle: "Local Businesses With Reviews + Contact Info.",
    category: "directories",
    prompt: "Scrape all Yelp restaurants in Chicago with 4+ stars and export owner contacts",
    icon: Utensils,
    tint: "bg-rose-500/10 text-rose-600",
    logoDomain: "yelp.com",
    beta: true,
  },
  {
    id: "yellowpages",
    title: "Yellow Pages",
    subtitle: "Business Name, Address, Phone, Website, And Email By Keyword.",
    category: "directories",
    prompt: "Scrape business name, address, phone, website, and email from Yellow Pages by keyword and location",
    icon: Wrench,
    tint: "bg-yellow-500/10 text-yellow-700",
    logoDomain: "yellowpages.com",
  },
  {
    id: "superpages",
    title: "Superpages",
    subtitle: "Business Contacts And Socials By Keyword And Zip Code.",
    category: "directories",
    prompt: "Scrape business name, address, phone, website, and social links from Superpages by keyword and zip code",
    icon: Building2,
    tint: "bg-orange-500/10 text-orange-700",
    logoDomain: "superpages.com",
    beta: true,
  },
  {
    id: "bbb",
    title: "Better Business Bureau",
    subtitle: "Accredited Businesses By Industry + State.",
    category: "directories",
    prompt: "Pull BBB-accredited HVAC businesses in Georgia with A+ rating",
    icon: Building2,
    tint: "bg-blue-500/10 text-blue-700",
    logoDomain: "bbb.org",
  },
  {
    id: "tripadvisor",
    title: "TripAdvisor Listings",
    subtitle: "Hotels, Restaurants + Attractions.",
    category: "directories",
    prompt: "Scrape TripAdvisor hotels in Miami with owner contact details",
    icon: Plane,
    tint: "bg-emerald-500/10 text-emerald-600",
    logoDomain: "tripadvisor.com",
  },

  // ---------- Social & Creators ----------
  {
    id: "linkedin",
    title: "LinkedIn Company / People",
    subtitle: "Company And Decision-Maker Profiles By Industry.",
    category: "directories",
    prompt: "Find companies and decision-makers on LinkedIn by industry and location",
    icon: Users,
    tint: "bg-sky-500/10 text-sky-700",
    logoDomain: "linkedin.com",
    beta: true,
  },
  {
    id: "instagram",
    title: "Instagram Creators",
    subtitle: "Influencers By Niche + Follower Range.",
    category: "social",
    prompt: "Scrape Instagram fitness creators with 10k–100k followers in the US",
    icon: Camera,
    tint: "bg-pink-500/10 text-pink-600",
    logoDomain: "instagram.com",
  },
  {
    id: "tiktok",
    title: "TikTok Creators",
    subtitle: "Creators By Hashtag + Engagement.",
    category: "social",
    prompt: "Find TikTok creators posting about home renovation with 25k+ followers",
    icon: Music,
    tint: "bg-slate-800/10 text-slate-900",
    logoDomain: "tiktok.com",
  },
  {
    id: "youtube",
    title: "YouTube Channels",
    subtitle: "Channels By Topic + Subscriber Count.",
    category: "social",
    prompt: "Scrape YouTube real-estate channels with 5k+ subs and public emails",
    icon: Megaphone,
    tint: "bg-red-500/10 text-red-600",
    logoDomain: "youtube.com",
  },
  {
    id: "twitter",
    title: "X (Twitter) Profiles",
    subtitle: "Profiles By Keyword + Bio Match.",
    category: "social",
    prompt: "Find X profiles with 'founder' in bio in fintech with 1k+ followers",
    icon: Globe,
    tint: "bg-slate-800/10 text-slate-900",
    logoDomain: "x.com",
  },
  {
    id: "facebook",
    title: "Facebook Pages",
    subtitle: "Business Pages With Contact Info And Category.",
    category: "directories",
    prompt: "Scrape business pages on Facebook by category and location for contact info",
    icon: Users,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "facebook.com",
    beta: true,
  },

  // ---------- E-commerce ----------
  {
    id: "amazon",
    title: "Amazon Sellers",
    subtitle: "3rd-Party Sellers By Category + Brand.",
    category: "ecommerce",
    prompt: "Scrape Amazon sellers in home & kitchen with 1k+ reviews",
    icon: ShoppingCart,
    tint: "bg-orange-500/10 text-orange-600",
    logoDomain: "amazon.com",
  },
  {
    id: "shopify",
    title: "Shopify Stores",
    subtitle: "DTC Brands By Niche + Traffic.",
    category: "ecommerce",
    prompt: "Find Shopify skincare brands with 50k+ monthly visits and contact info",
    icon: Store,
    tint: "bg-emerald-500/10 text-emerald-600",
    logoDomain: "shopify.com",
  },
  {
    id: "ebay",
    title: "eBay Sellers",
    subtitle: "Top-Rated Sellers By Category.",
    category: "ecommerce",
    prompt: "Scrape top-rated eBay sellers of collectible sneakers in the US",
    icon: ShoppingCart,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "ebay.com",
  },
  {
    id: "etsy",
    title: "Etsy Shops",
    subtitle: "Handmade Sellers By Category + Sales.",
    category: "ecommerce",
    prompt: "Find Etsy shops in home decor with 1k+ sales and owner contacts",
    icon: Store,
    tint: "bg-orange-500/10 text-orange-700",
    logoDomain: "etsy.com",
  },
  {
    id: "walmart",
    title: "Walmart Marketplace",
    subtitle: "Marketplace Sellers By Vertical.",
    category: "ecommerce",
    prompt: "Pull Walmart marketplace sellers in kitchen appliances with contact details",
    icon: ShoppingCart,
    tint: "bg-blue-500/10 text-blue-700",
    logoDomain: "walmart.com",
  },

  // ---------- Jobs & Hiring ----------
  {
    id: "indeed",
    title: "Indeed Job Postings",
    subtitle: "Companies Hiring By Role + Region.",
    category: "jobs",
    prompt: "Find companies on Indeed hiring senior engineers in Austin this month",
    icon: Briefcase,
    tint: "bg-indigo-500/10 text-indigo-600",
    logoDomain: "indeed.com",
  },
  {
    id: "googlejobs",
    title: "Google Jobs Scraper",
    subtitle: "Employers Hiring, With Company, Emails, And Apply Links.",
    category: "jobs",
    prompt: "Scrape employers hiring on Google Jobs by keyword and location for company and contact details",
    icon: Briefcase,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "google.com",
    beta: true,
  },
  {
    id: "glassdoor",
    title: "Glassdoor Companies",
    subtitle: "Growing Companies By Size + Rating.",
    category: "jobs",
    prompt: "Pull Glassdoor companies rated 4+ with 100–500 employees in healthcare",
    icon: Briefcase,
    tint: "bg-emerald-500/10 text-emerald-700",
    logoDomain: "glassdoor.com",
  },
  {
    id: "ziprecruiter",
    title: "ZipRecruiter Jobs",
    subtitle: "Employers Actively Hiring Now.",
    category: "jobs",
    prompt: "Scrape ZipRecruiter employers hiring HVAC techs in Florida",
    icon: Briefcase,
    tint: "bg-emerald-500/10 text-emerald-600",
    logoDomain: "ziprecruiter.com",
  },
  {
    id: "crunchbase",
    title: "Crunchbase Companies",
    subtitle: "Funded Companies With Site, Industry, And Location.",
    category: "directories",
    prompt: "Find funded companies on Crunchbase by industry and location",
    icon: Rocket,
    tint: "bg-blue-500/10 text-blue-700",
    logoDomain: "crunchbase.com",
    beta: true,
  },

  // ---------- Reviews ----------
  {
    id: "trustpilot",
    title: "Trustpilot Businesses",
    subtitle: "Brands By Rating + Review Volume.",
    category: "reviews",
    prompt: "Find Trustpilot brands with 3-star ratings in insurance and pull contacts",
    icon: Star,
    tint: "bg-emerald-500/10 text-emerald-600",
    logoDomain: "trustpilot.com",
  },
  {
    id: "g2",
    title: "G2 SaaS Vendors",
    subtitle: "SaaS Companies By Category + Reviews.",
    category: "reviews",
    prompt: "Pull G2-listed CRM vendors with 100+ reviews and public contact pages",
    icon: Star,
    tint: "bg-red-500/10 text-red-600",
    logoDomain: "g2.com",
  },

  // ---------- Real Estate ----------
  {
    id: "zillow",
    title: "Zillow FSBOs",
    subtitle: "For-Sale-By-Owner Listings + Owners.",
    category: "realestate",
    prompt: "Scrape Zillow FSBO listings in Tampa with owner phone lookups",
    icon: Home,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "zillow.com",
  },
  {
    id: "redfin",
    title: "Redfin Listings",
    subtitle: "Active + Expired Listings By Market.",
    category: "realestate",
    prompt: "Pull Redfin expired listings in Phoenix over 60 days and skip trace owners",
    icon: Home,
    tint: "bg-red-500/10 text-red-600",
    logoDomain: "redfin.com",
  },
  {
    id: "realtor",
    title: "Realtor.com",
    subtitle: "Agents + Listings By ZIP.",
    category: "realestate",
    prompt: "Find Realtor.com agents in the top 20 Florida ZIPs by transaction volume",
    icon: Home,
    tint: "bg-red-500/10 text-red-700",
    logoDomain: "realtor.com",
  },

  // ---------- Public Records ----------
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

  // ---------- Upload ----------
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