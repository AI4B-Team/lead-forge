// ---------------------------------------------------------------------------
// Programmatic marketing landing pages (spec §9). One record per page, all
// rendered through a single component — never hand-built pages.
// Sample rows are fabricated: 555 phone numbers, invented business names.
// ---------------------------------------------------------------------------

export type SampleRow = {
  business: string;
  phone: string;
  lineType: "Mobile" | "Landline" | "VoIP";
  dnc: "Clear" | "Listed";
  litigator: "Clear" | "Flagged";
  rating: string;
  reviews: number;
  city: string;
  website: string;
  owner: string;
  email: string;
  source: string;
  lastVerified: string;
};

export type LeadPage = {
  slug: string;
  kind: "niche" | "stage";
  title: string;
  /** Niche label used to prefill the New Search screen (spec §9.5). */
  nicheLabel?: string;
  tags: string[];
  valueProp: string;
  rows: SampleRow[];
  funnelCaption: string;
  personas: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
};

/** One consistent fictional reference search reused across all marketing. */
export const REFERENCE_FUNNEL = {
  found: 1240,
  deduped: 1103,
  textable: 780,
  scrubbed: 566,
  clean: 554,
};

/** Freshness stamp — updates whenever this content collection is edited. */
export const CONTENT_UPDATED = "July 2026";

const CITIES = ["Tampa", "Brandon", "Clearwater", "Riverview", "St. Petersburg", "Lutz", "Wesley Chapel"];
const PHONES = ["(813) 555-0142", "(813) 555-0177", "(727) 555-0119", "(813) 555-0163", "(727) 555-0134", "(813) 555-0188", "(727) 555-0151"];
const RATINGS = ["4.9", "4.7", "4.8", "4.6", "5.0", "4.5", "4.8"];
const REVIEWS = [187, 93, 241, 58, 76, 132, 44];
const OWNERS = ["M. Alvarez", "J. Whitfield", "D. Nguyen", "R. Castellano", "T. Okafor", "S. Brennan", "L. Farrow"];
const SOURCES_SAMPLE = ["Public Records", "Business Directory", "Carrier Data", "Public Records", "Business Directory", "Uploaded List", "Public Records"];
const VERIFIED = ["Jul 28, 2026", "Jul 27, 2026", "Jul 29, 2026", "Jul 26, 2026", "Jul 29, 2026", "Jul 25, 2026", "Jul 28, 2026"];

function rows(entries: [string, string][]): SampleRow[] {
  return entries.map(([business, website], i) => ({
    business,
    phone: PHONES[i % PHONES.length]!,
    lineType: "Mobile" as const,
    dnc: "Clear" as const,
    litigator: "Clear" as const,
    rating: RATINGS[i % RATINGS.length]!,
    reviews: REVIEWS[i % REVIEWS.length]!,
    city: CITIES[i % CITIES.length]!,
    website,
    owner: OWNERS[i % OWNERS.length]!,
    email: `info@${website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}`,
    source: SOURCES_SAMPLE[i % SOURCES_SAMPLE.length]!,
    lastVerified: VERIFIED[i % VERIFIED.length]!,
  }));
}

/** FAQs 2–5 are identical on every page; only the market-size answer changes. */
function faqs(sizeAnswer: string, noun: string) {
  return [
    { q: `How many ${noun} will I get?`, a: sizeAnswer },
    {
      q: "Why Is My Clean List Smaller Than The Number Of Businesses Found?",
      a: "Because most of what scrapers hand you isn't textable. Duplicates, franchise branches, landlines, VoIP lines, DNC-registered numbers, and known litigators are all removed. A smaller list that's safe and mobile-only outperforms a big dirty one — and doesn't generate lawsuits.",
    },
    {
      q: "Do I Get Emails And Websites Too?",
      a: "Websites, yes — whenever the business lists one on Google. Emails are on the roadmap; Google Maps doesn't reliably expose them, and we don't pad lists with guessed addresses.",
    },
    {
      q: "Can I Re-Run The Same Search Weekly?",
      a: "Yes — recurring searches re-run automatically and flag only the businesses that are new since last time, so follow-up campaigns only hit fresh leads.",
    },
    {
      q: "Is Texting Cold Business Numbers Legal?",
      a: "B2B texting is subject to TCPA rules, which is exactly why the scrubbing, opt-out handling, and quiet hours are built in and non-removable. We provide compliance tooling and documentation; for advice on your specific campaigns, talk to your attorney.",
    },
  ];
}

type NicheSeed = {
  slug: string;
  title: string;
  noun: string;
  tags: string[];
  valueProp: string;
  size: string;
  entries: [string, string][];
  personas: { title: string; body: string }[];
};

