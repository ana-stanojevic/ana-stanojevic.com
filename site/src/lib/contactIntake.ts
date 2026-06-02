import { useCallback, useEffect, useRef, useState } from "react";
import { INTAKE_API_BASE, isContactTab, isLocalIntakeApi, PLACEHOLDERS } from "../config";
import type {
  ContactTab,
  PreviewEmailResponse,
  ProgressState,
  SendEmailResponse,
  SentState,
  StatusState,
} from "../config";

/** Match intake-api PreviewRequest / SendEmailRequest field limits. */
const MAX_INITIAL_MESSAGE_CHARS = 200;
const MAX_EMAIL_PREVIEW_CHARS = 500;

function isConnectionError(errText: string): boolean {
  return /failed to fetch|networkerror|load failed|cors/i.test(errText);
}

/** Shown on first preview while Render free tier cold-starts (~50s); rotate every 10s. */
const SERVER_WAKE_MESSAGES = [
  "Waking up the server…",
  "Still starting up — the API sleeps when idle on the free tier.",
  "Thanks for waiting — first request after idle can take up to a minute.",
  "Almost there…",
  "Connecting — drafting your email as soon as the server is ready.",
] as const;

const WAKE_MESSAGE_INTERVAL_MS = 10_000;

function previewLoadingState(isFirst: boolean): { text: string; showFirstNote: boolean } {
  if (isLocalIntakeApi()) {
    return { text: "Drafting your email…", showFirstNote: false };
  }
  if (isFirst) {
    return { text: SERVER_WAKE_MESSAGES[0], showFirstNote: true };
  }
  return { text: "Drafting your email…", showFirstNote: false };
}

const EMPTY_PROGRESS: ProgressState = {
  visible: false,
  kind: "",
  text: "",
  showFirstNote: false,
};

const EMPTY_STATUS: StatusState = { text: "", kind: "" };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Parse `API <status>: <json|text>` from postJson failures (e.g. intake-api 429). */
function friendlyApiError(errText: string): string | null {
  const match = errText.match(/^API (\d+):\s*(.+)$/s);
  if (!match) return null;
  const body = match[2].trim();
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
  } catch {
    // plain text body
  }
  return null;
}

