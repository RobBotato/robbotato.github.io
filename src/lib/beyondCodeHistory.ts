export const BEYOND_CODE_HISTORY_KEY = "beyondCode";

type HistoryWriter = Pick<History, "state" | "pushState">;

export const isBeyondCodeHistoryState = (state: unknown): boolean =>
  Boolean(
    state &&
      typeof state === "object" &&
      (state as Record<string, unknown>)[BEYOND_CODE_HISTORY_KEY] === true,
  );

/** Add an in-site history step while keeping the canonical root URL. */
export const openBeyondCodeHistory = (history: HistoryWriter): void => {
  const currentState =
    history.state && typeof history.state === "object" ? history.state : {};

  history.pushState(
    { ...currentState, [BEYOND_CODE_HISTORY_KEY]: true },
    "",
    "/",
  );
};