const NICHE_SEEDS: NicheSeed[] = [
  {
    slug: "roofing-contractors",
    title: "Roofing Contractor Leads",
    noun: "roofing companies",
    tags: ["Home Services", "Lead Generation", "SMS-Ready"],
    valueProp:
      'Type "roofers" and a county. Get every roofing company on Google Maps — deduplicated, franchise-filtered, mobile-verified, and scrubbed against the National DNC Registry and known-litigator databases — as a clean, textable list in minutes. No download, no setup, no spreadsheets between steps.',
    size: "Depends on the market. A dense metro county typically returns 800–1,500 roofing businesses before cleaning; a rural county might return 60. The funnel on your results screen shows exactly what was found and what was filtered at each step.",
    entries: [
      ["Summit Ridge Roofing", "summitridgeroof.com"],
      ["Bayline Roof & Gutter", "baylineroofing.com"],
      ["Old Oak Roofing Co.", "oldoakroof.com"],
      ["Suncrest Exteriors", "suncrestext.com"],
      ["Harbor Peak Roofing", "harborpeak.com"],
    ],
    personas: [
      { title: "Storm Restoration & Retail Roofing Sales Teams", body: "Build a fresh canvass list for any county the day a storm map drops, instead of buying stale purchased lists." },
      { title: "Roofing Suppliers & Distributors", body: "Every contractor in your territory, with review counts to size them, ready for a rep outreach sequence." },
      { title: "Lead-Gen Agencies Serving Home Services", body: "Deliver client-ready, compliance-documented lists without stitching together three tools per order." },
      { title: "SaaS & Service Providers Selling To Roofers", body: "CRMs, financing, drone inspection, insurance — your ICP is literally on this map." },
    ],
  },
  {
    slug: "hvac-companies",
    title: "HVAC Company Leads",
    noun: "HVAC companies",
    tags: ["Home Services", "Lead Generation", "SMS-Ready"],
    valueProp:
      'Type "HVAC" and a county. Get every heating and air company on Google Maps — deduplicated, franchise-filtered, mobile-verified, and DNC and litigator scrubbed — as a clean, textable list in minutes.',
    size: "A metro county usually returns 600–1,200 HVAC businesses before cleaning; rural counties land closer to 40–100. The results funnel shows what was filtered at every step.",
    entries: [
      ["Cypress Air & Heat", "cypressairfl.com"],
      ["Northbay Climate Co.", "northbayclimate.com"],
      ["Ironwood Cooling", "ironwoodcooling.com"],
      ["Gulfline Comfort Systems", "gulflinecomfort.com"],
      ["Palm & Pine HVAC", "palmandpinehvac.com"],
    ],
    personas: [
      { title: "HVAC Distributors & Manufacturer Reps", body: "Every dealer and independent shop in your territory, sized by review volume." },
      { title: "Private Equity & Roll-Up Acquirers", body: "Map the independent operators in a metro before you send a single LOI." },
      { title: "Home Services Marketing Agencies", body: "Prospect contractors who already have reviews — proof they have revenue to spend." },
      { title: "Financing & Warranty Providers", body: "Reach the shops selling installs every day, without buying a stale list." },
    ],
  },
  {
    slug: "plumbers",
    title: "Plumber Leads",
    noun: "plumbing companies",
    tags: ["Home Services", "Lead Generation", "SMS-Ready"],
    valueProp:
      'Type "plumbers" and a county. Every plumbing company on Google Maps, deduplicated, franchise-filtered, mobile-verified, and scrubbed against DNC and litigator databases before you see it.',
    size: "Dense counties typically return 700–1,400 plumbing businesses before cleaning; rural markets land near 50. Your funnel shows the exact drop at each stage.",
    entries: [
      ["Copperline Plumbing", "copperlineplumb.com"],
      ["Anchor Drain & Sewer", "anchordrainco.com"],
      ["Westgate Plumbing Co.", "westgateplumbing.com"],
      ["Blue Marsh Pipeworks", "bluemarshpipe.com"],
      ["Rally Point Plumbing", "rallypointplumb.com"],
    ],
    personas: [
      { title: "Supply Houses & Wholesalers", body: "Reach every independent plumber in your delivery radius with one list." },
      { title: "Service Software Vendors", body: "Dispatch, invoicing, and CRM sellers get an ICP list with review-count sizing built in." },
      { title: "Lead-Gen Agencies", body: "Deliver compliance-documented plumber lists per county, on demand." },
      { title: "Recruiters & Staffing Firms", body: "Shops with high review velocity are the ones hiring." },
    ],
  },
  {
    slug: "electricians",
    title: "Electrician Leads",
    noun: "electrical contractors",
    tags: ["Home Services", "Trades", "SMS-Ready"],
    valueProp:
      'Type "electricians" and a county. Get the full Google Maps set of electrical contractors — cleaned, mobile-verified, and DNC and litigator scrubbed — ready to text.',
    size: "Metro counties commonly return 500–1,000 electrical contractors before cleaning; rural counties can be under 50.",
    entries: [
      ["Meridian Electric Co.", "meridianelectricco.com"],
      ["Brightpath Electrical", "brightpathelec.com"],
      ["Stonegate Power & Light", "stonegatepower.com"],
      ["Live Oak Electric", "liveoakelectric.com"],
      ["Kestrel Wiring Group", "kestrelwiring.com"],
    ],
    personas: [
      { title: "Electrical Supply Distributors", body: "Every licensed shop in your service territory, in one clean file." },
      { title: "Solar & EV Charger Installers", body: "Sub-contract partners and referral sources, mapped by county." },
      { title: "Trade Software Vendors", body: "Sell scheduling and estimating tools to shops that clearly have volume." },
      { title: "Agencies Serving The Trades", body: "Client-ready lists with an exportable scrub log attached." },
    ],
  },
  {
    slug: "landscaping",
    title: "Landscaping Company Leads",
    noun: "landscaping companies",
    tags: ["Home Services", "Seasonal", "SMS-Ready"],
    valueProp:
      'Type "landscaping" and a county. Every lawn and landscape business on Google Maps, deduped, franchise-filtered, mobile-verified, and fully scrubbed.',
    size: "Landscaping is fragmented: a metro county often returns 900–1,800 businesses, though many are solo operators with mobile numbers — which is good news for texting.",
    entries: [
      ["Fernbank Lawn & Landscape", "fernbanklawn.com"],
      ["Grovewood Grounds", "grovewoodgrounds.com"],
      ["Silver Fern Landscaping", "silverfernland.com"],
      ["Kingsbury Yard Care", "kingsburyyard.com"],
      ["Sable Creek Outdoors", "sablecreekout.com"],
    ],
    personas: [
      { title: "Equipment Dealers", body: "Mowers, trailers, and parts — your buyers are every crew in the county." },
      { title: "Nurseries & Material Suppliers", body: "Reach installers before the spring season starts." },
      { title: "Roll-Up Acquirers", body: "Identify and size independents across an entire metro." },
      { title: "Marketing Agencies", body: "Seasonal campaigns to a list that's already compliant." },
    ],
  },
  {
    slug: "pressure-washing",
    title: "Pressure Washing Leads",
    noun: "pressure washing businesses",
    tags: ["Home Services", "Owner-Operator", "SMS-Ready"],
    valueProp:
      'Type "pressure washing" and a county. A cleaned, mobile-only list of exterior cleaning operators, scrubbed against DNC and litigator databases before delivery.',
    size: "Mostly owner-operators: a metro county returns 200–600 listings, and the mobile rate is unusually high, so the Clean List stays large relative to Found.",
    entries: [
      ["Clearwater Softwash", "clearwatersoftwash.com"],
      ["Tidepoint Exterior Cleaning", "tidepointclean.com"],
      ["Bright Coast Washing", "brightcoastwash.com"],
      ["Redbrick Powerwash", "redbrickpowerwash.com"],
      ["Whitecap Surface Care", "whitecapsurface.com"],
    ],
    personas: [
      { title: "Equipment & Chemical Suppliers", body: "Owner-operators buy consumables constantly and answer their cell." },
      { title: "Franchise Developers", body: "Recruit successful independents into your system." },
      { title: "Business Coaches & Course Sellers", body: "A vertical with a hungry, reachable audience." },
      { title: "Agencies", body: "Cheap, compliant lists for a fast-moving service niche." },
    ],
  },
  {
    slug: "tree-service",
    title: "Tree Service Leads",
    noun: "tree service companies",
    tags: ["Home Services", "Storm Response", "SMS-Ready"],
    valueProp:
      'Type "tree service" and a county. Every arborist and removal crew on Google Maps, deduplicated and fully scrubbed, ready for outreach.',
    size: "Expect 150–500 tree businesses in a metro county before cleaning, with a strong mobile rate among crews.",
    entries: [
      ["Highgrove Tree Care", "highgrovetree.com"],
      ["Timberline Arbor Co.", "timberlinearbor.com"],
      ["Cedar & Stone Tree Service", "cedarstonetree.com"],
      ["Ridgeway Removals", "ridgewayremovals.com"],
      ["Green Hollow Arborists", "greenhollowarb.com"],
    ],
    personas: [
      { title: "Equipment & Chipper Dealers", body: "Every crew in the region in one file." },
      { title: "Insurance & Storm Restoration Firms", body: "Build a subcontractor bench before the next storm." },
      { title: "Municipal & Utility Contractors", body: "Source local crews for vegetation management bids." },
      { title: "Agencies", body: "Seasonal storm campaigns without compliance risk." },
    ],
  },
  {
    slug: "pest-control",
    title: "Pest Control Leads",
    noun: "pest control companies",
    tags: ["Home Services", "Recurring Revenue", "SMS-Ready"],
    valueProp:
      'Type "pest control" and a county. A deduplicated, franchise-filtered, mobile-verified list of pest and termite operators — scrubbed before you see it.',
    size: "Metro counties return 200–600 pest control businesses; franchise filtering removes a large share, leaving the independents most people actually want.",
    entries: [
      ["Sentry Pest Solutions", "sentrypest.com"],
      ["Palmetto Termite & Pest", "palmettotermite.com"],
      ["Nova Shield Pest", "novashieldpest.com"],
      ["Ironbark Exterminating", "ironbarkext.com"],
      ["Coastal Guard Pest Co.", "coastalguardpest.com"],
    ],
    personas: [
      { title: "Chemical & Equipment Distributors", body: "Reach every licensed applicator in the territory." },
      { title: "Acquirers & Franchise Groups", body: "Independents with recurring contracts are prime targets." },
      { title: "Field Service Software Vendors", body: "Route-based businesses are your best-fit buyers." },
      { title: "Agencies", body: "Compliance-documented lists per county." },
    ],
  },
  {
    slug: "med-spas",
    title: "Med Spa Leads",
    noun: "med spas",
    tags: ["Health & Beauty", "High Ticket", "SMS-Ready"],
    valueProp:
      'Type "med spa" and a county. Every aesthetics clinic on Google Maps, deduplicated and scrubbed against DNC and litigator databases, delivered as a textable list.',
    size: "A metro county typically returns 150–450 med spas. This niche skews toward business landlines, so the mobile-verified Clean List is smaller but far more responsive.",
    entries: [
      ["Lumen Aesthetics Studio", "lumenaesthetics.com"],
      ["Ivory Lane Med Spa", "ivorylanespa.com"],
      ["Solstice Skin Bar", "solsticeskinbar.com"],
      ["Verano Wellness & Aesthetics", "veranowell.com"],
      ["Halo Glow Medical Spa", "haloglowmed.com"],
    ],
    personas: [
      { title: "Device & Injectable Distributors", body: "Your entire buyer universe in a metro, sized by review count." },
      { title: "Practice Management Software", body: "Booking, EMR, and payments vendors get a precise ICP." },
      { title: "Aesthetics Staffing & Training", body: "Reach clinics hiring injectors and estheticians." },
      { title: "Agencies", body: "High-ticket clients that spend on marketing." },
    ],
  },
  {
    slug: "dental-offices",
    title: "Dental Office Leads",
    noun: "dental practices",
    tags: ["Healthcare", "B2B", "SMS-Ready"],
    valueProp:
      'Type "dentist" and a county. Every dental practice on Google Maps, deduplicated, DSO-filtered, mobile-verified where available, and fully scrubbed.',
    size: "A metro county usually returns 500–1,200 dental listings before cleaning. Many are front-desk landlines, so expect a smaller mobile Clean List and a large call-only segment.",
    entries: [
      ["Bayside Family Dental", "baysidefamdental.com"],
      ["Northfield Dental Group", "northfielddental.com"],
      ["Copper Leaf Dentistry", "copperleafdds.com"],
      ["Harborview Smile Studio", "harborviewsmile.com"],
      ["Aspen Ridge Dental Arts", "aspenridgedental.com"],
    ],
    personas: [
      { title: "Dental Supply & Lab Reps", body: "Territory coverage without a purchased list." },
      { title: "DSOs & Acquirers", body: "Map independent practices before outreach." },
      { title: "Practice Software Vendors", body: "Scheduling, imaging, and billing buyers in one file." },
      { title: "Agencies", body: "Local practices with steady marketing budgets." },
    ],
  },
  {
    slug: "gyms-fitness-studios",
    title: "Gym & Fitness Studio Leads",
    noun: "gyms and studios",
    tags: ["Fitness", "Local Business", "SMS-Ready"],
    valueProp:
      'Type "gym" and a county. Every fitness studio, box, and training facility on Google Maps — deduped, chain-filtered, and scrubbed before delivery.',
    size: "Metro counties commonly return 300–800 fitness locations. Chain filtering removes the national brands, leaving independent studios.",
    entries: [
      ["Ironhouse Strength Co.", "ironhousestrength.com"],
      ["Pulse Method Studio", "pulsemethod.com"],
      ["Northline Athletic Club", "northlineathletic.com"],
      ["Ember Cycle Studio", "embercycle.com"],
      ["Grit & Grace Fitness", "gritandgracefit.com"],
    ],
    personas: [
      { title: "Equipment Dealers", body: "Independent studios refresh gear constantly." },
      { title: "Gym Management Software", body: "Member billing and check-in vendors get a clean ICP." },
      { title: "Supplement & Apparel Brands", body: "Wholesale outreach to owner-operators." },
      { title: "Agencies", body: "Local businesses that live and die on lead flow." },
    ],
  },
  {
    slug: "auto-repair-shops",
    title: "Auto Repair Shop Leads",
    noun: "auto repair shops",
    tags: ["Automotive", "Local Business", "SMS-Ready"],
    valueProp:
      'Type "auto repair" and a county. Every independent shop on Google Maps, deduplicated, chain-filtered, mobile-verified, and DNC and litigator scrubbed.',
    size: "A metro county returns 800–1,600 auto repair listings before cleaning; chain filtering removes a meaningful slice of national brands.",
    entries: [
      ["Torque & Tune Auto", "torqueandtune.com"],
      ["Gearworks Service Center", "gearworksauto.com"],
      ["Redline Automotive Co.", "redlineautoco.com"],
      ["Pinehurst Motor Works", "pinehurstmotor.com"],
      ["Anvil Auto Repair", "anvilautorepair.com"],
    ],
    personas: [
      { title: "Parts Distributors", body: "Every independent shop in your delivery radius." },
      { title: "Shop Management Software", body: "Estimating and DVI vendors get a precise buyer list." },
      { title: "Warranty & Financing Providers", body: "Reach shops selling big-ticket repairs daily." },
      { title: "Agencies", body: "Local service businesses with recurring ad spend." },
    ],
  },
  {
    slug: "movers",
    title: "Moving Company Leads",
    noun: "moving companies",
    tags: ["Logistics", "Local Business", "SMS-Ready"],
    valueProp:
      'Type "movers" and a county. Every moving and relocation company on Google Maps, deduped, franchise-filtered, and fully scrubbed for compliant outreach.',
    size: "Metro counties return 200–700 moving companies before cleaning. Owner-operator mobile numbers are common, so Clean Lists stay healthy.",
    entries: [
      ["Cardinal Moving Co.", "cardinalmoving.com"],
      ["Bright Haul Movers", "brighthaul.com"],
      ["Stonepath Relocation", "stonepathmove.com"],
      ["Fairwind Moving Group", "fairwindmoving.com"],
      ["Two Rivers Movers", "tworiversmovers.com"],
    ],
    personas: [
      { title: "Truck & Equipment Lessors", body: "Fleet buyers, county by county." },
      { title: "Insurance & Bonding Providers", body: "Every licensed mover in your state footprint." },
      { title: "Lead Marketplaces", body: "Recruit suppliers for your quote network." },
      { title: "Agencies", body: "Seasonal campaigns for a high-churn vertical." },
    ],
  },
  {
    slug: "cleaning-services",
    title: "Cleaning Service Leads",
    noun: "cleaning companies",
    tags: ["Home Services", "Recurring Revenue", "SMS-Ready"],
    valueProp:
      'Type "cleaning service" and a county. Residential and commercial cleaners from Google Maps, deduplicated, franchise-filtered, mobile-verified, and scrubbed.',
    size: "Highly fragmented: metro counties return 600–1,500 cleaning businesses, many of them solo operators reachable on mobile.",
    entries: [
      ["Marble & Moss Cleaning", "marbleandmoss.com"],
      ["Fresh Field Home Care", "freshfieldclean.com"],
      ["Sterling Shine Services", "sterlingshine.com"],
      ["Bluebird Janitorial", "bluebirdjanitorial.com"],
      ["Neat Nest Cleaning Co.", "neatnestclean.com"],
    ],
    personas: [
      { title: "Janitorial Supply Distributors", body: "Reach every operator buying consumables monthly." },
      { title: "Franchise Developers", body: "Recruit independents into your brand." },
      { title: "Scheduling Software Vendors", body: "Route-based operators are ideal buyers." },
      { title: "Agencies", body: "Low-cost, high-volume local clients." },
    ],
  },
  {
    slug: "real-estate-agents",
    title: "Real Estate Agent Leads",
    noun: "agents and brokerages",
    tags: ["Real Estate", "B2B", "SMS-Ready"],
    valueProp:
      'Type "real estate agent" and a county. Agents and brokerages from Google Maps, deduplicated, mobile-verified, and DNC and litigator scrubbed before delivery.',
    size: "Agents list heavily on Maps: a metro county can return 1,500–3,000 listings before cleaning, with a very high mobile rate.",
    entries: [
      ["Harborstone Realty Group", "harborstonerealty.com"],
      ["Latitude Home Partners", "latitudehomes.com"],
      ["Oakmont Property Co.", "oakmontproperty.com"],
      ["Bright Key Realty", "brightkeyrealty.com"],
      ["Cypress Point Realty", "cypresspointre.com"],
    ],
    personas: [
      { title: "Mortgage & Title Companies", body: "Referral partners across an entire metro." },
      { title: "Proptech & CRM Vendors", body: "Agents are your ICP; this is the whole map." },
      { title: "Photography & Staging Services", body: "Recurring vendor work from active agents." },
      { title: "Brokerage Recruiters", body: "Find producing agents by review volume." },
    ],
  },
  {
    slug: "real-estate-investors",
    title: "Real Estate Investor Leads",
    noun: "real estate investors",
    tags: ["Real Estate", "Investors", "SMS-Ready"],
    valueProp:
      'Type "real estate investors" and a county. Cash buyers, landlords, and flippers from public records and business directories — deduplicated, mobile-verified, and DNC and litigator scrubbed before delivery.',
    size: "Investor density varies by market: a metro county often returns 400–1,200 investor-related contacts before cleaning. Mobile rates are high because most investors run their deals from a cell phone.",
    entries: [
      ["Summit Capital Holdings", "summitcapitalhold.com"],
      ["Tampa Bay Home Buyers", "tampabayhomebuyers.com"],
      ["Brickhouse Property Group", "brickhousepg.com"],
      ["Meridian Equity Partners", "meridianequity.com"],
      ["Oak Stream Investments", "oakstreaminvest.com"],
    ],
    personas: [
      { title: "Wholesalers Offloading Deals", body: "Reach active cash buyers in any county with one list." },
      { title: "Real Estate Coaches & Masterminds", body: "Investors are the audience that pays for education and systems." },
      { title: "Hard Money Lenders & Private Capital", body: "Lend to the operators closing deals every month." },
      { title: "Title & Closing Services", body: "Investors repeat frequently; a relationship is worth the first deal." },
    ],
  },
  {
    slug: "property-management",
    title: "Property Management Leads",
    noun: "property management companies",
    tags: ["Real Estate", "Property Management", "SMS-Ready"],
    valueProp:
      'Type "property management" and a county. Every residential and commercial property manager on Google Maps — deduplicated, mobile-verified, and DNC and litigator scrubbed.',
    size: "Metro counties typically return 150–400 property management companies before cleaning. Many are small shops with owner-operator mobile numbers.",
    entries: [
      ["Harbor Key Property Management", "harborkeypm.com"],
      ["Pinnacle Residential Management", "pinnacleresidential.com"],
      ["Bayfront Property Group", "bayfrontpg.com"],
      ["Sterling Park Management", "sterlingparkmgmt.com"],
      ["Coastal Ridge Property Co.", "coastalridgepm.com"],
    ],
    personas: [
      { title: "Maintenance & Repair Vendors", body: "Property managers are the gatekeepers to every unit in their portfolio." },
      { title: "Landlord Insurance Providers", body: "Portfolio owners and the managers they trust." },
      { title: "PropTech & Software Vendors", body: "Accounting, portals, and inspection tools sell to managers first." },
      { title: "Real Estate Investors", body: "Find managers who work with out-of-state owners and off-market inventory." },
    ],
  },
  {
    slug: "hard-money-lenders",
    title: "Hard Money Lender Leads",
    noun: "hard money lenders",
    tags: ["Real Estate", "Lenders", "SMS-Ready"],
    valueProp:
      'Type "hard money lenders" and a county. Private and hard-money lenders from public records and business directories — deduplicated, mobile-verified, and DNC and litigator scrubbed.',
    size: "Hard money lenders are concentrated in active markets: expect 80–250 lenders and capital groups per metro county before cleaning.",
    entries: [
      ["Bayline Capital Funding", "baylinecapital.com"],
      ["Ironwood Bridge Loans", "ironwoodbridge.com"],
      ["Summit Ridge Lending Group", "summitridge-lending.com"],
      ["Palm Harbor Private Capital", "palmharborpc.com"],
      ["Clearwater Equity Lending", "clearwaterequity.com"],
    ],
    personas: [
      { title: "Real Estate Investors", body: "Connect with private capital for fix-and-flips, BRRRRs, and rentals." },
      { title: "Wholesalers", body: "Send your deals to lenders who can close your buyer fast." },
      { title: "Note Buyers & Brokers", body: "Lenders are the source of performing and non-performing paper." },
      { title: "Real Estate Attorney & Title Firms", body: "The closers lenders work with repeatedly." },
    ],
  },
];