/** POST without a client timeout — wait until the server responds or the browser fails. */
async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${INTAKE_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text || "unknown error"}`);
  } 
  return (await response.json()) as T;
}

export function useContactIntake() {
  const [tab, setTab] = useState<ContactTab>("work_together");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [status, setStatus] = useState<StatusState>(EMPTY_STATUS);
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);
  const [deliveryWarning, setDeliveryWarning] = useState("");
  const [sent, setSent] = useState<SentState | null>(null);

  const initialMessageRef = useRef("");
  const hasCompletedFirstPreview = useRef(false);
  const previewAbortedRef = useRef(false);
  const wakeMessageIndexRef = useRef(0);
  const wakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearWakeMessageRotation = useCallback(() => {
    if (wakeIntervalRef.current !== null) {
      clearInterval(wakeIntervalRef.current);
      wakeIntervalRef.current = null;
    }
  }, []);

  const startWakeMessageRotation = useCallback(() => {
    clearWakeMessageRotation();
    if (isLocalIntakeApi()) return;
    wakeMessageIndexRef.current = 0;
    wakeIntervalRef.current = setInterval(() => {
      wakeMessageIndexRef.current =
        (wakeMessageIndexRef.current + 1) % SERVER_WAKE_MESSAGES.length;
      setProgress((prev) =>
        prev.visible && prev.kind === "loading" && prev.showFirstNote
          ? { ...prev, text: SERVER_WAKE_MESSAGES[wakeMessageIndexRef.current] }
          : prev
      );
    }, WAKE_MESSAGE_INTERVAL_MS);
  }, [clearWakeMessageRotation]);

  const showLoading = useCallback(
    (text: string, showFirstNote: boolean) => {
      setStatus(EMPTY_STATUS);
      setProgress({ visible: true, kind: "loading", text, showFirstNote });
      if (showFirstNote && !isLocalIntakeApi()) {
        startWakeMessageRotation();
      } else {
        clearWakeMessageRotation();
      }
    },
    [startWakeMessageRotation, clearWakeMessageRotation]
  );

  const stopProgress = useCallback(() => {
    clearWakeMessageRotation();
    setProgress(EMPTY_PROGRESS);
  }, [clearWakeMessageRotation]);

  const resetAll = useCallback(() => {
    previewAbortedRef.current = true;
    initialMessageRef.current = "";
    setMessage("");
    setPreview("");
    setReplyEmail("");
    setShowPreview(false);
    setShowEmailPanel(false);
    setShowHint(true);
    setSent(null);
    setDeliveryWarning("");
    setStatus(EMPTY_STATUS);
    stopProgress();
    setBusy(false);
  }, [stopProgress]);

  const applyTab = useCallback(
    (next: string) => {
      setTab(isContactTab(next) ? next : "work_together");
      resetAll();
    },
    [resetAll]
  );

  useEffect(() => {
    return () => {
      previewAbortedRef.current = true;
      clearWakeMessageRotation();
    };
  }, [clearWakeMessageRotation]);

  const requestPreview = useCallback(async () => {
    return postJson<PreviewEmailResponse>("/preview-email", {
      tab,
      initial_message: initialMessageRef.current,
    });
  }, [tab]);

  const restoreComposerAfterFailedPreview = useCallback((draft: string) => {
    initialMessageRef.current = draft;
    setMessage(draft);
    setShowHint(true);
    setShowPreview(false);
    setShowEmailPanel(false);
    setPreview("");
  }, []);

  const generatePreview = useCallback(async () => {
    const isFirst = !hasCompletedFirstPreview.current;
    const savedMessage = initialMessageRef.current;

    if (savedMessage.length > MAX_INITIAL_MESSAGE_CHARS) {
      restoreComposerAfterFailedPreview(savedMessage);
      setProgress({
        visible: true,
        kind: "error",
        text: `Message is too long (${savedMessage.length}/${MAX_INITIAL_MESSAGE_CHARS}). Please shorten it.`,
        showFirstNote: false,
      });
      return;
    }

    previewAbortedRef.current = false;
    setBusy(true);
    const { text: initialText, showFirstNote: initialNote } = previewLoadingState(isFirst);
    showLoading(initialText, initialNote);

    try {
      const result = await requestPreview();
      if (previewAbortedRef.current) return;

      hasCompletedFirstPreview.current = true;
      stopProgress();
      setPreview(result.body || "");
      setShowPreview(true);
      setShowEmailPanel(true);
      setShowHint(false);
      setStatus(EMPTY_STATUS);
    } catch (err: unknown) {
      if (previewAbortedRef.current) return;

      stopProgress();
      restoreComposerAfterFailedPreview(savedMessage);
      const errText = errorMessage(err);
      const apiHint = friendlyApiError(errText);
      const connectionHint = apiHint
        ? apiHint
        : isConnectionError(errText)
          ? isLocalIntakeApi()
            ? `Can’t reach the intake API at ${INTAKE_API_BASE}. Is it running on port 8000? If Vite moved to another port (e.g. 5174), restart uvicorn so CORS picks it up.`
            : "Can’t reach the intake API. Check your connection or try again in a moment."
          : "Preview failed. Please try again.";
      setProgress({
        visible: true,
        kind: "error",
        text: connectionHint,
        showFirstNote: false,
      });
      console.error(err);
    } finally {
      setBusy(false);
    }
  }, [showLoading, stopProgress, requestPreview, restoreComposerAfterFailedPreview]);

  const onSubmit = useCallback(async () => {
    const raw = message.trim();
    if (!raw) return;
    initialMessageRef.current = raw;
    setMessage("");
    setShowHint(false);
    await generatePreview();
  }, [message, generatePreview]);

  const sendEnabled =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail.trim()) && Boolean(preview.trim());

  const onSendInquiry = useCallback(async () => {
    const email = replyEmail.trim();
    const emailBody = preview.trim();
    if (!email || !emailBody) return;

    if (emailBody.length > MAX_EMAIL_PREVIEW_CHARS) {
      setDeliveryWarning(
        `Message is too long (${emailBody.length}/${MAX_EMAIL_PREVIEW_CHARS}). Please shorten it to ${MAX_EMAIL_PREVIEW_CHARS} characters or fewer.`
      );
      setStatus({ text: `Message exceeds ${MAX_EMAIL_PREVIEW_CHARS} characters.`, kind: "error" });
      return;
    }

    setBusy(true);
    stopProgress();
    setStatus({ text: "Sending inquiry...", kind: "loading" });
    setDeliveryWarning("");

    try {
      const result = await postJson<SendEmailResponse>("/send-email", {
        tab,
        email_preview: emailBody,
        reply_email: email,
      });

      if (result.sent) {
        stopProgress();
        setShowPreview(false);
        setShowEmailPanel(false);
        setDeliveryWarning("");
        setSent({ lede: "Your inquiry is sent. I’ll get back to you.", body: emailBody });
        setStatus(EMPTY_STATUS);
      } else {
        const backendMessage = String(result.message || "").trim();
        const friendlyReason = /timed?\s*out/i.test(backendMessage)
          ? "Email sending timed out on the server."
          : backendMessage || "Sending is temporarily unavailable.";
        setDeliveryWarning(
          `${friendlyReason} Please try again shortly, or copy the draft and send it manually.`
        );
        setStatus({ text: "Couldn’t send email right now.", kind: "error" });
      }
    } catch (err: unknown) {
      setStatus({ text: "Send failed. Please try again.", kind: "error" });
      console.error(err);
    } finally {
      setBusy(false);
    }
  }, [tab, preview, replyEmail, stopProgress]);

  return {
    tab,
    applyTab,
    message,
    setMessage,
    busy,
    preview,
    setPreview,
    replyEmail,
    setReplyEmail,
    showPreview,
    showEmailPanel,
    showHint,
    status,
    progress,
    deliveryWarning,
    sent,
    placeholder: PLACEHOLDERS[tab],
    canSendMessage: Boolean(message.trim()) && !busy,
    canSubmitPreview: !busy,
    showComposer: !showPreview && !sent,
    sendEnabled,
    onSubmit,
    onSendInquiry,
    inPreview: showPreview,
  };
}
