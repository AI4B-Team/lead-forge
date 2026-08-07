// Provider-agnostic SMS interface. Every carrier implementation (Telnyx now,
// Twilio later) satisfies this contract; the rest of the app never touches a
// concrete provider directly — only through `getProvider()`.

export interface SmsSendResult {
  providerSid: string;
  status: string;
}

export interface InboundMessage {
  from: string;
  to: string;
  body: string;
  providerSid: string;
  receivedAt: string;
}

export interface Dlr {
  providerSid: string;
  status: "delivered" | "failed" | "sent" | "queued";
  errorCode?: string;
  /** Destination carrier, when the provider reports it. Drives per-carrier rates. */
  carrier?: string | null;
}

export interface BoughtNumber {
  phone: string;
  providerSid: string;
}

export interface AvailableNumber {
  phone: string;
  areaCode: string;
  region?: string;
}

export interface BrandSubmission {
  legalName: string;
  ein: string;
  website: string;
  contactEmail: string;
}

export interface CampaignSubmission {
  brandProviderId: string;
  useCase: string;
  sampleMessages: string[];
  optInFlow: string;
}

export interface SmsProvider {
  readonly name: string;
  buyNumber(areaCode: string): Promise<BoughtNumber>;
  searchAvailable?(areaCode: string, limit?: number): Promise<AvailableNumber[]>;
  buySpecific?(phone: string): Promise<BoughtNumber>;
  submitBrand?(brand: BrandSubmission): Promise<{ providerId: string; status: string }>;
  submitCampaign?(campaign: CampaignSubmission): Promise<{ providerId: string; status: string }>;
  /** Poll current 10DLC brand vetting status by provider brand id. */
  fetchBrandStatus?(providerId: string): Promise<{ status: string; detail?: string | null }>;
  /** Poll current 10DLC campaign status by provider campaign id. */
  fetchCampaignStatus?(providerId: string): Promise<{ status: string; detail?: string | null }>;
  releaseNumber(providerSid: string): Promise<void>;
  send(from: string, to: string, body: string): Promise<SmsSendResult>;
  parseInbound(req: Request): Promise<InboundMessage>;
  parseDlr(req: Request): Promise<Dlr>;
  verifyWebhook(req: Request, rawBody: string): Promise<boolean>;
}