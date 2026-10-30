export type VaultComp = { grade: string; price: number; method: string; source: string; asOf: string };

/** Newest comp wins; on the same date the chosen value ("value_used") wins. */
export const byRecency = (a: VaultComp, b: VaultComp) =>
  b.asOf.localeCompare(a.asOf) || Number(b.method === "value_used") - Number(a.method === "value_used");

/**
 * Card-comps Vault rule: a card's value at a grade = newest CardComp for that grade, same-date ties to value_used.
 * Owner values (method value_used, source owner_set / ratio_to_base) count. Comps only: never band/multiple estimates.
 * Used for the Vault "Value now" and (C5) the Vault max-bid inputs.
 */
export const vaultComp = <T extends VaultComp>(comps: T[], grade: string): T | undefined =>
  comps.filter((c) => c.grade === grade).sort(byRecency)[0];

/** C5: Vault max-bid inputs follow the Vault value at each grade. */
export const maxBidInputs = (comps: VaultComp[]) => ({
  raw: vaultComp(comps, "raw")?.price ?? null,
  psa9: vaultComp(comps, "PSA 9")?.price ?? null,
  psa10: vaultComp(comps, "PSA 10")?.price ?? null,
});
