// The command palette's ranking (docs/components.md#commands-and-keys): a query matches a label when its letters appear
// in the label in order, in any case, not necessarily together ("adn" matches "Add a node"). Of the ways the letters
// can be found, the best is kept: letters at the start of a word and letters next to each other score more, gaps and
// a late start score less. Pure, so the palette and an app's tests share it.

/** Where a query's letters fell in a label, and how good the match is. */
export type SubsequenceMatch = {
  /** The indices (UTF-16 code units) of the label's matched characters, ascending. */
  indices: number[];
  /** Higher is better; an empty query scores 0. */
  score: number;
};

/** A word starts at the label's start, after a character that is not a letter or digit, or at a capital after a small letter. */
function wordStart(text: string, at: number): boolean {
  if (at === 0) return true;
  const before = text.charAt(at - 1);
  const here = text.charAt(at);
  if (!/[\p{L}\p{N}]/u.test(before)) return true;
  return before !== before.toUpperCase() && here !== here.toLowerCase() && here === here.toUpperCase();
}

/** A code unit in lower case, unless lowering it makes more than one ("İ"), which is then compared as it is. */
function fold(unit: string): string {
  const lower = unit.toLowerCase();
  return lower.length === 1 ? lower : unit;
}

const startBonus = 3;
const wordBonus = 2;
const nextBonus = 2;
const gapCost = 0.1;
const gapCostMost = 1;
const lateCost = 0.02;

/**
 * Finds the query's letters in the text, in order and in any case (white space in the query is ignored), the best
 * way it can; undefined when they are not all there.
 */
export function matchSubsequence(text: string, query: string): SubsequenceMatch | undefined {
  const squeezed = query.replace(/\s+/g, "");
  if (squeezed === "") return { indices: [], score: 0 };
  // Compared one UTF-16 code unit at a time, each folded the same way, so an index is a place in the label.
  const wanted = Array.from({ length: squeezed.length }, (_, at) => fold(squeezed.charAt(at)));
  const lower = Array.from({ length: text.length }, (_, at) => fold(text.charAt(at)));
  const n = text.length;
  const m = wanted.length;
  if (m > n) return undefined;
  const bonus = lower.map((_, at) => (at === 0 ? startBonus : wordStart(text, at) ? wordBonus : 0));
  // best[j][i]: the best score with the query's letter j at the text's index i; from[j][i]: where letter j-1 was.
  const best: number[][] = [];
  const from: number[][] = [];
  for (let j = 0; j < m; j += 1) {
    const row = new Array<number>(n).fill(-Infinity);
    const back = new Array<number>(n).fill(-1);
    const letter = wanted[j];
    for (let i = j; i < n; i += 1) {
      if (lower[i] !== letter) continue;
      const own = 1 + (bonus[i] ?? 0);
      if (j === 0) {
        row[i] = own - i * lateCost;
        continue;
      }
      const previous = best[j - 1] ?? [];
      for (let k = j - 1; k < i; k += 1) {
        const before = previous[k] ?? -Infinity;
        if (before === -Infinity) continue;
        const joined = k === i - 1 ? nextBonus : -Math.min((i - k - 1) * gapCost, gapCostMost);
        const score = before + own + joined;
        if (score > (row[i] ?? -Infinity)) {
          row[i] = score;
          back[i] = k;
        }
      }
    }
    best.push(row);
    from.push(back);
  }
  const last = best[m - 1] ?? [];
  let end = -1;
  for (let i = 0; i < n; i += 1) if ((last[i] ?? -Infinity) > (end < 0 ? -Infinity : (last[end] ?? -Infinity))) end = i;
  if (end < 0 || last[end] === -Infinity) return undefined;
  const indices: number[] = [];
  for (let j = m - 1, at = end; j >= 0; j -= 1) {
    indices.unshift(at);
    at = from[j]?.[at] ?? -1;
  }
  return { indices, score: last[end] ?? 0 };
}

/** What ranking needs of a command. */
export type Rankable = { label: string; group: string };

/** A command that matched, with where its letters fell. */
export type RankedCommand<C extends Rankable> = { command: C; indices: number[]; score: number };

/** One group's matching commands. */
export type RankedGroup<C extends Rankable> = { group: string; items: RankedCommand<C>[] };

/**
 * The commands whose labels match the query, in groups. With an empty query every command is kept, in the order given
 * and its groups in the order they first appear; with one, each group's commands go best first and the groups by
 * their best command, ties kept in the order given. Groups with no match are left out.
 */
export function rankCommands<C extends Rankable>(commands: readonly C[], query: string): RankedGroup<C>[] {
  const groups = new Map<string, { first: number; items: (RankedCommand<C> & { order: number })[] }>();
  commands.forEach((command, order) => {
    const match = matchSubsequence(command.label, query);
    if (match === undefined) return;
    let group = groups.get(command.group);
    if (group === undefined) {
      group = { first: order, items: [] };
      groups.set(command.group, group);
    }
    group.items.push({ command, indices: match.indices, score: match.score, order });
  });
  const byScore = (a: { score: number; order: number }, b: { score: number; order: number }) =>
    b.score - a.score || a.order - b.order;
  return [...groups.entries()]
    .map(([group, { first, items }]) => {
      const sorted = [...items].sort(byScore);
      return { group, first, items: sorted, top: sorted[0]?.score ?? 0 };
    })
    .sort((a, b) => b.top - a.top || a.first - b.first)
    .map(({ group, items }) => ({
      group,
      items: items.map(({ command, indices, score }) => ({ command, indices, score })),
    }));
}

/** The label cut into runs, each marked or not, so the matched letters can be drawn in <mark>. */
export function markRuns(label: string, indices: readonly number[]): { text: string; marked: boolean }[] {
  const marked = new Set(indices);
  const runs: { text: string; marked: boolean }[] = [];
  for (let at = 0; at < label.length; at += 1) {
    const isMarked = marked.has(at);
    const last = runs[runs.length - 1];
    if (last !== undefined && last.marked === isMarked) last.text += label.charAt(at);
    else runs.push({ text: label.charAt(at), marked: isMarked });
  }
  return runs;
}
