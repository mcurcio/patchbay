import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionTitle } from "./SectionTitle";

describe("SectionTitle", () => {
  it("is a level 3 heading by default", () => {
    render(<SectionTitle>Connection</SectionTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "Connection" })).toHaveClass("pb-section-title-text");
  });

  it("takes the level it is given", () => {
    render(<SectionTitle level={2}>Service</SectionTitle>);
    expect(screen.getByRole("heading", { level: 2, name: "Service" })).toBeInTheDocument();
  });

  it("draws its actions after the heading, outside it", () => {
    render(<SectionTitle actions={<button type="button">Add</button>}>Ports</SectionTitle>);
    const heading = screen.getByRole("heading", { name: "Ports" });
    const button = screen.getByRole("button", { name: "Add" });
    expect(heading).not.toContainElement(button);
    expect(button.closest(".pb-section-title-actions")).not.toBeNull();
    expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no actions box without actions", () => {
    const { container } = render(<SectionTitle>Ports</SectionTitle>);
    expect(container.querySelector(".pb-section-title-actions")).toBeNull();
  });
});
