import { describe, expect, it } from "vitest";
import { isRtlLocale, normalizeLocale, roleLabel, t } from "@/lib/i18n";

describe("i18n helpers", () => {
  it("normalizes locale with sane defaults", () => {
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale("fr-FR")).toBe("fr");
    expect(normalizeLocale("fa-IR")).toBe("fa");
    expect(normalizeLocale("ar")).toBe("fa");
    expect(normalizeLocale("de-DE")).toBe("en");
  });

  it("returns rtl only for Persian locale", () => {
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("fr")).toBe(false);
    expect(isRtlLocale("fa")).toBe(true);
  });

  it("falls back to key when translation does not exist", () => {
    expect(t("en", "Custom key")).toBe("Custom key");
    expect(t("fr", "Custom key")).toBe("Custom key");
  });

  it("injects template variables", () => {
    expect(t("en", "Signed in as {name}", { name: "Sepehr" })).toBe("Signed in as Sepehr");
    expect(t("fr", "Signed in as {name}", { name: "Sepehr" })).toContain("Sepehr");
  });

  it("maps role labels by locale", () => {
    expect(roleLabel("admin", "en")).toBe("Admin");
    expect(roleLabel("manager", "fr")).toBe("Manager");
    expect(roleLabel("commercial", "en")).toBe("Commercial");
    expect(roleLabel("standard_user", "en")).toBe("User");
  });
});
