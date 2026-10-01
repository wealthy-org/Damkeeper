export const LABEL_MAX = 60;

/** Normalises a user-typed label; returns null if nothing usable is left. */
export function cleanLabel(input: string) {
  const s = input.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, LABEL_MAX) : null;
}

/** The exact text the creator signs. Built identically in the browser and on the server. */
export function labelMessage(chainId: number, manager: string, positionId: string, label: string) {
  return [
    "Damkeeper position label",
    `Chain: ${chainId}`,
    `Manager: ${manager.toLowerCase()}`,
    `Position: ${positionId}`,
    `Label: ${label}`,
    "",
    "This label is stored offchain and is not part of the onchain terms.",
  ].join("\n");
}