type StageSeed = {
  slug: string;
  title: string;
  tags: string[];
  valueProp: string;
  size: string;
  noun: string;
  personas: { title: string; body: string }[];
};

const STAGE_SEEDS: StageSeed[] = [
  {
    slug: "google-maps-lead-finder",
    title: "Google Maps Lead Finder",
    tags: ["Pipeline Stage", "Scraping", "No Download"],
    noun: "businesses",
    valueProp:
      "Pull every business Google Maps knows about for a niche and a geography — through an API, not browser automation. No CAPTCHAs, no desktop app, no local execution. This is one step of five; here's the whole pipeline in one place.",
    size: "It depends entirely on niche density. The point of the funnel is that the raw found count is the least useful number on the screen — what matters is how many survive cleaning and scrubbing.",
    personas: [
      { title: "Teams Currently Paying For A Scraper", body: "You're buying step one of five and doing the other four in spreadsheets." },
      { title: "Agencies Building Client Lists", body: "Skip the export-import shuffle between three tools." },
      { title: "Sales Teams Building Territory Maps", body: "One search per county, re-runnable weekly." },
      { title: "Anyone Tired Of CAPTCHAs", body: "API-based extraction means nothing to solve and nothing to babysit." },
    ],
  },
  {
    slug: "landline-remover",
    title: "Landline Remover",
    tags: ["Pipeline Stage", "Carrier Lookup", "Mobile-Only"],
    noun: "mobile numbers",
    valueProp:
      "Carrier lookup on every number tells you which lines are mobile, which are landlines, and which are VoIP. Landlines aren't deleted — they're labeled, so you can still call them. Only mobile lines enter the textable pool. This is one step of five; here's the whole pipeline in one place.",
    size: "Across business niches, roughly 55–75% of Google Maps numbers come back mobile. Owner-operator trades run higher; clinics and offices run lower.",
    personas: [
      { title: "SMS Marketers", body: "Texting a landline burns a segment and hurts deliverability metrics." },
      { title: "Cold Callers", body: "Keep the landlines — they're labeled, not discarded." },
      { title: "Agencies", body: "Prove list quality to clients with line-type columns." },
      { title: "Anyone Paying Per Segment", body: "Stop spending on numbers that can't receive a text." },
    ],
  },
  {
    slug: "dnc-list-scrubbing",
    title: "DNC List Scrubbing",
    tags: ["Pipeline Stage", "Compliance", "Audit Trail"],
    noun: "scrubbed records",
    valueProp:
      "Every number is checked against the National Do Not Call Registry in real time, and every check is stamped with the provider, timestamp, and reference ID on the record. Lists older than 30 days are re-scrubbed automatically before any campaign launches. This is one step of five; here's the whole pipeline in one place.",
    size: "Typically 15–30% of a raw business list comes back DNC-listed. Those records land in their own file so you have a timestamped record of every number you correctly didn't text.",
    personas: [
      { title: "Anyone Running Cold SMS", body: "The scrub log is your defense, and it exports in one click." },
      { title: "Compliance Officers", body: "Per-record provider reference IDs, not a vague promise." },
      { title: "Agencies", body: "Hand clients a documented list, not a raw scrape." },
      { title: "Teams Re-Using Old Lists", body: "Automatic 30-day re-scrub closes the biggest gap." },
    ],
  },
  {
    slug: "litigator-scrub",
    title: "Litigator Scrub",
    tags: ["Pipeline Stage", "Compliance", "Hard Block"],
    noun: "flagged records",
    valueProp:
      "Known TCPA litigators and serial plaintiffs are matched against a continuously updated database and hard-blocked — they cannot be added to a campaign by any path, including manual upload. This is one step of five; here's the whole pipeline in one place.",
    size: "Litigator hits are rare — often under 2% of a list — but a single one can cost more than a year of software. They go in their own file for your records.",
    personas: [
      { title: "High-Volume SMS Senders", body: "The cheapest insurance in your stack." },
      { title: "Legal & Compliance Teams", body: "A hard block, enforced in code, not a checkbox." },
      { title: "Agencies", body: "Protect clients from the one number that ends a campaign." },
      { title: "List Buyers", body: "Purchased lists are exactly where litigators hide." },
    ],
  },
  {
    slug: "sms-lead-outreach",
    title: "SMS Lead Outreach",
    tags: ["Pipeline Stage", "Campaigns", "TCPA"],
    noun: "sends per day",
    valueProp:
      "Push a Clean List straight into a drip campaign: a short message sequence with merge fields, a non-removable opt-out footer, throttled sending, quiet-hours enforcement by recipient timezone, and automatic permanent STOP handling. This is the last of five steps; here's the whole pipeline in one place.",
    size: "Throttle and number pool decide the ceiling. Most teams start at a few hundred sends a day per number and scale as the number warms.",
    personas: [
      { title: "Teams Using A Separate Texting Tool", body: "No export, no import, no mismatched columns." },
      { title: "Sales Teams", body: "Replies land in a shared inbox instead of a personal phone." },
      { title: "Agencies", body: "Per-client brands, numbers, and sequences in one console." },
      { title: "Compliance-First Operators", body: "Footer, quiet hours, and STOP handling can't be switched off." },
    ],
  },
];

