import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact from "../components/Contact";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("Contact", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders tabs, controls, and accessible form labels", () => {
    render(<Contact />);

    expect(screen.getByRole("region", { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /contact topic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /work together/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /hiring/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /other/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByTitle(/your message/i)).toBeInTheDocument();
  });

  it("switches topic and updates placeholder hint", async () => {
    const user = userEvent.setup();
    render(<Contact />);

    await user.click(screen.getByRole("button", { name: /hiring/i }));
    expect(screen.getByPlaceholderText(/senior ml systems role/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /other/i }));
    expect(screen.getByPlaceholderText(/question about a post/i)).toBeInTheDocument();
  });

  it("blocks empty message submit and enables next for valid input", async () => {
    const user = userEvent.setup();
    render(<Contact />);

    const next = screen.getByRole("button", { name: /next/i });
    const input = screen.getByTitle(/your message/i);
    expect(next).toBeDisabled();

    await user.type(input, "   ");
    expect(next).toBeDisabled();

    await user.clear(input);
    await user.type(input, "I am interested in a collaboration.");
    expect(next).toBeEnabled();
  });

  it("shows loading state while preview request is in flight", async () => {
    const user = userEvent.setup();
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));

    render(<Contact />);

    await user.type(screen.getByTitle(/your message/i), "I am exploring collaboration around CV systems.");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
    expect(screen.getByText(/first message can take a bit longer/i)).toBeInTheDocument();

    pending.resolve(
      new Response(JSON.stringify({ body: "Hi Ana,\n\nI’m exploring collaboration.\n\nBest," }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("shows a user-friendly error when preview API returns 500", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("internal error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        })
      )
    );

    render(<Contact />);

    const message = "I am exploring a collaboration around production AI systems.";
    await user.type(screen.getByTitle(/your message/i), message);
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/preview failed\. please try again\./i)).toBeInTheDocument();
    });
    expect(screen.getByTitle(/your message/i)).toHaveValue(message);
  });

  it("completes preview flow and validates send button by email format", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ body: "Hi Ana,\n\nI’m working on a production AI workflow.\n\nBest," }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    render(<Contact />);

    await user.type(screen.getByTitle(/your message/i), "I’m working on a production AI workflow.");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/editable email preview/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const send = screen.getByRole("button", { name: /^send$/i });
    expect(send).toBeDisabled();

    await user.type(emailInput, "invalid");
    expect(send).toBeDisabled();

    await user.clear(emailInput);
    await user.type(emailInput, "ana.tester@example.com");
    expect(send).toBeEnabled();
  });
});
