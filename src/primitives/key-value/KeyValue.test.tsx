import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyValue } from "./KeyValue";
import css from "./KeyValue.css?raw";

describe("KeyValue", () => {
  it("draws each row as a term and its definition, in order", () => {
    const { container } = render(
      <KeyValue
        rows={[
          { key: "Interval", value: "30 s" },
          { key: "Batch", value: 256 },
        ]}
      />,
    );
    const list = container.querySelector("dl");
    expect(list).toHaveClass("pb-key-value");
    expect([...container.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["Interval", "Batch"]);
    expect([...container.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["30 s", "256"]);
    // Each pair is wrapped in a div, which a <dl> allows, so a row can carry its tone.
    for (const row of container.querySelectorAll("dl > div")) {
      expect(row.children[0]?.tagName).toBe("DT");
      expect(row.children[1]?.tagName).toBe("DD");
    }
  });

  it("takes any content as a value", () => {
    render(<KeyValue rows={[{ key: "Node", value: <a href="#node">ingest</a> }]} />);
    expect(screen.getByRole("link", { name: "ingest" })).toBeInTheDocument();
  });

  it("puts a row's tone on the row and its title on the key", () => {
    const { container } = render(
      <KeyValue
        rows={[
          { key: "Synced", value: "no", tone: "err", title: "Needs an access token" },
          { key: "Seen", value: "yes" },
          { key: "Odd", value: "?", tone: "unheard-of" },
        ]}
      />,
    );
    const rows = container.querySelectorAll(".pb-key-value-row");
    expect(rows[0]).toHaveAttribute("data-tone", "err");
    expect(rows[1]).not.toHaveAttribute("data-tone");
    expect(rows[2]).toHaveAttribute("data-tone", "unheard-of");
    expect(screen.getByText("Synced")).toHaveAttribute("title", "Needs an access token");
  });

  it("keeps two rows with the same key", () => {
    const { container } = render(
      <KeyValue
        rows={[
          { key: "Port", value: "left" },
          { key: "Port", value: "right" },
        ]}
      />,
    );
    expect(container.querySelectorAll("dd")).toHaveLength(2);
  });

  it("is named by its label", () => {
    render(<KeyValue label="Service" rows={[{ key: "Interval", value: "30 s" }]} />);
    expect(within(screen.getByLabelText("Service")).getByText("30 s")).toBeInTheDocument();
  });

  it("draws an empty list for no rows", () => {
    const { container } = render(<KeyValue rows={[]} />);
    expect(container.querySelector("dl")?.children).toHaveLength(0);
  });

  it("leaves a value plain for a tone it does not know: its stylesheet styles only the ones it does", () => {
    render(<KeyValue rows={[{ key: "Odd", value: "?", tone: "unheard-of" }]} />);
    expect(screen.getByText("?").parentElement).toHaveAttribute("data-tone", "unheard-of");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["accent", "err", "muted", "off", "ok", "quiet", "warn"]);
  });
});