const STAGE_ROWS = rows([
  ["Summit Ridge Roofing", "summitridgeroof.com"],
  ["Cypress Air & Heat", "cypressairfl.com"],
  ["Copperline Plumbing", "copperlineplumb.com"],
  ["Meridian Electric Co.", "meridianelectricco.com"],
  ["Sentry Pest Solutions", "sentrypest.com"],
]);

export const LEAD_PAGES: LeadPage[] = [
  ...NICHE_SEEDS.map<LeadPage>((n) => ({
    slug: n.slug,
    kind: "niche",
    title: n.title,
    nicheLabel: n.title.replace(/\s+Leads$/i, ""),
    tags: n.tags,
    valueProp: n.valueProp,
    rows: rows(n.entries),
    funnelCaption:
      "A real Hillsborough County reference search. The 554 is the list you text. The 686 removed records are why you don't get sued.",
    personas: n.personas,
    faqs: faqs(n.size, n.noun),
    metaTitle: `${n.title} — Clean, DNC-Scrubbed, Textable Lists | LeadTrace`,
    metaDescription: `Get every ${n.noun.replace(/^([a-z])/, "$1")} on Google Maps in your county — deduplicated, mobile-verified, DNC and litigator scrubbed, ready to text. No download, no setup.`,
  })),
  ...STAGE_SEEDS.map<LeadPage>((s) => ({
    slug: s.slug,
    kind: "stage",
    title: s.title,
    tags: s.tags,
    valueProp: s.valueProp,
    rows: STAGE_ROWS,
    funnelCaption:
      "One consistent reference search across our marketing: 1,240 found, 554 clean. Every stage below is part of the same run.",
    personas: s.personas,
    faqs: faqs(s.size, s.noun),
    metaTitle: `${s.title} — One Step Of The Whole Pipeline | LeadTrace`,
    metaDescription: `${s.title} built into a single browser-based pipeline: scrape, clean, scrub, and text — with a timestamped compliance audit trail on every record.`,
  })),
];

export function getLeadPage(slug: string): LeadPage | undefined {
  return LEAD_PAGES.find((p) => p.slug === slug);
}

/**
 * Landing-to-app funnel (spec §9.5): every niche CTA deep-links into New Search
 * with the niche prefilled. Unauthenticated visitors sign up first and land on
 * the same half-completed search — never a generic signup dead end.
 */
export function startSearchLink(page: LeadPage) {
  const niche = page.nicheLabel;
  if (!niche) return { mode: "signup" as const };
  return {
    mode: "signup" as const,
    redirect: `/app/new-job/business?niche=${encodeURIComponent(niche)}`,
  };
}

/** Three sibling niche pages + the pipeline-stage pages, for block [10]. */
export function crossLinks(page: LeadPage) {
  const related = LEAD_PAGES.filter((p) => p.kind === page.kind && p.slug !== page.slug).slice(0, 3);
  const stages = LEAD_PAGES.filter((p) => p.kind === "stage" && p.slug !== page.slug).slice(0, 3);
  const alsoLike = LEAD_PAGES.filter((p) => p.kind === "niche" && p.slug !== page.slug)
    .slice(3, 6);
  return { related, stages, alsoLike };
}
