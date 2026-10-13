export type ModeFitPolicy = "live" | "shadow";

function stableBucket(identity: string) {
  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000;
}

export function modeFitPolicyForIdentity(identity: string, shadowPercent: number): ModeFitPolicy {
  const boundedPercent = Math.min(100, Math.max(0, Number.isFinite(shadowPercent) ? shadowPercent : 0));
  return stableBucket(identity) < Math.round(boundedPercent * 100) ? "shadow" : "live";
}

