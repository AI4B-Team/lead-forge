import {
  Building2, Search, MapPin, Scale, Hammer, FileWarning, Landmark, Home, Upload,
  Briefcase, ShoppingCart, Star, Users, Globe, Newspaper, Megaphone, GraduationCap,
  Car, Utensils, Stethoscope, Wrench, Camera, Music, Plane, Store,
  Mail, Rocket, BadgeCheck, Network,
  DollarSign, BookOpen, Trophy, Film, Code, MessageSquare, Hotel, Bed,
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
  | "travel"
  | "finance"
  | "education"
  | "news"
  | "sports"
  | "search"
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
  /**
   * Composer placeholder shown while this template is selected — a fill-in
   * example for the slots the operator still has to supply.
   */
  placeholderHint?: string;
};

export const TEMPLATES: Template[] = [
  // ---------- Upload (pinned first) ----------
  {
    id: "upload",
    title: "Upload My List",
    subtitle: "Drop A CSV, Skip Trace And Scrub It.",
    category: "upload",
    prompt: "Upload my CSV list, map the columns, skip trace missing numbers, and scrub it",
    icon: Upload,
    tint: "bg-yellow-500/10 text-yellow-700",
    placeholderHint: "e.g. Skip trace my CSV and scrub it against DNC — mobile numbers only",
  },

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
    placeholderHint: "e.g. Roofers in Hillsborough County, FL — mobile numbers only",
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
    placeholderHint: "e.g. Water damage restoration in Tampa, FL — emails and phones",
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
    placeholderHint: "e.g. Plumbers in Pinellas County, FL with phone numbers",
  },
  {
    id: "contact-details",
    title: "Contact Details Scraper (Any Site)",
    subtitle: "Pull Emails, Phones, And Social Profiles From Any Webpage.",
    category: "business",
    prompt: "Extract emails, phone numbers, and social media profiles from these websites",
    icon: Mail,
    tint: "bg-primary/10 text-primary",
    placeholderHint: "e.g. Pull contacts from these 40 roofing company websites",
  },
  {
    id: "universal-crawl",
    title: "Universal Site + Subpage Scraper",
    subtitle: "Crawl A Site And Its Subpages For All Contact Details.",
    category: "business",
    prompt: "Crawl this website and its subpages and extract all contact details",
    icon: Network,
    tint: "bg-indigo-500/10 text-indigo-600",
    placeholderHint: "e.g. Crawl acmeroofing.com and every subpage for contacts",
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
    placeholderHint: "e.g. Restaurants in Chicago, IL with 4+ stars",
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
    placeholderHint: "e.g. Probate filings in Pasco County, FL from the last 90 days",
  },
  {
    id: "code",
    title: "Code Violations",
    subtitle: "Distressed Properties With Open Violations.",
    category: "records",
    prompt: "Find all code violation properties in Pinellas County FL and skip trace the owners",
    icon: FileWarning,
    tint: "bg-rose-500/10 text-rose-600",
    placeholderHint: "e.g. Code violations in Pinellas County, FL from the last 60 days",
  },
  {
    id: "prefc",
    title: "Pre-Foreclosures",
    subtitle: "Lis Pendens + Notice Of Default Filings.",
    category: "records",
    prompt: "Get pre-foreclosure and lis pendens filings in Pasco County FL from the last 30 days",
    icon: Hammer,
    tint: "bg-orange-500/10 text-orange-600",
    placeholderHint: "e.g. Pre-foreclosures in Pasco County, FL from the last 30 days",
  },
  {
    id: "tax",
    title: "Tax Defaults",
    subtitle: "Tax Delinquent Property Owners.",
    category: "records",
    prompt: "Pull tax delinquent property owners in Polk County FL",
    icon: Landmark,
    tint: "bg-indigo-500/10 text-indigo-600",
    beta: true,
  },
  {
    id: "vacancy",
    title: "Vacancy / Demolition",
    subtitle: "Uninhabitable + Demolition-Notice Homes.",
    category: "records",
    prompt: "Find vacancy and demolition notices in Hernando County FL and skip trace owners",
    icon: Home,
    tint: "bg-slate-500/10 text-slate-600",
    beta: true,
  },

  // ---------- E-Commerce (expanded) ----------
  { id: "amazon-products", title: "Amazon Products", subtitle: "Titles, Prices, Ratings, Reviews, ASINs, And Images.", category: "ecommerce", prompt: "Scrape Amazon products by keyword with price, ratings, and reviews", icon: ShoppingCart, tint: "bg-orange-500/10 text-orange-600", logoDomain: "amazon.com" },
  { id: "aliexpress", title: "AliExpress Products", subtitle: "Product Listings + Seller Info By Category.", category: "ecommerce", prompt: "Scrape AliExpress products in electronics with seller info", icon: ShoppingCart, tint: "bg-red-500/10 text-red-600", logoDomain: "aliexpress.com" },
  { id: "alibaba", title: "Alibaba Suppliers", subtitle: "Wholesale Suppliers By Product + Country.", category: "ecommerce", prompt: "Find Alibaba suppliers for kitchen appliances in China", icon: Store, tint: "bg-orange-500/10 text-orange-700", logoDomain: "alibaba.com" },
  { id: "target", title: "Target Products", subtitle: "Product Listings, Prices, And Availability.", category: "ecommerce", prompt: "Scrape Target products by category with pricing", icon: ShoppingCart, tint: "bg-red-500/10 text-red-600", logoDomain: "target.com" },
  { id: "bestbuy", title: "Best Buy Products", subtitle: "Electronics With Prices, Specs, And Ratings.", category: "ecommerce", prompt: "Scrape Best Buy laptops with prices and specifications", icon: ShoppingCart, tint: "bg-blue-500/10 text-blue-700", logoDomain: "bestbuy.com" },
  { id: "homedepot", title: "Home Depot Products", subtitle: "Building Products By Category + Store.", category: "ecommerce", prompt: "Scrape Home Depot products in flooring with prices", icon: Wrench, tint: "bg-orange-500/10 text-orange-700", logoDomain: "homedepot.com" },
  { id: "wayfair", title: "Wayfair Furniture", subtitle: "Home Furniture Listings + Prices.", category: "ecommerce", prompt: "Scrape Wayfair sofas with prices and dimensions", icon: Home, tint: "bg-emerald-500/10 text-emerald-700", logoDomain: "wayfair.com" },
  { id: "newegg", title: "Newegg Products", subtitle: "Tech Products With Prices + Ratings.", category: "ecommerce", prompt: "Scrape Newegg GPUs by model with prices and reviews", icon: ShoppingCart, tint: "bg-orange-500/10 text-orange-600", logoDomain: "newegg.com" },
  { id: "costco", title: "Costco Products", subtitle: "Warehouse Deals + Bulk Pricing.", category: "ecommerce", prompt: "Scrape Costco electronics with member pricing", icon: Store, tint: "bg-red-500/10 text-red-700", logoDomain: "costco.com" },
  { id: "shein", title: "SHEIN Products", subtitle: "Fashion Listings By Category.", category: "ecommerce", prompt: "Scrape SHEIN womenswear with prices and images", icon: ShoppingCart, tint: "bg-slate-800/10 text-slate-900", logoDomain: "shein.com" },
  { id: "temu", title: "Temu Products", subtitle: "Marketplace Listings + Seller Data.", category: "ecommerce", prompt: "Scrape Temu products in home goods with prices", icon: ShoppingCart, tint: "bg-orange-500/10 text-orange-600", logoDomain: "temu.com" },
  { id: "mercadolibre", title: "Mercado Libre", subtitle: "Latin America Marketplace Listings.", category: "ecommerce", prompt: "Scrape Mercado Libre listings in Mexico by category", icon: ShoppingCart, tint: "bg-yellow-500/10 text-yellow-700", logoDomain: "mercadolibre.com" },
  { id: "flipkart", title: "Flipkart Products", subtitle: "India Marketplace Listings.", category: "ecommerce", prompt: "Scrape Flipkart smartphones with prices and specs", icon: ShoppingCart, tint: "bg-blue-500/10 text-blue-600", logoDomain: "flipkart.com" },

  // ---------- Social Media (expanded) ----------
  { id: "reddit", title: "Reddit Posts", subtitle: "Threads, Comments, And Users By Subreddit.", category: "social", prompt: "Scrape r/realestate posts from the last 30 days with comments", icon: MessageSquare, tint: "bg-orange-500/10 text-orange-600", logoDomain: "reddit.com" },
  { id: "pinterest", title: "Pinterest Pins", subtitle: "Pins, Boards, And Creators By Keyword.", category: "social", prompt: "Scrape Pinterest pins for home decor with saves and creators", icon: Camera, tint: "bg-red-500/10 text-red-600", logoDomain: "pinterest.com" },
  { id: "quora", title: "Quora Answers", subtitle: "Questions, Answers, And Authors By Topic.", category: "social", prompt: "Scrape Quora answers in real estate investing", icon: MessageSquare, tint: "bg-red-500/10 text-red-700", logoDomain: "quora.com" },
  { id: "threads", title: "Threads Posts", subtitle: "Posts And Authors By Keyword.", category: "social", prompt: "Scrape Threads posts about SaaS founders", icon: MessageSquare, tint: "bg-slate-800/10 text-slate-900", logoDomain: "threads.net" },
  { id: "tiktok-hashtag", title: "TikTok By Hashtag", subtitle: "Videos, Creators, Views, And Engagement.", category: "social", prompt: "Scrape TikTok videos under #realestate with engagement metrics", icon: Music, tint: "bg-slate-800/10 text-slate-900", logoDomain: "tiktok.com" },
  { id: "instagram-hashtag", title: "Instagram Hashtag", subtitle: "Posts, Creators, And Contact Info By Hashtag.", category: "social", prompt: "Scrape Instagram posts under #fitnesscoach with creator emails", icon: Camera, tint: "bg-pink-500/10 text-pink-600", logoDomain: "instagram.com" },
  { id: "youtube-search", title: "YouTube Search", subtitle: "Videos, Channels, And Metadata By Keyword.", category: "social", prompt: "Scrape YouTube videos about home renovation with channel info", icon: Film, tint: "bg-red-500/10 text-red-600", logoDomain: "youtube.com" },

  // ---------- Real Estate (expanded) ----------
  { id: "trulia", title: "Trulia Listings", subtitle: "For-Sale Listings + Local Insights.", category: "realestate", prompt: "Scrape Trulia listings in Denver with agent contacts", icon: Home, tint: "bg-emerald-500/10 text-emerald-600", logoDomain: "trulia.com" },
  { id: "apartments", title: "Apartments.com", subtitle: "Rentals By City + Amenities.", category: "realestate", prompt: "Scrape Apartments.com rentals in Miami with pricing and amenities", icon: Home, tint: "bg-blue-500/10 text-blue-700", logoDomain: "apartments.com" },
  { id: "loopnet", title: "LoopNet CRE", subtitle: "Commercial Listings + Broker Info.", category: "realestate", prompt: "Scrape LoopNet retail properties in Texas with broker contacts", icon: Building2, tint: "bg-slate-500/10 text-slate-700", logoDomain: "loopnet.com" },
  { id: "rightmove", title: "Rightmove (UK)", subtitle: "UK Property Listings + Agents.", category: "realestate", prompt: "Scrape Rightmove listings in London with agent contacts", icon: Home, tint: "bg-emerald-500/10 text-emerald-700", logoDomain: "rightmove.co.uk" },
  { id: "zoopla", title: "Zoopla (UK)", subtitle: "UK Property Sales + Rentals.", category: "realestate", prompt: "Scrape Zoopla rentals in Manchester with landlord info", icon: Home, tint: "bg-indigo-500/10 text-indigo-600", logoDomain: "zoopla.co.uk" },
  { id: "idealista", title: "Idealista (EU)", subtitle: "Spanish + Italian Property Portals.", category: "realestate", prompt: "Scrape Idealista listings in Madrid with agent details", icon: Home, tint: "bg-emerald-500/10 text-emerald-600", logoDomain: "idealista.com" },

  // ---------- Jobs (expanded) ----------
  { id: "linkedin-jobs", title: "LinkedIn Jobs", subtitle: "Job Posts By Role, Company, And Location.", category: "jobs", prompt: "Scrape LinkedIn jobs for VP of Sales roles at SaaS companies in NYC", icon: Briefcase, tint: "bg-sky-500/10 text-sky-700", logoDomain: "linkedin.com", beta: true },
  { id: "monster", title: "Monster Jobs", subtitle: "Job Listings And Hiring Companies.", category: "jobs", prompt: "Scrape Monster job posts for engineering roles in Seattle", icon: Briefcase, tint: "bg-indigo-500/10 text-indigo-700", logoDomain: "monster.com" },
  { id: "simplyhired", title: "SimplyHired", subtitle: "Aggregated Job Listings By Region.", category: "jobs", prompt: "Scrape SimplyHired warehouse jobs in Ohio", icon: Briefcase, tint: "bg-emerald-500/10 text-emerald-600", logoDomain: "simplyhired.com" },
  { id: "dice", title: "Dice Tech Jobs", subtitle: "Tech Job Listings + Employers.", category: "jobs", prompt: "Scrape Dice.com listings for senior React developers", icon: Code, tint: "bg-red-500/10 text-red-600", logoDomain: "dice.com" },

  // ---------- Reviews (expanded) ----------
  { id: "capterra", title: "Capterra Software", subtitle: "SaaS Reviews + Vendor Contacts.", category: "reviews", prompt: "Scrape Capterra CRM software with review counts and vendor info", icon: Star, tint: "bg-primary/10 text-primary", logoDomain: "capterra.com" },
  { id: "google-reviews", title: "Google Reviews", subtitle: "Reviews For Any Business On Google Maps.", category: "reviews", prompt: "Scrape Google reviews for HVAC companies in Tampa", icon: Star, tint: "bg-yellow-500/10 text-yellow-700", logoDomain: "google.com" },
  { id: "trustradius", title: "TrustRadius", subtitle: "B2B Software Reviews By Category.", category: "reviews", prompt: "Scrape TrustRadius marketing automation software with reviews", icon: Star, tint: "bg-emerald-500/10 text-emerald-700", logoDomain: "trustradius.com" },
  { id: "appstore", title: "App Store Reviews", subtitle: "iOS App Reviews And Ratings.", category: "reviews", prompt: "Scrape App Store reviews for fintech apps in the US", icon: Star, tint: "bg-slate-500/10 text-slate-700", logoDomain: "apple.com" },
  { id: "playstore", title: "Play Store Reviews", subtitle: "Android App Reviews And Ratings.", category: "reviews", prompt: "Scrape Google Play reviews for productivity apps", icon: Star, tint: "bg-emerald-500/10 text-emerald-600", logoDomain: "play.google.com" },

  // ---------- Travel ----------
  { id: "booking", title: "Booking.com Hotels", subtitle: "Hotel Listings, Prices, And Reviews.", category: "travel", prompt: "Scrape Booking.com hotels in Orlando with prices and reviews", icon: Hotel, tint: "bg-blue-500/10 text-blue-700", logoDomain: "booking.com" },
  { id: "airbnb", title: "Airbnb Listings", subtitle: "Short-Term Rentals + Host Info.", category: "travel", prompt: "Scrape Airbnb listings in Nashville with host details", icon: Bed, tint: "bg-red-500/10 text-red-600", logoDomain: "airbnb.com" },
  { id: "expedia", title: "Expedia Hotels", subtitle: "Hotel Listings And Availability.", category: "travel", prompt: "Scrape Expedia hotels in Las Vegas with rates", icon: Hotel, tint: "bg-yellow-500/10 text-yellow-700", logoDomain: "expedia.com" },
  { id: "hotels", title: "Hotels.com", subtitle: "Global Hotel Inventory + Pricing.", category: "travel", prompt: "Scrape Hotels.com listings in Chicago with pricing", icon: Hotel, tint: "bg-red-500/10 text-red-700", logoDomain: "hotels.com" },
  { id: "kayak", title: "Kayak Flights", subtitle: "Flight Deals + Aggregated Fares.", category: "travel", prompt: "Scrape Kayak flights from NYC to LA next month", icon: Plane, tint: "bg-orange-500/10 text-orange-600", logoDomain: "kayak.com" },
  { id: "skyscanner", title: "Skyscanner Flights", subtitle: "Global Flight Search + Prices.", category: "travel", prompt: "Scrape Skyscanner flights from London to Paris", icon: Plane, tint: "bg-blue-500/10 text-blue-600", logoDomain: "skyscanner.com" },
  { id: "agoda", title: "Agoda Hotels", subtitle: "APAC Hotel Bookings + Prices.", category: "travel", prompt: "Scrape Agoda hotels in Tokyo with pricing", icon: Hotel, tint: "bg-red-500/10 text-red-600", logoDomain: "agoda.com" },

  // ---------- Directories (expanded) ----------
  { id: "manta", title: "Manta", subtitle: "Small Business Directory By Category + State.", category: "directories", prompt: "Scrape Manta businesses in Georgia in the trades", icon: Building2, tint: "bg-blue-500/10 text-blue-600", logoDomain: "manta.com" },
  { id: "foursquare", title: "Foursquare", subtitle: "Local Business Data + Categories.", category: "directories", prompt: "Scrape Foursquare restaurants in Austin with contact info", icon: MapPin, tint: "bg-pink-500/10 text-pink-600", logoDomain: "foursquare.com" },
  { id: "yelp-directory", title: "Yellowbook", subtitle: "Local Business Directory Listings.", category: "directories", prompt: "Scrape Yellowbook listings for auto repair in Ohio", icon: Wrench, tint: "bg-yellow-500/10 text-yellow-700", logoDomain: "yellowbook.com" },
  { id: "cylex", title: "Cylex", subtitle: "European Business Directory.", category: "directories", prompt: "Scrape Cylex businesses in Germany in construction", icon: Building2, tint: "bg-blue-500/10 text-blue-700", logoDomain: "cylex.de", beta: true },
  { id: "hotfrog", title: "Hotfrog", subtitle: "Global SMB Directory.", category: "directories", prompt: "Scrape Hotfrog listings for cleaning companies in the UK", icon: Building2, tint: "bg-emerald-500/10 text-emerald-600", logoDomain: "hotfrog.com" },

  // ---------- Search Engine ----------
  { id: "bing-search", title: "Bing Search", subtitle: "SERP Titles, URLs, And Snippets.", category: "search", prompt: "Scrape Bing SERP results for solar installer near me across Florida metros", icon: Search, tint: "bg-blue-500/10 text-blue-700", logoDomain: "bing.com" },
  { id: "duckduckgo", title: "DuckDuckGo Search", subtitle: "Privacy-Focused SERP Data.", category: "search", prompt: "Scrape DuckDuckGo results for privacy-focused SaaS tools", icon: Search, tint: "bg-orange-500/10 text-orange-600", logoDomain: "duckduckgo.com" },
  { id: "google-scholar", title: "Google Scholar", subtitle: "Academic Papers, Authors, And Citations.", category: "search", prompt: "Scrape Google Scholar papers about lead generation from 2024", icon: BookOpen, tint: "bg-blue-500/10 text-blue-700", logoDomain: "scholar.google.com" },

  // ---------- Finance ----------
  { id: "yahoo-finance", title: "Yahoo Finance", subtitle: "Stock Prices, Fundamentals, And News.", category: "finance", prompt: "Scrape Yahoo Finance top gainers with fundamentals", icon: DollarSign, tint: "bg-emerald-500/10 text-emerald-700", logoDomain: "finance.yahoo.com" },
  { id: "google-finance", title: "Google Finance", subtitle: "Market Data + Company Snapshots.", category: "finance", prompt: "Scrape Google Finance data for S&P 500 companies", icon: DollarSign, tint: "bg-blue-500/10 text-blue-700", logoDomain: "google.com/finance" },
  { id: "sec-edgar", title: "SEC EDGAR", subtitle: "Public Filings + Company Financials.", category: "finance", prompt: "Scrape SEC EDGAR 10-K filings from technology companies", icon: Landmark, tint: "bg-slate-500/10 text-slate-700", logoDomain: "sec.gov" },

  // ---------- Education ----------
  { id: "coursera", title: "Coursera Courses", subtitle: "Course Catalogs, Instructors, And Ratings.", category: "education", prompt: "Scrape Coursera data science courses with instructors and ratings", icon: GraduationCap, tint: "bg-blue-500/10 text-blue-700", logoDomain: "coursera.org" },
  { id: "udemy", title: "Udemy Courses", subtitle: "Course Catalogs + Instructor Contacts.", category: "education", prompt: "Scrape Udemy marketing courses with instructor profiles", icon: GraduationCap, tint: "bg-purple-500/10 text-purple-700", logoDomain: "udemy.com" },
  { id: "edx", title: "edX Programs", subtitle: "Programs From Universities Worldwide.", category: "education", prompt: "Scrape edX programs from Harvard and MIT", icon: GraduationCap, tint: "bg-slate-500/10 text-slate-700", logoDomain: "edx.org" },

  // ---------- News ----------
  { id: "google-news", title: "Google News", subtitle: "Headlines + Sources By Keyword.", category: "news", prompt: "Scrape Google News for AI startup funding this month", icon: Newspaper, tint: "bg-blue-500/10 text-blue-700", logoDomain: "news.google.com" },
  { id: "bing-news", title: "Bing News", subtitle: "News Aggregation By Topic + Region.", category: "news", prompt: "Scrape Bing News for real estate market news in Florida", icon: Newspaper, tint: "bg-blue-500/10 text-blue-600", logoDomain: "bing.com" },
  { id: "reuters", title: "Reuters", subtitle: "Global Business + Political News.", category: "news", prompt: "Scrape Reuters technology headlines from the past week", icon: Newspaper, tint: "bg-orange-500/10 text-orange-700", logoDomain: "reuters.com" },

  // ---------- Sports ----------
  { id: "espn", title: "ESPN Scores", subtitle: "Scores, Standings, And Team Data.", category: "sports", prompt: "Scrape ESPN NBA team standings and stats", icon: Trophy, tint: "bg-red-500/10 text-red-700", logoDomain: "espn.com" },
  { id: "sofascore", title: "Sofascore", subtitle: "Live Scores And Player Stats.", category: "sports", prompt: "Scrape Sofascore Premier League match results and player stats", icon: Trophy, tint: "bg-emerald-500/10 text-emerald-700", logoDomain: "sofascore.com" },
  { id: "flashscore", title: "Flashscore", subtitle: "Live Scores Across All Sports.", category: "sports", prompt: "Scrape Flashscore results for soccer leagues this weekend", icon: Trophy, tint: "bg-red-500/10 text-red-600", logoDomain: "flashscore.com" },

  // ---------- Assistant default grid additions ----------
  {
    id: "roofers",
    title: "Roofers",
    subtitle: "Find Roofing Companies In Your Area.",
    category: "business",
    prompt: "Find roofing companies in Hillsborough County FL with mobile numbers, remove franchises",
    icon: Hammer,
    tint: "bg-orange-500/10 text-orange-600",
    logoDomain: "google.com/maps",
  },
  {
    id: "contractors",
    title: "Contractors",
    subtitle: "Find General Contractors Near You.",
    category: "business",
    prompt: "Find general contractors in Pinellas County FL with mobile numbers, remove franchises",
    icon: Wrench,
    tint: "bg-amber-500/10 text-amber-600",
    logoDomain: "google.com/maps",
  },
  {
    id: "commercial",
    title: "Commercial Properties",
    subtitle: "Find Commercial Properties For Sale.",
    category: "realestate",
    prompt: "Find commercial properties for sale in Hillsborough County FL and skip trace the owners",
    icon: Building2,
    tint: "bg-blue-500/10 text-blue-600",
    logoDomain: "loopnet.com",
  },
  {
    id: "property-owners",
    title: "Property Owners",
    subtitle: "Find Property Owners By Criteria.",
    category: "records",
    prompt: "Find property owners in Hillsborough County FL matching my criteria and skip trace them",
    icon: Home,
    tint: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "absentee",
    title: "Absentee Owners",
    subtitle: "Find Absentee And Out-Of-State Owners.",
    category: "records",
    prompt: "Find absentee and out-of-state property owners in Pasco County FL and skip trace them",
    icon: MapPin,
    tint: "bg-indigo-500/10 text-indigo-600",
  },
];
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  business: "Business & Local",
  directories: "Directories",
  records: "Public Records",
  social: "Social",
  ecommerce: "E-commerce",
  jobs: "Jobs",
  reviews: "Reviews",
  realestate: "Real Estate",
  travel: "Travel",
  finance: "Finance",
  education: "Education",
  news: "News",
  sports: "Sports",
  search: "Search Engine",
  upload: "Upload",
};

