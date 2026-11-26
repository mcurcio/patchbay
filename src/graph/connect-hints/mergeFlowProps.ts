// Joins the props several hooks give <ReactFlow> (docs/graph.md#mergeflowprops), so each hook's handler still runs
// when two of them, or the app, handle the same event.

type UnionToIntersection<U> = (U extends unknown ? (each: U) => void : never) extends (each: infer I) => void
  ? I
  : never;

/** The objects' props together: each handler is every object's handler for that name. */
export type MergedFlowProps<T extends readonly (object | undefined)[]> = UnionToIntersection<
  Exclude<T[number], undefined>
>;

type Handler = (...args: unknown[]) => unknown;

/**
 * One object of `<ReactFlow>` props from several: a handler given by more than one object calls each in order, and
 * `isValidConnection` accepts only when each accepts (it stops at the first that refuses). Any other prop is the last
 * object's that gives it; `undefined` gives nothing.
 */
export function mergeFlowProps<const T extends readonly (object | undefined)[]>(...objects: T): MergedFlowProps<T> {
  const values = new Map<string, unknown>();
  const handlers = new Map<string, Handler[]>();
  for (const object of objects) {
    if (object === undefined) continue;
    for (const [name, value] of Object.entries(object)) {
      if (value === undefined) continue;
      if (typeof value === "function") {
        const list = handlers.get(name) ?? [];
        list.push(value as Handler);
        handlers.set(name, list);
        values.delete(name);
      } else {
        values.set(name, value);
        handlers.delete(name);
      }
    }
  }
  const merged: Record<string, unknown> = Object.fromEntries(values);
  for (const [name, list] of handlers) {
    const [only] = list;
    if (list.length === 1 && only !== undefined) merged[name] = only;
    else if (name === "isValidConnection")
      merged[name] = (...args: unknown[]) => list.every((each) => each(...args) === true);
    else
      merged[name] = (...args: unknown[]) => {
        for (const each of list) each(...args);
      };
  }
  return merged as MergedFlowProps<T>;
}
