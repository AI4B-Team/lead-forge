// ---------------------------------------------------------------------------
// Adapter failure taxonomy.
//
// The distinction that matters: "the source told us there is nothing today"
// versus "we could not read the source". A silent zero-row day is
// indistinguishable from a quiet market, so any adapter that receives a
// healthy HTTP response and parses zero rows MUST throw AdapterStructureError
// rather than resolve with an empty array.
// ---------------------------------------------------------------------------

export class AdapterStructureError extends Error {
  readonly code = "adapter_structure";
  readonly url: string;
  readonly httpStatus: number | null;
  readonly bytes: number | null;
  readonly detail: string | undefined;

  constructor(args: {
    message: string;
    url: string;
    httpStatus?: number | null;
    bytes?: number | null;
    detail?: string;
  }) {
    super(args.message);
    this.name = "AdapterStructureError";
    this.url = args.url;
    this.httpStatus = args.httpStatus ?? null;
    this.bytes = args.bytes ?? null;
    this.detail = args.detail;
  }
}

/** Source responded normally and explicitly said "no items scheduled". */
export class AdapterEmptyDayError extends Error {
  readonly code = "adapter_empty_day";
  constructor(public readonly url: string) {
    super(`Source reported no scheduled items for ${url}`);
    this.name = "AdapterEmptyDayError";
  }
}

export function isStructureError(e: unknown): e is AdapterStructureError {
  return e instanceof AdapterStructureError;
}