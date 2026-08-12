// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

Object.assign(globalThis, { React });

const ingestMutate = vi.fn();
const reviewMutate = vi.fn();
const emptyMutation = { mutate: vi.fn(), isPending: false };

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => <button type="button" disabled={disabled}>{children}</button>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

const overviewData = {
  profile: null,
  metrics: { highPriorityCount: 0, trackedApplications: 0, activeSources: 0 },
  schedule: { isEnabled: false, cronExpression: "0 30 3 * * *", highPriorityThreshold: 80, lastRunAt: null },
  jobs: [], applications: [], pendingApprovals: [], reports: [], runs: [], sources: [], recruiterContacts: [],
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ career: { overview: { invalidate: vi.fn() }, contacts: { emailEvents: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } } } }),
    career: {
      overview: { useQuery: () => ({ data: overviewData, isLoading: false, isError: false }) },
      profile: { save: { useMutation: () => emptyMutation }, uploadResume: { useMutation: () => emptyMutation } },
      schedule: { save: { useMutation: () => emptyMutation }, activate: { useMutation: () => emptyMutation }, pause: { useMutation: () => emptyMutation } },
      sources: { add: { useMutation: () => emptyMutation }, remove: { useMutation: () => emptyMutation } },
      applications: { update: { useMutation: () => emptyMutation }, draftCoverNote: { useMutation: () => emptyMutation } },
      contacts: {
        update: { useMutation: () => emptyMutation }, add: { useMutation: () => emptyMutation },
        emailEvents: { useQuery: () => ({ data: [{ id: 71, subject: "QA interview", sender: "recruiter@example.com", receivedAt: new Date("2026-08-12T09:00:00Z"), matchedContactId: null, reviewStatus: "unreviewed", snippet: null }], isLoading: false, isError: false, refetch: vi.fn() }) },
        ingestEmailEvents: { useMutation: () => ({ mutate: ingestMutate, isPending: false }) },
        reviewEmailEvent: { useMutation: () => ({ mutate: reviewMutate, isPending: false }) },
      },
      approvals: { request: { useMutation: () => emptyMutation }, decide: { useMutation: () => emptyMutation } },
    },
  },
}));

beforeEach(() => { ingestMutate.mockReset(); reviewMutate.mockReset(); });
afterEach(cleanup);

describe("Home manual recruiter-email importer", () => {
  it("submits normalized form data to contacts.ingestEmailEvents", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText(/Stable message ID/i), "  provider-message-81 ");
    await user.type(screen.getByLabelText(/Sender email/i), " recruiter@example.com ");
    await user.type(screen.getByLabelText(/^Subject/i), "  QA interview update ");
    await user.type(screen.getByLabelText(/Thread ID/i), " thread-17 ");
    await user.type(screen.getByLabelText(/Short snippet/i), "  Please choose an interview slot. ");
    await user.click(screen.getByRole("button", { name: /Import for review/i }));

    expect(ingestMutate).toHaveBeenCalledWith({ events: [expect.objectContaining({
      messageId: "provider-message-81", sender: "recruiter@example.com", subject: "QA interview update", threadId: "thread-17", snippet: "Please choose an interview slot.",
    })] });
  });

  it("renders unreviewed as disabled while reviewed and ignored are actionable choices", () => {
    render(<Home />);
    const unreviewed = screen.getByRole("button", { name: "unreviewed" });
    expect((unreviewed as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "reviewed" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "ignored" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
