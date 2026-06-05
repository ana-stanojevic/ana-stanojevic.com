import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders core sections and skip link landmarks", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ana stanojević/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /say hello/i })).toBeInTheDocument();
  });
});
