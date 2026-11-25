import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyValue } from "./KeyValue";
import css from "./KeyValue.css?raw";

describe("KeyValue", () => {
  it("draws each row as a term and its definition, in order", () => {
    const { container } = render(
      <KeyValue
        rows={[
          { key: "Rate", value: "48 kHz" },
          { key: "Block", value: 256 },
        ]}
      />,
    );
    const list = container.querySelector("dl");
    expect(list).toHaveClass("pb-key-value");
    expect([...container.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["Rate", "Block"]);
    expect([...container.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["48 kHz", "256"]);
    // Each pair is wrapped in a div, which a <dl> allows, so a row can carry its tone.
    for (const row of container.querySelectorAll("dl > div")) {
      expect(row.children[0]?.tagName).toBe("DT");
      expect(row.children[1]?.tagName).toBe("DD");
    }
  });

  it("takes any content as a value", () => {
    render(<KeyValue rows={[{ key: "Node", value: <a href="#node">white</a> }]} />);
    expect(screen.getByRole("link", { name: "white" })).toBeInTheDocument();
  });

  it("puts a row's tone on the row and its title on the key", () => {
    const { container } = render(
      <KeyValue
        rows={[
          { key: "Realtime", value: "no", tone: "err", title: "Needs CAP_SYS_NICE" },
          { key: "Seen", value: "yes" },
          { key: "Odd", value: "?", tone: "unheard-of" },
        ]}
      />,
    );
    const rows = container.querySelectorAll(".pb-key-value-row");
    expect(rows[0]).toHaveAttribute("data-tone", "err");
    expect(rows[1]).not.toHaveAttribute("data-tone");
    expect(rows[2]).toHaveAttribute("data-tone", "unheard-of");
    expect(screen.getByText("Realtime")).toHaveAttribute("title", "Needs CAP_SYS_NICE");
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
    render(<KeyValue label="Engine" rows={[{ key: "Rate", value: "48 kHz" }]} />);
    expect(within(screen.getByLabelText("Engine")).getByText("48 kHz")).toBeInTheDocument();
  });

  it("draws an empty list for no rows", () => {
    const { container } = render(<KeyValue rows={[]} />);
    expect(container.querySelector("dl")?.children).toHaveLength(0);
  });

  it("leaves a value plain for a tone it does not know: its stylesheet styles only the ones it does", () => {
    render(<KeyValue rows={[{ key: "Odd", value: "?", tone: "unheard-of" }]} />);
    expect(screen.getByText("?").parentElement).toHaveAttribute("data-tone", "unheard-of");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["err", "off", "ok", "quiet", "warn"]);
  });
});
