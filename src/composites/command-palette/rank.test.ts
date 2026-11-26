import { describe, expect, it } from "vitest";
import { markRuns, matchSubsequence, rankCommands } from "./rank";

describe("matchSubsequence", () => {
  it("finds the letters in order, in any case, not necessarily together", () => {
    expect(matchSubsequence("Add a node", "adn")?.indices).toEqual([0, 1, 6]);
    expect(matchSubsequence("Add a node", "ADD")?.indices).toEqual([0, 1, 2]);
    expect(matchSubsequence("Add a node", "nda")).toBeUndefined();
    expect(matchSubsequence("Add", "Addition")).toBeUndefined();
  });

  it("ignores white space in the query, and an empty query matches with no letters", () => {
    expect(matchSubsequence("Add a node", "add no")?.indices).toEqual([0, 1, 2, 6, 7]);
    expect(matchSubsequence("Anything", "  ")).toEqual({ indices: [], score: 0 });
  });

  it("prefers the start of words and letters together over the first letters it meets", () => {
    // Greedy would take "s" of "Close" and "t" of "the"; the best match is the word "Settings".
    expect(matchSubsequence("Close the settings", "set")?.indices).toEqual([10, 11, 12]);
    // A capital after a small letter starts a word.
    expect(matchSubsequence("zoomToFit", "tf")?.indices).toEqual([4, 6]);
  });

  it("scores a word-start match above a scattered one, and an earlier one above a later one", () => {
    const score = (text: string, query: string) => matchSubsequence(text, query)?.score ?? -Infinity;
    expect(score("Fit view", "fit")).toBeGreaterThan(score("Fill the gaps", "fit"));
    expect(score("Save", "sa")).toBeGreaterThan(score("Quick save", "sa"));
  });

  it("keeps indices on the label when lowering a letter makes two", () => {
    expect(matchSubsequence("İx", "x")?.indices).toEqual([1]);
    expect(matchSubsequence("İx", "İx")?.indices).toEqual([0, 1]);
  });
});

describe("rankCommands", () => {
  const commands = [
    { id: "a", label: "Zoom in", group: "View" },
    { id: "b", label: "Save", group: "File" },
    { id: "c", label: "Fit view", group: "View" },
    { id: "d", label: "Save as", group: "File" },
  ];

  it("keeps every command in the order given, groups by first appearance, with an empty query", () => {
    const ranked = rankCommands(commands, "");
    expect(ranked.map((group) => group.group)).toEqual(["View", "File"]);
    expect(ranked[0]?.items.map((item) => item.command.id)).toEqual(["a", "c"]);
    expect(ranked[1]?.items.map((item) => item.command.id)).toEqual(["b", "d"]);
  });

  it("puts each group's best first and the groups by their best, dropping groups with no match", () => {
    const ranked = rankCommands(commands, "sa");
    expect(ranked.map((group) => group.group)).toEqual(["File"]);
    expect(ranked[0]?.items.map((item) => item.command.id)).toEqual(["b", "d"]);
    const view = rankCommands(commands, "vi");
    expect(view.map((group) => group.group)).toEqual(["View"]);
    expect(view[0]?.items.map((item) => item.command.id)).toEqual(["c"]);
  });

  it("orders groups by their best match", () => {
    const ranked = rankCommands(
      [
        { id: "x", label: "Fill the gaps", group: "Edit" },
        { id: "y", label: "Fit view", group: "View" },
      ],
      "fit",
    );
    expect(ranked.map((group) => group.group)).toEqual(["View", "Edit"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(rankCommands(commands, "qqq")).toEqual([]);
    expect(rankCommands([], "")).toEqual([]);
  });
});

describe("markRuns", () => {
  it("cuts the label into marked and unmarked runs", () => {
    expect(markRuns("Add a node", [0, 1, 6])).toEqual([
      { text: "Ad", marked: true },
      { text: "d a ", marked: false },
      { text: "n", marked: true },
      { text: "ode", marked: false },
    ]);
    expect(markRuns("Save", [])).toEqual([{ text: "Save", marked: false }]);
  });
});