/** Look up a template by its id. */
export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Other templates in the same category (excluding the given one). */
export function relatedTemplates(t: Template, limit = 6): Template[] {
  return TEMPLATES.filter((x) => x.category === t.category && x.id !== t.id).slice(0, limit);
}

/** Fields the pipeline returns for a template's category. */
export function templateFields(t: Template): string[] {
  const base = ["Name", "Phone", "Email", "Website", "Source URL"];
  switch (t.category) {
    case "business":
    case "directories":
      return ["Business Name", "Owner / Contact", "Phone", "Email", "Address", "Category", "Website", "Rating"];
    case "records":
      return ["Owner Name", "Mailing Address", "Property Address", "Filing Date", "Case / Doc Number", "Phone (Skip Traced)"];
    case "realestate":
      return ["Owner Name", "Property Address", "List Price", "Status", "Agent", "Phone", "Email"];
    case "social":
      return ["Handle", "Display Name", "Bio", "Followers", "Link In Bio", "Email", "Phone (Skip Traced)"];
    case "ecommerce":
      return ["Store / Product", "Price", "Seller Name", "Reviews", "Store URL", "Email", "Phone"];
    case "jobs":
      return ["Company", "Job Title", "Location", "Posted Date", "Hiring Contact", "Phone", "Email"];
    case "reviews":
      return ["Business Name", "Rating", "Review Count", "Latest Review", "Phone", "Email"];
    case "upload":
      return ["Your Columns (Mapped)", "Normalized Phone", "Line Type", "DNC Status", "Skip Traced Phone"];
    default:
      return base;
  }
}

/** The Job Spec source a template already determines on its own. */
export function templateSourceType(t: Template): "business" | "records" | "upload" {
  if (t.category === "upload") return "upload";
  if (t.category === "records") return "records";
  return "business";
}
