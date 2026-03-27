import { describe, expect, it } from "vitest";

import { shouldAutoCompleteOpeningFromPaidMarks } from "./theo-doi-opening-policy";

describe("shouldAutoCompleteOpeningFromPaidMarks", () => {
  it("keeps auto-complete for regular lines", () => {
    expect(shouldAutoCompleteOpeningFromPaidMarks("THUONG")).toBe(true);
  });

  it("disables auto-complete for GOP lines", () => {
    expect(shouldAutoCompleteOpeningFromPaidMarks("GOP")).toBe(false);
  });
});
