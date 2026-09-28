export type ExperimentVariant = "control" | "focused";

const EXPERIMENT_PREFIX = "aletheia_experiment:";

export function experimentStorageKey(experiment: string) {
  return `${EXPERIMENT_PREFIX}${experiment}`;
}

export function assignExperimentVariant(
  storage: Pick<Storage, "getItem" | "setItem">,
  experiment: string,
  randomValue = Math.random()
): ExperimentVariant {
  const key = experimentStorageKey(experiment);
  const existing = storage.getItem(key);
  if (existing === "control" || existing === "focused") {
    return existing;
  }
  const assigned: ExperimentVariant = randomValue < 0.5 ? "control" : "focused";
  storage.setItem(key, assigned);
  return assigned;
}

export function readExperimentVariant(storage: Pick<Storage, "getItem">, experiment: string): ExperimentVariant | null {
  const value = storage.getItem(experimentStorageKey(experiment));
  return value === "control" || value === "focused" ? value : null;
}
