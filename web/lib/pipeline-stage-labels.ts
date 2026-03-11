const STAGE_NAME_TO_ENGLISH: Record<string, string> = {
  "Nouveau lead": "New Lead",
  Qualification: "Qualification",
  "Echantillon envoye": "Sample Sent",
  "Devis envoye": "Quote Sent",
  Negociation: "Negotiation",
  Gagne: "Won",
  Perdu: "Lost",
  "New Lead": "New Lead",
  "Sample Sent": "Sample Sent",
  "Quote Sent": "Quote Sent",
  Negotiation: "Negotiation",
  Won: "Won",
  Lost: "Lost",
};

const STAGE_PROBABILITY_BY_KEY: Record<string, number> = {
  new_lead: 5,
  qualification: 20,
  sample_sent: 30,
  quote_sent: 50,
  negotiation: 70,
  won: 100,
  lost: 0,
};

export function normalizeStageName(name: string) {
  return STAGE_NAME_TO_ENGLISH[name] ?? name;
}

export function normalizeStageRows<T extends { name: string }>(rows: T[]) {
  return rows.map((row) => ({ ...row, name: normalizeStageName(row.name) }));
}

export function stageNameToKey(name: string | null | undefined): string {
  const normalized = normalizeStageName(String(name ?? "")).trim().toLowerCase();
  if (normalized === "new lead") return "new_lead";
  if (normalized === "qualification") return "qualification";
  if (normalized === "sample sent") return "sample_sent";
  if (normalized === "quote sent") return "quote_sent";
  if (normalized === "negotiation") return "negotiation";
  if (normalized === "won") return "won";
  if (normalized === "lost") return "lost";
  return "unknown";
}

export function isNegotiationStageName(name: string | null | undefined): boolean {
  return stageNameToKey(name) === "negotiation";
}

export function isWonStageName(name: string | null | undefined): boolean {
  return stageNameToKey(name) === "won";
}

export function isLostStageName(name: string | null | undefined): boolean {
  return stageNameToKey(name) === "lost";
}

export function getLeadSuccessProbabilityByStageName(name: string | null | undefined): number {
  const key = stageNameToKey(name);
  return STAGE_PROBABILITY_BY_KEY[key] ?? 0;
}

export function getLeadSuccessProbability(params: {
  stageName?: string | null;
  status?: string | null;
}): number {
  const status = String(params.status ?? "").toLowerCase();
  if (status === "won") return 100;
  if (status === "lost") return 0;
  return getLeadSuccessProbabilityByStageName(params.stageName);
}
