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

export function normalizeStageName(name: string) {
  return STAGE_NAME_TO_ENGLISH[name] ?? name;
}

export function normalizeStageRows<T extends { name: string }>(rows: T[]) {
  return rows.map((row) => ({ ...row, name: normalizeStageName(row.name) }));
}

