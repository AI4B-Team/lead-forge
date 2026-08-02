// City fields from some sources already carry the state ("Hillsborough, FL"),
// which used to render as "Hillsborough, FL, FL". Normalize everything to a
// single "City, ST" string.
export function formatLocation(
  city?: string | null,
  state?: string | null,
  address?: string | null,
): string {
  const st = (state ?? "").trim();
  const rawCity = (city ?? "").trim();
  const parts = rawCity
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let cityName = parts[0] ?? "";
  let stateName = st;
  // If the city string trails with a state, prefer it and drop the duplicate.
  const trailing = parts.length > 1 ? parts[parts.length - 1]! : "";
  if (trailing && (!stateName || trailing.toUpperCase() === stateName.toUpperCase())) {
    stateName = trailing;
  }
  if (parts.length > 1 && trailing.toUpperCase() === stateName.toUpperCase()) {
    cityName = parts.slice(0, -1).join(", ");
  }

  const out = [address?.trim() || null, cityName || null, stateName || null].filter(Boolean);
  return out.join(", ");
}
