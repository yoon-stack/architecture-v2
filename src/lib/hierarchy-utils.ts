import type { SystemNode } from "@/store/types";

/**
 * Build a map from child ID -> parent ID for the entire hierarchy.
 */
export function buildParentMap(
  nodes: SystemNode[],
  pid?: string
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const n of nodes) {
    if (pid) m[n.id] = pid;
    if (n.children)
      Object.assign(m, buildParentMap(n.children, n.id));
  }
  return m;
}

/**
 * Collect all descendant IDs under the node whose id === tid.
 */
export function getDescendantIds(nodes: SystemNode[], tid: string): string[] {
  const ids: string[] = [];
  (function f(l: SystemNode[]) {
    for (const n of l) {
      if (n.id === tid && n.children)
        (function c(ch: SystemNode[]) {
          for (const x of ch) {
            ids.push(x.id);
            if (x.children) c(x.children);
          }
        })(n.children);
      if (n.children) f(n.children);
    }
  })(nodes);
  return ids;
}

/**
 * Walk up the parent map to collect all ancestor IDs.
 */
export function getAncestorIds(
  id: string,
  pm: Record<string, string>
): string[] {
  const a: string[] = [];
  let c = pm[id];
  while (c) {
    a.push(c);
    c = pm[c];
  }
  return a;
}

/**
 * Recursively find a node by id in the hierarchy.
 */
export function findNode(
  nodes: SystemNode[],
  id: string
): SystemNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}
