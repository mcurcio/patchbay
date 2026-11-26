import { waitFor } from "storybook/test";

/**
 * Waits for a node's handle and for React Flow to have measured that node, then returns the handle. A handle is in
 * the page from the node's first render, but React Flow starts a wire only from a handle whose bounds it has stored,
 * which it does when it measures the node (and shows it: an unmeasured node is drawn with `visibility: hidden`). A
 * press before then starts nothing, so a story that drags from a handle waits for both.
 */
export const measuredHandle = (root: HTMLElement, nodeId: string, handleId: string) =>
  waitFor(() => {
    const node = root.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
    if (node === null || node.style.visibility !== "visible") throw new Error(`node ${nodeId} not measured yet`);
    const found = node.querySelector<HTMLElement>(`[data-nodeid="${nodeId}"][data-handleid="${handleId}"]`);
    if (found === null) throw new Error(`no handle ${nodeId}/${handleId} yet`);
    return found;
  });
