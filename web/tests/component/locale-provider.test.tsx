/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider, useLocale } from "@/components/locale-provider";

function Probe() {
  const { locale, isRtl, setLocale } = useLocale();
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="rtl">{String(isRtl)}</p>
      <button type="button" onClick={() => setLocale("fa")}>
        Set FA
      </button>
    </div>
  );
}

describe("LocaleProvider", () => {
  it("updates html direction and persists selected locale", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();

    render(
      <LocaleProvider initialLocale="en">
        <Probe />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(document.documentElement.dir).toBe("ltr");

    await user.click(screen.getByRole("button", { name: "Set FA" }));
    expect(screen.getByTestId("locale")).toHaveTextContent("fa");
    expect(screen.getByTestId("rtl")).toHaveTextContent("true");
    expect(document.documentElement.dir).toBe("rtl");
    expect(window.localStorage.getItem("crm_locale")).toBe("fa");
    expect(document.cookie).toContain("crm_locale=fa");
  });
});
