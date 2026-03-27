export function shouldAutoCompleteOpeningFromPaidMarks(kind: "THUONG" | "GOP") {
  return kind !== "GOP";
}
