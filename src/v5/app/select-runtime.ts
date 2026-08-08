export type RuntimeTarget = "v4" | "v5";

export function selectRuntime(search: string): RuntimeTarget {
  return new URLSearchParams(search).get("v5") === "1" ? "v5" : "v4";
}
