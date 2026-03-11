import { describe, expect, it } from "vitest";
import {
  getLeadSuccessProbability,
  getLeadSuccessProbabilityByStageName,
  isLostStageName,
  isNegotiationStageName,
  isWonStageName,
  normalizeStageName,
  stageNameToKey,
} from "@/lib/pipeline-stage-labels";

describe("pipeline stage helpers", () => {
  it("normalizes french stage names", () => {
    expect(normalizeStageName("Nouveau lead")).toBe("New Lead");
    expect(normalizeStageName("Negociation")).toBe("Negotiation");
    expect(normalizeStageName("Gagne")).toBe("Won");
    expect(normalizeStageName("Perdu")).toBe("Lost");
  });

  it("maps stage names to canonical keys", () => {
    expect(stageNameToKey("New Lead")).toBe("new_lead");
    expect(stageNameToKey("Qualification")).toBe("qualification");
    expect(stageNameToKey("Sample Sent")).toBe("sample_sent");
    expect(stageNameToKey("Quote Sent")).toBe("quote_sent");
    expect(stageNameToKey("Negotiation")).toBe("negotiation");
    expect(stageNameToKey("Won")).toBe("won");
    expect(stageNameToKey("Lost")).toBe("lost");
  });

  it("returns success probability by stage", () => {
    expect(getLeadSuccessProbabilityByStageName("New Lead")).toBe(5);
    expect(getLeadSuccessProbabilityByStageName("Qualification")).toBe(20);
    expect(getLeadSuccessProbabilityByStageName("Sample Sent")).toBe(30);
    expect(getLeadSuccessProbabilityByStageName("Quote Sent")).toBe(50);
    expect(getLeadSuccessProbabilityByStageName("Negotiation")).toBe(70);
    expect(getLeadSuccessProbabilityByStageName("Won")).toBe(100);
    expect(getLeadSuccessProbabilityByStageName("Lost")).toBe(0);
  });

  it("prioritizes closed status over stage label", () => {
    expect(getLeadSuccessProbability({ stageName: "Negotiation", status: "won" })).toBe(100);
    expect(getLeadSuccessProbability({ stageName: "Negotiation", status: "lost" })).toBe(0);
    expect(getLeadSuccessProbability({ stageName: "Negotiation", status: "open" })).toBe(70);
  });

  it("detects negotiation, won, and lost stages", () => {
    expect(isNegotiationStageName("Negociation")).toBe(true);
    expect(isNegotiationStageName("Qualification")).toBe(false);
    expect(isWonStageName("Gagne")).toBe(true);
    expect(isLostStageName("Perdu")).toBe(true);
  });
});
