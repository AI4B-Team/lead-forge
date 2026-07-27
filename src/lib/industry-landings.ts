import {
  Home, Shield, Sun, Wrench, Briefcase, Scale, HeartPulse, Car, Building2,
  GraduationCap, DollarSign, Rocket, ShoppingBag, Hammer, Users, Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IndustryLanding = {
  slug: string;
  industry: string;
  hero: {
    eyebrow: string;
    title: string;
    highlight: string;
    titleTail: string;
    subtitle: string;
  };
  icon: LucideIcon;
  stats: { value: string; label: string }[];
  useCases: { title: string; body: string }[];
  benefits: { title: string; body: string; icon: LucideIcon }[];
  audiences: { title: string; body: string; icon: LucideIcon }[];
  sampleMessage: string;
  wiredTo: string;
};

const commonBenefits = (extra: { title: string; body: string; icon: LucideIcon }[] = []) => [
  { title: "Skip-Traced Contact Info", body: "Phone Numbers You're Calling To, Not Guessing At.", icon: Users },
  { title: "DNC + Litigator Scrubbing", body: "Every List Cleaned Before The First Text Sends.", icon: Shield },
  { title: "AI Outreach Templates", body: "Personalized SMS, Email, And Voicemail Scripts, Ready To Send.", icon: Rocket },
  ...extra,
];

export const INDUSTRY_LANDINGS: IndustryLanding[] = [
  {
    slug: "realestate",
    industry: "Real Estate",
    icon: Home,
    hero: {
      eyebrow: "Now Tracking 15,000+ Live Code Enforcement Cases",
      title: "Find Distressed Properties",
      highlight: "Before",
      titleTail: "Anyone Else.",
      subtitle: "LeadTrace surfaces demolition orders, remedial cases, and absentee-owner leads pulled straight from live code enforcement data — scored, skip-traced, and ready to contact.",
    },
    stats: [
      { value: "15,088", label: "Active Tags Tracked" },
      { value: "412", label: "Demolition Orders" },
      { value: "94", label: "Avg Score Of Hot Leads" },
      { value: "Daily", label: "Data Refresh Cycle" },
    ],
    useCases: [
      { title: "Probate & Inherited Homes", body: "Pull fresh probate filings so you're first to reach heirs before the MLS ever sees the home." },
      { title: "Pre-Foreclosure / Lis Pendens", body: "Court filings turn into contactable owners — sorted by equity and days delinquent." },
      { title: "Code Violations & Demolition Orders", body: "Distressed owners who need out. We score by severity and time on the docket." },
      { title: "Absentee Owners & Vacancy Notices", body: "Out-of-state landlords tired of the phone call — targeted, skip-traced, ready." },
    ],
    benefits: commonBenefits([
      { title: "Property Intelligence", body: "One-Click Street View, Zillow, Redfin, And Realtor.com Lookups. Sale History And Ownership At A Glance.", icon: Building2 },
      { title: "Filters That Matter", body: "Individual Vs Corporate Owners, Has-Phone, Tagged, Case Type, Status.", icon: Landmark },
    ]),
    audiences: [
      { title: "Wholesalers", body: "Fill Your Pipeline With Motivated Sellers Facing Code Liens And Demolition Deadlines.", icon: Rocket },
      { title: "Flippers", body: "Target Long-Term Absentee Owners With Equity — Before They Hit The MLS.", icon: Hammer },
      { title: "Land Investors", body: "Filter For Vacant-Lot Violations And Corporate-Owned Parcels Ripe For Acquisition.", icon: Landmark },
    ],
    wiredTo: "Public Records · Probate + Pre-Foreclosure + Code Enforcement",
    sampleMessage: "Hi {{FirstName}}, Are You Open To Offers On The Property At {{Address}}? Cash, quick close, no fees.",
  },
  {
    slug: "insurance",
    industry: "Insurance",
    icon: Shield,
    hero: {
      eyebrow: "Built For Medicare, Life, Auto, And Final Expense",
      title: "Book More Policies.",
      highlight: "Chase",
      titleTail: "Fewer Dead Leads.",
      subtitle: "LeadTrace pulls fresh prospect lists by ZIP, age band, and business type — then skip-traces phones, scrubs DNC and litigators, and texts them for you.",
    },
    stats: [
      { value: "50 States", label: "Coverage" },
      { value: "Age Filters", label: "T65 · Medicare · U40" },
      { value: "Clean", label: "DNC + Litigator Scrubbed" },
      { value: "10DLC", label: "Compliant Sending" },
    ],
    useCases: [
      { title: "Medicare T65 Prospects", body: "New-to-65 lists by ZIP, filtered against DNC and known litigator databases before you touch them." },
      { title: "Final Expense / Life", body: "Senior homeowners with mortgages, filtered by age and geography — clean phones, ready to dial." },
      { title: "Commercial / P&C", body: "Business owners by trade and county for BOP, workers comp, and commercial auto renewals." },
      { title: "Auto Insurance Switchers", body: "Recent movers and homeowners bundled leads — text-first outreach that stops on reply." },
    ],
    benefits: commonBenefits([
      { title: "Litigator Scrub", body: "Known TCPA Litigators Removed Automatically — Every List, Every Time.", icon: Scale },
      { title: "Geo-Matched Numbers", body: "Local Area Codes That Actually Get Answered.", icon: Users },
    ]),
    audiences: [
      { title: "Independent Agents", body: "One Login Replaces Your Lead Vendor, Skip Tracer, And Dialer Setup Fees.", icon: Briefcase },
      { title: "Medicare Specialists", body: "T65 Birthday Lists Every Month, Age-Verified And Scrubbed Before Delivery.", icon: HeartPulse },
      { title: "IMOs & Agencies", body: "White-Labeled Lists Per Downline, Compliance Baked In For Every Rep.", icon: Users },
    ],
    wiredTo: "Business Scrape + Records · Age + Geography Filtered",
    sampleMessage: "Hey {{FirstName}}, quick question — Are You Still Reviewing Medicare Options This Year? No pressure, just checking in.",
  },
  {
    slug: "solar",
    industry: "Solar & Roofing",
    icon: Sun,
    hero: {
      eyebrow: "For Solar Installers, Roofers, And EPC Partners",
      title: "Book Roof Inspections.",
      highlight: "Close",
      titleTail: "Solar Deals.",
      subtitle: "Pull homeowners in your service area, filter by roof age and property type, and launch text campaigns that book site surveys — all in one place.",
    },
    stats: [
      { value: "Homeowners", label: "Owner-Occupied Only" },
      { value: "Roof Age", label: "10+ Year Filter" },
      { value: "Local", label: "Area-Code Matched SMS" },
      { value: "Reply-Stop", label: "Auto Pauses On Reply" },
    ],
    useCases: [
      { title: "Homeowners By ZIP", body: "Owner-occupied properties in your license area, filtered by home value and roof age." },
      { title: "Storm Response Lists", body: "Recent storm-affected ZIPs pulled overnight for roofing response campaigns." },
      { title: "Contractor Partner Leads", body: "Local roofers and GCs perfect for referral partnerships or sub-agreements." },
      { title: "Commercial Rooftops", body: "Business owners with large flat rooftops — perfect for commercial solar pitches." },
    ],
    benefits: commonBenefits([
      { title: "Local Number Rotation", body: "Every Message Sends From The Recipient's Area Code, Automatically.", icon: Sun },
      { title: "Bulk SMS Scheduling", body: "Blast Neighborhoods After A Hail Storm Or Utility Rate Hike In Minutes.", icon: Rocket },
    ]),
    audiences: [
      { title: "Solar Installers", body: "Fill The Setter Calendar Without Buying Warm-Transfers At $80 A Pop.", icon: Sun },
      { title: "Roofers", body: "Turn Storm Maps Into Text Campaigns Overnight.", icon: Hammer },
      { title: "Referral Partners", body: "Cross-Promote To Local Roofers And GCs For Warm Handoffs.", icon: Users },
    ],
    wiredTo: "Business Scrape · Roofers + Homeowners By Storm Zone",
    sampleMessage: "Hey {{FirstName}}, We Partner With Roofers On Solar Referrals — Worth A 5-Min Chat?",
  },
  {
    slug: "home-services",
    industry: "Home Services",
    icon: Wrench,
    hero: {
      eyebrow: "For HVAC, Plumbing, Electrical, And Contractors",
      title: "Fill The Truck.",
      highlight: "Book",
      titleTail: "Jobs This Week.",
      subtitle: "Pull homeowners in your county, target neighborhoods due for service, and text them from local numbers — one platform, one flat rate.",
    },
    stats: [
      { value: "Any Trade", label: "HVAC · Plumb · Electric" },
      { value: "Local", label: "Geo-Matched Numbers" },
      { value: "Seasonal", label: "Cooling / Heating Sync" },
      { value: "Reply-Stop", label: "Auto Pauses On Reply" },
    ],
    useCases: [
      { title: "Seasonal Tune-Ups", body: "Text every homeowner in your service area before the AC season hits." },
      { title: "Neighborhood Blasts", body: "Just finished a job? Text every home on the same street with a discount." },
      { title: "Commercial Accounts", body: "Local businesses by trade — restaurants, offices, and retail for service contracts." },
      { title: "Reactivation Campaigns", body: "Upload your old customer list and win back inactive accounts with SMS." },
    ],
    benefits: commonBenefits([
      { title: "Neighborhood Targeting", body: "Radius Around Any Address — Perfect For 'Just Worked Down The Street' Pitches.", icon: Home },
      { title: "Trade Filters", body: "Remove Franchises, Keep The Owner-Operators You Actually Want To Reach.", icon: Wrench },
    ]),
    audiences: [
      { title: "HVAC & Plumbing", body: "Book Tune-Ups Before The Season Turns.", icon: Wrench },
      { title: "Electricians & Handymen", body: "Owner-Operators Fill Their Own Schedule, No Ad Spend.", icon: Hammer },
      { title: "Multi-Location Contractors", body: "Route Leads By ZIP To The Right Crew Automatically.", icon: Users },
    ],
    wiredTo: "Business Scrape · Homeowners In {{County}}",
    sampleMessage: "Hi {{FirstName}}, Any HVAC / Plumbing Work Coming Up This Season? We're Booking For Next Week.",
  },
  {
    slug: "mortgage",
    industry: "Mortgage & Lending",
    icon: DollarSign,
    hero: {
      eyebrow: "For Loan Officers And Mortgage Brokers",
      title: "Fund More Loans.",
      highlight: "Skip",
      titleTail: "The Trigger-Lead Trap.",
      subtitle: "Build your own borrower lists from public records and business scrapes — no more overpaying for the same trigger leads every LO in town gets.",
    },
    stats: [
      { value: "Owner Records", label: "Public + Business Data" },
      { value: "Refi Signals", label: "Rate + Equity Filters" },
      { value: "Local", label: "Area-Code SMS" },
      { value: "Compliant", label: "DNC + Litigator Scrubbed" },
    ],
    useCases: [
      { title: "Refi Candidates", body: "Homeowners in your license area filtered by property value and estimated equity." },
      { title: "First-Time Buyer Zones", body: "Renters in ZIPs with rising rent-vs-buy ratios — perfect for FHA outreach." },
      { title: "Realtor Partners", body: "Every active agent in your MSA for referral partnership pitches." },
      { title: "Investor / DSCR Loans", body: "Absentee owners of 2-4 unit properties — DSCR-ready borrower lists." },
    ],
    benefits: commonBenefits([
      { title: "Realtor Partner Finder", body: "Every Local Agent, Sorted By Volume — Perfect For Co-Marketing Pitches.", icon: Briefcase },
    ]),
    audiences: [
      { title: "Loan Officers", body: "Stop Splitting Trigger Leads With Every LO In Town. Build Your Own.", icon: DollarSign },
      { title: "Mortgage Brokers", body: "Multi-State? Filter By License Zone And Reach Only Compliant ZIPs.", icon: Briefcase },
      { title: "Wholesale AEs", body: "Broker Partner Recruiting Without LinkedIn InMail Fatigue.", icon: Users },
    ],
    wiredTo: "Public Records + Business Scrape · Homeowners + Renters",
    sampleMessage: "Hi {{FirstName}}, Rates Dropped Again — Want A Quick Refi Check On {{Address}}? No Credit Pull.",
  },
  {
    slug: "auto",
    industry: "Auto Dealers & Detailing",
    icon: Car,
    hero: {
      eyebrow: "For Dealerships, Detailers, And Mobile Mechanics",
      title: "Move More Inventory.",
      highlight: "Book",
      titleTail: "More Bays.",
      subtitle: "Pull local car owners, lease-end prospects, and fleet managers — then text them from geo-matched numbers with reply-stop drips.",
    },
    stats: [
      { value: "Local", label: "Radius + ZIP Filters" },
      { value: "Fleet", label: "Business Vehicle Owners" },
      { value: "Lease-End", label: "Timing Signals" },
      { value: "Compliant", label: "DNC Scrubbed" },
    ],
    useCases: [
      { title: "Lease-End Buybacks", body: "Owners with leases coming due — perfect for buyback and trade-in campaigns." },
      { title: "Service Reactivation", body: "Old customers who haven't been in for 12+ months. Text them a service coupon." },
      { title: "Fleet Accounts", body: "Local delivery, contractor, and rideshare-heavy businesses for fleet sales." },
      { title: "Mobile Detail / Repair", body: "Homeowners in high-vehicle ZIPs — book mobile service appointments." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "Dealership BDCs", body: "Fill The Showroom Calendar From Cold Records — Not Just Web Leads.", icon: Car },
      { title: "Detailers & Mobile Techs", body: "Route Bookings By Neighborhood — Zero Overhead.", icon: Wrench },
      { title: "Fleet Sales Reps", body: "Local Businesses With Vehicles, Filtered By Trade And Size.", icon: Briefcase },
    ],
    wiredTo: "Business Scrape · Vehicle-Owning Households + Fleet Businesses",
    sampleMessage: "Hey {{FirstName}}, Your Lease Is Almost Up On The {{Model}} — Want The Trade-In Number Before It Ships?",
  },
  {
    slug: "medical",
    industry: "Medical & Wellness",
    icon: HeartPulse,
    hero: {
      eyebrow: "For Clinics, Med Spas, Dentists, And Practices",
      title: "Fill The Chairs.",
      highlight: "Rebook",
      titleTail: "Lapsed Patients.",
      subtitle: "Pull local prospects by demographic and business type — then reactivate old patients with compliant SMS. No PHI stored, ever.",
    },
    stats: [
      { value: "Local", label: "Radius Targeting" },
      { value: "Age Bands", label: "Demographic Filters" },
      { value: "No PHI", label: "Zero Patient Data Stored" },
      { value: "10DLC", label: "Compliant SMS" },
    ],
    useCases: [
      { title: "Med Spa & Aesthetic", body: "Target women 30-55 in high-income ZIPs for injectables and laser packages." },
      { title: "Dental / Ortho", body: "Families with kids in your radius — perfect for cleanings and Invisalign." },
      { title: "Chiro & PT", body: "Local businesses by trade for corporate wellness contracts." },
      { title: "Patient Reactivation", body: "Upload your inactive list, we scrub DNC and text them a return offer." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "Clinic Owners", body: "Front Desk Doesn't Have Time To Text 400 Lapsed Patients. We Do.", icon: HeartPulse },
      { title: "Med Spas", body: "Season Promos Blasted In Minutes, Not Days.", icon: Users },
      { title: "Multi-Location Groups", body: "Route Leads By ZIP To The Nearest Practice.", icon: Building2 },
    ],
    wiredTo: "Business Scrape · Demographics By ZIP",
    sampleMessage: "Hi {{FirstName}}, It's Been A Minute Since Your Last Visit — Want To Grab A Cleaning Slot This Month?",
  },
  {
    slug: "b2b",
    industry: "B2B / SaaS",
    icon: Briefcase,
    hero: {
      eyebrow: "For SDRs, Founders, And Growth Teams",
      title: "Skip The $60K Data Stack.",
      highlight: "Own",
      titleTail: "Your Lists.",
      subtitle: "Scrape businesses by trade, LinkedIn signal, or industry code — then enrich, verify, and cold-outreach from one place.",
    },
    stats: [
      { value: "Any Industry", label: "NAICS + Trade Filters" },
      { value: "Enriched", label: "Emails + Phones + Socials" },
      { value: "No Seat Fees", label: "Flat Platform Rate" },
      { value: "CSV Ready", label: "Export To Any CRM" },
    ],
    useCases: [
      { title: "Vertical Prospecting", body: "Every dental clinic in Texas. Every SaaS company in Austin. Filtered and enriched." },
      { title: "Local Chamber Lists", body: "Chambers, associations, and directories scraped and merged into one clean list." },
      { title: "Event Follow-Up", body: "Upload the attendee CSV. We enrich phones, emails, and LinkedIn URLs." },
      { title: "Partner Recruiting", body: "Find every agency, reseller, or affiliate in your space and reach out." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "SDR Teams", body: "Kill The ZoomInfo Contract. Same Data. Fraction Of The Price.", icon: Rocket },
      { title: "Founders", body: "First 100 Customers Without A $30K Data Budget.", icon: Briefcase },
      { title: "Growth / RevOps", body: "Programmatic Outbound With Lists You Actually Own.", icon: Users },
    ],
    wiredTo: "Business Scrape + Directory Data · Enriched Contacts",
    sampleMessage: "Hey {{FirstName}}, Saw {{Company}} Is Hiring — Curious If Outbound Is On Your Roadmap This Quarter?",
  },
  {
    slug: "ecommerce",
    industry: "E-Commerce & Retail",
    icon: ShoppingBag,
    hero: {
      eyebrow: "For DTC Brands, Retailers, And Wholesalers",
      title: "Wholesale Accounts.",
      highlight: "Retail",
      titleTail: "Placements.",
      subtitle: "Find every boutique, gift shop, and independent retailer in your category — then pitch them by SMS or email from one dashboard.",
    },
    stats: [
      { value: "Retailers", label: "Boutique + Big Box" },
      { value: "By Category", label: "Any Product Vertical" },
      { value: "Enriched", label: "Owner Contacts Included" },
      { value: "CSV Ready", label: "Export To Any CRM" },
    ],
    useCases: [
      { title: "Wholesale Prospecting", body: "Every boutique in your category, sorted by state and city." },
      { title: "Trade Show Follow-Up", body: "Upload the exhibitor list — we enrich phones and owner emails overnight." },
      { title: "Reseller Recruiting", body: "Find shops that already sell your competitors and pitch a switch." },
      { title: "Local Pop-Up Partners", body: "Coffee shops, gyms, and markets willing to host or cross-promote." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "DTC Brands", body: "Move From Amazon-Only To Real Wholesale Placement.", icon: ShoppingBag },
      { title: "Wholesalers / Reps", body: "Route Territories To Reps With One Click.", icon: Users },
      { title: "Retail Chains", body: "Local Supplier Discovery For Fresh SKUs.", icon: Building2 },
    ],
    wiredTo: "Business Scrape · Retailers By Category + Location",
    sampleMessage: "Hi {{FirstName}}, {{Product}} Is Doing 40% Margins For Boutiques Like {{Company}} — Worth A Line Sheet?",
  },
  {
    slug: "legal",
    industry: "Legal Services",
    icon: Scale,
    hero: {
      eyebrow: "For Personal Injury, Estate, And Business Attorneys",
      title: "Sign More Cases.",
      highlight: "Stay",
      titleTail: "Bar-Compliant.",
      subtitle: "Public records for probate, foreclosure, and business filings — filtered by matter type, scrubbed for known litigators, and text-ready.",
    },
    stats: [
      { value: "Public Records", label: "Court + Business Filings" },
      { value: "Matter Type", label: "Probate · Foreclosure · LLC" },
      { value: "Litigator Scrub", label: "Standard On Every List" },
      { value: "Audit Log", label: "Every Message Recorded" },
    ],
    useCases: [
      { title: "Probate & Estate", body: "New probate filings, sorted by county and estate size — for estate attorneys and their referral network." },
      { title: "Foreclosure Defense", body: "Fresh Lis Pendens filings, filtered by homeowner equity." },
      { title: "Business Formation", body: "New LLC and corp filings — perfect for pitching operating-agreement and compliance services." },
      { title: "PI Referral Partners", body: "Chiropractors and body shops in your service area for reciprocal referrals." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "Solo Attorneys", body: "One Login Replaces Your Lead Vendor And Docket Alerts.", icon: Scale },
      { title: "Small Firms", body: "Route New Filings To The Right Practice Area Automatically.", icon: Briefcase },
      { title: "Legal Marketing Agencies", body: "White-Labeled Case Sourcing For Every Firm Client.", icon: Users },
    ],
    wiredTo: "Public Records · Court Filings + Business Registrations",
    sampleMessage: "Hi {{FirstName}}, We Handle Probate Filings In {{County}} — Want A Free 15-Min Call On {{CaseNumber}}?",
  },
  {
    slug: "education",
    industry: "Education & Coaching",
    icon: GraduationCap,
    hero: {
      eyebrow: "For Coaches, Tutors, And Course Creators",
      title: "Fill Your Cohort.",
      highlight: "Book",
      titleTail: "Discovery Calls.",
      subtitle: "Find your ideal client by trade, ZIP, or life stage — then text them a discovery invite from a real local number.",
    },
    stats: [
      { value: "Any Niche", label: "Business + Consumer" },
      { value: "Local", label: "Geo-Matched Numbers" },
      { value: "Reply-Stop", label: "Auto Pauses On Reply" },
      { value: "CSV Ready", label: "Export To Any CRM" },
    ],
    useCases: [
      { title: "Business Coaches", body: "Owner-operators by trade — the exact avatar you promise on your sales page." },
      { title: "Tutors & Test Prep", body: "Families with school-age kids in high-income ZIPs." },
      { title: "Real Estate / Trades Trainers", body: "New agents and contractors — perfect for accelerator programs." },
      { title: "Community Recruiting", body: "Upload your waitlist, we enrich phones and text a warm invite." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "1:1 Coaches", body: "Fill Discovery Calendars Without Ad Spend.", icon: GraduationCap },
      { title: "Cohort Course Creators", body: "Launch Weeks Without Burning An Email List Out.", icon: Rocket },
      { title: "Local Educators", body: "Text Local Families From Real Numbers — Not Robocall Farms.", icon: Users },
    ],
    wiredTo: "Business Scrape + Consumer Records · Ideal-Client Filters",
    sampleMessage: "Hey {{FirstName}}, Opening 5 Spots In My {{Program}} Cohort This Month — Want The Details?",
  },
  {
    slug: "agency",
    industry: "Agencies",
    icon: Users,
    hero: {
      eyebrow: "For Marketing, Lead-Gen, And Growth Agencies",
      title: "White-Label",
      highlight: "The Whole",
      titleTail: "Pipeline.",
      subtitle: "Every client gets their own list, their own numbers, and their own compliance trail — under your brand, one flat rate.",
    },
    stats: [
      { value: "Per-Client", label: "Isolated Workspaces" },
      { value: "White-Label", label: "Your Domain + Logo" },
      { value: "Flat Rate", label: "No Per-Seat Fees" },
      { value: "10DLC", label: "Compliant Per Brand" },
    ],
    useCases: [
      { title: "Lead-Gen Retainers", body: "Deliver scrubbed lists monthly under your brand, on your reporting cadence." },
      { title: "SMS-as-a-Service", body: "Run text campaigns for local clients from geo-matched numbers." },
      { title: "Data & Enrichment", body: "Offer skip trace + DNC scrub as a productized add-on." },
      { title: "Fractional CMO", body: "Own the full outbound stack for portfolio brands without ten vendor logins." },
    ],
    benefits: commonBenefits(),
    audiences: [
      { title: "Lead-Gen Agencies", body: "Ditch The Spreadsheet Fulfillment Chaos. One Platform, All Clients.", icon: Rocket },
      { title: "Growth Studios", body: "Bolt Outbound Onto Retainers Without Another Vendor Contract.", icon: Users },
      { title: "GTM Consultancies", body: "White-Label Outbound Infra For Every Portfolio Company.", icon: Briefcase },
    ],
    wiredTo: "Upload · Your Client's List + Any Source We Support",
    sampleMessage: "White-Labeled Under Your Brand. Configurable Per Client.",
  },
];

export const getIndustryLanding = (slug: string) =>
  INDUSTRY_LANDINGS.find((i) => i.slug === slug);