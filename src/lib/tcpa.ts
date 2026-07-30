// Area-code → IANA timezone map (US + Canada). Used for TCPA quiet-hour
// enforcement: no sends before 8am or after 9pm in the recipient's local time.
// Coverage is intentionally broad; unknown area codes fall back to America/New_York.

const AREA_CODE_TZ: Record<string, string> = {
  // Eastern
  "202":"America/New_York","203":"America/New_York","207":"America/New_York","212":"America/New_York",
  "215":"America/New_York","216":"America/New_York","239":"America/New_York","267":"America/New_York",
  "301":"America/New_York","302":"America/New_York","305":"America/New_York","321":"America/New_York",
  "347":"America/New_York","352":"America/New_York","386":"America/New_York","401":"America/New_York",
  "404":"America/New_York","407":"America/New_York","410":"America/New_York","412":"America/New_York",
  "413":"America/New_York","443":"America/New_York","470":"America/New_York","475":"America/New_York",
  "484":"America/New_York","516":"America/New_York","518":"America/New_York","540":"America/New_York",
  "561":"America/New_York","570":"America/New_York","585":"America/New_York","603":"America/New_York",
  "607":"America/New_York","610":"America/New_York","614":"America/New_York","617":"America/New_York",
  "631":"America/New_York","646":"America/New_York","678":"America/New_York","703":"America/New_York",
  "704":"America/New_York","716":"America/New_York","717":"America/New_York","718":"America/New_York",
  "727":"America/New_York","732":"America/New_York","734":"America/New_York","754":"America/New_York",
  "757":"America/New_York","770":"America/New_York","772":"America/New_York","786":"America/New_York",
  "804":"America/New_York","813":"America/New_York","814":"America/New_York","828":"America/New_York",
  "843":"America/New_York","845":"America/New_York","848":"America/New_York","856":"America/New_York",
  "857":"America/New_York","860":"America/New_York","862":"America/New_York","863":"America/New_York",
  "864":"America/New_York","904":"America/New_York","908":"America/New_York","910":"America/New_York",
  "914":"America/New_York","917":"America/New_York","919":"America/New_York","929":"America/New_York",
  "934":"America/New_York","941":"America/New_York","954":"America/New_York","973":"America/New_York",
  "980":"America/New_York","984":"America/New_York",
  // Central
  "205":"America/Chicago","210":"America/Chicago","214":"America/Chicago","217":"America/Chicago",
  "218":"America/Chicago","224":"America/Chicago","225":"America/Chicago","228":"America/Chicago",
  "229":"America/Chicago","251":"America/Chicago","254":"America/Chicago","262":"America/Chicago",
  "270":"America/Chicago","281":"America/Chicago","309":"America/Chicago","312":"America/Chicago",
  "314":"America/Chicago","318":"America/Chicago","319":"America/Chicago","320":"America/Chicago",
  "325":"America/Chicago","331":"America/Chicago","337":"America/Chicago","346":"America/Chicago",
  "361":"America/Chicago","362":"America/Chicago","405":"America/Chicago","409":"America/Chicago",
  "414":"America/Chicago","417":"America/Chicago","430":"America/Chicago","432":"America/Chicago",
  "463":"America/Chicago","469":"America/Chicago","479":"America/Chicago","501":"America/Chicago",
  "504":"America/Chicago","507":"America/Chicago","512":"America/Chicago","515":"America/Chicago",
  "563":"America/Chicago","573":"America/Chicago","580":"America/Chicago","601":"America/Chicago",
  "605":"America/Chicago","608":"America/Chicago","612":"America/Chicago","615":"America/Chicago",
  "618":"America/Chicago","620":"America/Chicago","630":"America/Chicago","636":"America/Chicago",
  "641":"America/Chicago","651":"America/Chicago","662":"America/Chicago","682":"America/Chicago",
  "701":"America/Chicago","708":"America/Chicago","712":"America/Chicago","713":"America/Chicago",
  "715":"America/Chicago","731":"America/Chicago","737":"America/Chicago","763":"America/Chicago",
  "769":"America/Chicago","773":"America/Chicago","779":"America/Chicago","785":"America/Chicago",
  "806":"America/Chicago","815":"America/Chicago","816":"America/Chicago","817":"America/Chicago",
  "830":"America/Chicago","832":"America/Chicago","847":"America/Chicago","870":"America/Chicago",
  "872":"America/Chicago","901":"America/Chicago","903":"America/Chicago","913":"America/Chicago",
  "915":"America/Chicago","918":"America/Chicago","920":"America/Chicago","931":"America/Chicago",
  "936":"America/Chicago","940":"America/Chicago","952":"America/Chicago","956":"America/Chicago",
  "972":"America/Chicago","979":"America/Chicago","985":"America/Chicago",
  // Mountain
  "303":"America/Denver","307":"America/Denver","385":"America/Denver","406":"America/Denver",
  "435":"America/Denver","505":"America/Denver","575":"America/Denver","719":"America/Denver",
  "720":"America/Denver","801":"America/Denver","970":"America/Denver","208":"America/Denver",
  "480":"America/Phoenix","520":"America/Phoenix","602":"America/Phoenix","623":"America/Phoenix",
  "928":"America/Phoenix",
  // Pacific
  "206":"America/Los_Angeles","209":"America/Los_Angeles","213":"America/Los_Angeles","253":"America/Los_Angeles",
  "310":"America/Los_Angeles","323":"America/Los_Angeles","341":"America/Los_Angeles","360":"America/Los_Angeles",
  "408":"America/Los_Angeles","415":"America/Los_Angeles","424":"America/Los_Angeles","442":"America/Los_Angeles",
  "458":"America/Los_Angeles","503":"America/Los_Angeles","509":"America/Los_Angeles","510":"America/Los_Angeles",
  "530":"America/Los_Angeles","541":"America/Los_Angeles","559":"America/Los_Angeles","562":"America/Los_Angeles",
  "619":"America/Los_Angeles","626":"America/Los_Angeles","628":"America/Los_Angeles","650":"America/Los_Angeles",
  "657":"America/Los_Angeles","661":"America/Los_Angeles","669":"America/Los_Angeles","702":"America/Los_Angeles",
  "707":"America/Los_Angeles","714":"America/Los_Angeles","725":"America/Los_Angeles","747":"America/Los_Angeles",
  "760":"America/Los_Angeles","775":"America/Los_Angeles","805":"America/Los_Angeles","818":"America/Los_Angeles",
  "820":"America/Los_Angeles","831":"America/Los_Angeles","858":"America/Los_Angeles","909":"America/Los_Angeles",
  "916":"America/Los_Angeles","925":"America/Los_Angeles","935":"America/Los_Angeles","949":"America/Los_Angeles",
  "951":"America/Los_Angeles","971":"America/Los_Angeles",
  // Alaska + Hawaii
  "907":"America/Anchorage","808":"Pacific/Honolulu",
};

function extractAreaCode(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const m = phone.replace(/\D/g, "").match(/^1?(\d{3})/);
  return m?.[1] ?? null;
}

export function timezoneForPhone(phone: string | null | undefined): string {
  const ac = extractAreaCode(phone);
  return (ac && AREA_CODE_TZ[ac]) || "America/New_York";
}

// TCPA-compliant window: 08:00–21:00 local time. Returns true when it is safe
// to send to the given phone right now.
export function isWithinTcpaWindow(phone: string, now: Date = new Date()): boolean {
  const tz = timezoneForPhone(phone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  return h >= 8 && h < 21;
}

// Recipient-local hour (0-23) for scheduling decisions.
export function localHourForPhone(phone: string | null | undefined, now: Date = new Date()): number {
  const tz = timezoneForPhone(phone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "12");
}

// The 6pm rule: a NEW drop (first touch) may not START after 18:00 recipient
// local time, and never before the 09:00 morning floor. Follow-up drip touches
// for already-enrolled leads are NOT bound by this — they use the wider TCPA
// window in isWithinTcpaWindow.
export function canStartNewDrop(phone: string | null | undefined, now: Date = new Date()): boolean {
  const h = localHourForPhone(phone, now);
  return h >= 9 && h < 18;
}