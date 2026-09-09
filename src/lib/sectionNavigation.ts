type ScrollTarget = Pick<Element, "scrollIntoView">;

type SectionDocument = {
  getElementById: (id: string) => ScrollTarget | null;
};

type HomeHistory = Pick<History, "state" | "replaceState">;
type HomeLocation = Pick<Location, "pathname" | "search" | "hash">;

export const scrollToSection = (
  sectionId: string,
  sectionDocument: SectionDocument = document,
): boolean => {
  const section = sectionDocument.getElementById(sectionId);
  if (!section) return false;

  section.scrollIntoView({ behavior: "smooth" });
  return true;
};

export const normalizeHomeUrl = (
  history: HomeHistory,
  location: HomeLocation,
): void => {
  const isCanonicalRoot =
    location.pathname === "/" && location.search === "" && location.hash === "";

  if (!isCanonicalRoot) {
    history.replaceState(history.state, "", "/");
  }
};
