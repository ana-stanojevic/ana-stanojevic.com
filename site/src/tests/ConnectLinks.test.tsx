import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConnectLinks from "../pages/ConnectLinks";

describe("ConnectLinks", () => {
  it("renders name and profile links", () => {
    render(<ConnectLinks />);

    expect(screen.getByRole("heading", { name: /ana stanojević/i })).toBeInTheDocument();
    expect(screen.getByText(/ai engineer \| phd epfl \| ai systems/i)).toBeInTheDocument();
    expect(screen.getByText(/let's stay in touch\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/ana-stanojevic1/"
    );
    expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
      "href",
      "https://github.com/ana-stanojevic"
    );
    expect(screen.getByRole("link", { name: /^email$/i })).toHaveAttribute(
      "href",
      "mailto:contact@ana-stanojevic.com?subject=Reaching%20out%20via%20your%20site"
    );
    expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute("href", "/");
  });
});
