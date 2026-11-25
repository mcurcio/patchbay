// The unit project's setup: jest-dom's matchers (toBeInTheDocument, toHaveAttribute, …), and an
// unmounted tree after every test.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
