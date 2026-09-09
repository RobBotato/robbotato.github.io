/** Elements that own their pointer interaction instead of the background net. */
export const INTERACTIVE_TARGET_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[data-neural-net-ignore]",
].join(",");

type ClosestCapableTarget = {
  closest?: (selector: string) => unknown;
};

/**
 * The neural network listens on `window`, so it must yield when the pointer
 * originated inside a foreground control. This keeps the background draggable
 * without stealing clicks from links, buttons, or form elements.
 */
export const shouldHandleNeuralPointer = (target: unknown): boolean => {
  if (!target || typeof target !== "object") return true;

  const closest = (target as ClosestCapableTarget).closest;
  if (typeof closest !== "function") return true;

  return !closest.call(target, INTERACTIVE_TARGET_SELECTOR);
};
