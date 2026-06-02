from __future__ import annotations
import json
import logging
import os
import re
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel, EmailStr, Field
from openai import OpenAI

def _load_local_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        current = os.environ.get(key)
        if current is None or current == "":
            os.environ[key] = value
        print (f"Loaded {key} = {value}", flush=True)


_load_local_env()
logger = logging.getLogger("intake-api")


Tab = Literal["work_together", "hiring", "other"]


class PreviewRequest(BaseModel):
    tab: Tab
    initial_message: str = Field(min_length=1, max_length=200)


class PreviewResponse(BaseModel):
    subject: str
    body: str


class SendEmailRequest(BaseModel):
    tab: Tab
    email_preview: str = Field(min_length=1, max_length=500)
    reply_email: EmailStr


class SendEmailResponse(BaseModel):
    sent: bool
    message: str


class PreviewLLMOutput(BaseModel):
    main_sentence: str


def log_event(event_name: str, **data):
    payload = {
        "event": event_name,
        "ts": datetime.now(timezone.utc).isoformat(),
        **data,
    }
    print(json.dumps(payload, ensure_ascii=False))


def safe_text(text: str, max_len: int = 300):
    if not text:
        return ""
    return text[:max_len]


_LOCAL_DEV_ORIGINS = tuple(
    f"http://{host}:{port}"
    for host in ("127.0.0.1", "localhost")
    for port in range(5173, 5180)
)
_DEFAULT_ORIGINS = (
    "https://ana-stanojevic.com",
    "https://www.ana-stanojevic.com",
    *_LOCAL_DEV_ORIGINS,
)
# Vite uses the next free port when 5173 is taken (5174, 5175, …).
_LOCAL_VITE_ORIGIN_REGEX = r"http://(127\.0\.0\.1|localhost):\d+"


def _get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if not raw:
        return list(_DEFAULT_ORIGINS)
    origins = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    if not origins:
        return list(_DEFAULT_ORIGINS)
    return list(dict.fromkeys([*origins, *_LOCAL_DEV_ORIGINS]))


app = FastAPI(title="Personal Website Intake API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_origin_regex=_LOCAL_VITE_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

TAB_LABELS: dict[Tab, str] = {
    "work_together": "Work together",
    "hiring": "Hiring",
    "other": "Other",
}

PREVIEW_RATE_LIMIT_MAX = 10
SEND_RATE_LIMIT_MAX = 3
RATE_LIMIT_WINDOW_SEC = 10 * 60
_rate_attempts_by_key: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_rate_limit_lock = threading.Lock()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _extract_json_object(text: str) -> str:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Model did not return JSON object.")
    return match.group(0)


_GENERIC_OPENERS = [
    re.compile(r"^(hi|hey|hello|hiya|howdy|greetings)\b[!.,\s]*$", re.I),
    re.compile(r"^(hi|hey|hello)\b[,!\s]*(there|ana|team)\b[!.,\s]*$", re.I),
    re.compile(r"^(good\s+(morning|afternoon|evening))\b[!.,\s]*$", re.I),
    re.compile(r"^thanks?\b[!.,\s]*$", re.I),
    re.compile(r"^thx\b[!.,\s]*$", re.I),
    re.compile(r"^ping[!.,\s]*$", re.I),
    re.compile(r"^touching base[!.,\s]*$", re.I),
    re.compile(r"^checking in[!.,\s]*$", re.I),
    re.compile(r"^circling back[!.,\s]*$", re.I),
    re.compile(r"^just\s+(wanted|wondering)\s+to\s+(reach out|connect|say hi)\b", re.I),
    re.compile(r"^reaching out\b[!.,\s]*$", re.I),
    re.compile(r"^i\s+(just\s+)?wanted to reach out\b", re.I),
    re.compile(r"^hope you('?re| are) (well|doing ok)\b", re.I),
    re.compile(r"\b(quick|short)\s+(question|note|message)\b", re.I),
    re.compile(r"\bpick your brain\b", re.I),
    re.compile(r"\b(bounce|run)\s+an?\s+idea\s+by\b", re.I),
    re.compile(r"\b(networking|coffee)\s+(chat|meeting)?\b", re.I),
    re.compile(r"\blet me know if you have time\b", re.I),
    re.compile(r"\bopen to (a )?(chat|call|conversation)\b", re.I),
    re.compile(r"\bany chance we could\b", re.I),
    re.compile(r"\bwould love to (chat|talk|connect)\b", re.I),
    re.compile(r"\bnot sure (what|how) to\b", re.I),
    re.compile(r"\b(general|brief)\s+(question|note)\b", re.I),
    re.compile(r"\bgrab (a )?(coffee|time)\b", re.I),
    re.compile(r"\bsync up\b", re.I),
    re.compile(r"\bloop (you |me )?in\b", re.I),
    re.compile(r"\bintroduce myself\b", re.I),
    re.compile(r"\bexplore (a )?conversation\b", re.I),
]

_VAGUE_TOKENS = [
    re.compile(r"\bhi\b", re.I),
    re.compile(r"\bhello\b", re.I),
    re.compile(r"\bhey\b", re.I),
    re.compile(r"\bhelp\b", re.I),
    re.compile(r"\breach(ing)? out\b", re.I),
    re.compile(r"\bsomething\b", re.I),
    re.compile(r"\bquestion\b", re.I),
    re.compile(r"\bopportunity\b", re.I),
    re.compile(r"\btalk\b", re.I),
    re.compile(r"\bchat\b", re.I),
    re.compile(r"\bconnect(ing)?\b", re.I),
    re.compile(r"\binterested\b", re.I),
    re.compile(r"\bin touch\b", re.I),
    re.compile(r"\bget in touch\b", re.I),
    re.compile(r"\btouch base\b", re.I),
    re.compile(r"\bfollow(ing)? up\b", re.I),
    re.compile(r"\bcollaborat", re.I),
    re.compile(r"\bsynergy\b", re.I),
    re.compile(r"\bexploring\b", re.I),
    re.compile(r"\bwondering if\b", re.I),
    re.compile(r"\bwould love\b", re.I),
    re.compile(r"\blet's\b", re.I),
    re.compile(r"\blets\b", re.I),
    re.compile(r"\bdiscuss\b", re.I),
    re.compile(r"\blearn more\b", re.I),
    re.compile(r"\bmore about\b", re.I),
    re.compile(r"\bintroduce myself\b", re.I),
    re.compile(r"\bopen to\b", re.I),
    re.compile(r"\bpartnership\b", re.I),
    re.compile(r"\bmutual\b", re.I),
    re.compile(r"\balignment\b", re.I),
    re.compile(r"\bthought leader\b", re.I),
    re.compile(r"\bvalue add\b", re.I),
    re.compile(r"\bconnect on\b", re.I),
    re.compile(r"\bdm\b", re.I),
    re.compile(r"\bslide into\b", re.I),
    re.compile(r"\bmessage you\b", re.I),
    re.compile(r"\bhear from you\b", re.I),
    re.compile(r"\bcatch up\b", re.I),
    re.compile(r"\b15\s*(min|minute)\b", re.I),
    re.compile(r"\bquick call\b", re.I),
]


def _is_vague(message: str) -> bool:
    raw = (message or "").strip()
    if not raw:
        return True
    normalized = re.sub(r"\s+", " ", raw.lower()).strip()
    words = [w for w in normalized.split() if w]
    if len(raw) >= 160 or len(words) >= 22:
        return False
    if len(normalized) < 30:
        return True
    if any(pattern.search(normalized) for pattern in _GENERIC_OPENERS):
        return True
    hits = sum(1 for pattern in _VAGUE_TOKENS if pattern.search(normalized))
    if hits >= 2:
        return True
    if len(words) <= 6 and hits >= 1:
        return True
    return False


def _is_meaningful_input(text: str) -> bool:
    raw = (text or "").strip()
    if len(raw) < 6:
        return False

    words = re.findall(r"[a-zA-Z]{2,}", raw.lower())
    if len(words) < 2:
        return False

    # Reject mostly random tokens like "sdfsf" or consonant-heavy gibberish.
    long_words = [w for w in words if len(w) >= 4]
    if not long_words:
        return False
    no_vowel_count = sum(1 for w in long_words if not re.search(r"[aeiou]", w))
    if no_vowel_count / len(long_words) > 0.5:
        return False

    return True


def _deactivate_links(text: str) -> str:
    if not text:
        return text

    url_pattern = re.compile(r"((?:https?://|www\.)[^\s]+)", flags=re.IGNORECASE)

    def repl(match: re.Match[str]) -> str:
        token = match.group(1)
        token = re.sub(r"^https://", "hxxps://", token, flags=re.IGNORECASE)
        token = re.sub(r"^http://", "hxxp://", token, flags=re.IGNORECASE)
        token = token.replace(".", "[.]")
        return token

    return url_pattern.sub(repl, text)


def _build_weak_input_fallback_preview(tab: Tab) -> PreviewResponse:
    """Fixed per-tab template when input is too thin or when LLM output is unavailable."""
    subject = f"{TAB_LABELS[tab]} inquiry via website"
    main_sentence = {
        "work_together": "I’d love to explore working together and see if there’s a good fit.",
        "hiring": "I’m currently hiring and would be glad to share more about the role.",
        "other": "I came across your profile and wanted to reach out and connect.",
    }[tab]
    body = (
        "Hi Ana,\n\n"
        f"{main_sentence}\n\n"
        "Looking forward to hearing from you.\n\n"
        "Best,"
    )
    return PreviewResponse(subject=subject, body=body)


def _compose_email_body(main_sentence: str) -> str:
    sentence = (main_sentence or "").strip()
    return (
        "Hi Ana,\n\n"
        f"{sentence}\n\n"
        "Looking forward to hearing from you.\n\n"
        "Best,"
    )


def _call_llm_for_preview(payload: PreviewRequest) -> PreviewLLMOutput:
    if openai_client is None:
        raise RuntimeError("OPENAI_API_KEY is missing.")
    system_prompt = (
        "You write short human-sounding professional emails. "
        "Return strict JSON only with key: main_sentence."
    )
    user_prompt = (
        "Generate one email preview.\n"
        f"Tab: {payload.tab}\n"
        f"Initial message: {payload.initial_message}\n"
        "Requirements:\n"
        "- Generate ONLY one sentence that will be placed in the email body.\n"
        "- Do not include greeting/closing in output.\n"
        "- Do not include Subject in output.\n"
        "- Always sound like first contact. There is no prior conversation.\n"
        "- Do not imply prior relationship or continuation.\n"
        "- Keep it confident, simple, and direct.\n"
        "- Tab-specific wording:\n"
        "  - work_together: collaboration wording.\n"
        "  - hiring: hiring wording.\n"
        "  - other: neutral connect wording.\n"
        "- Start with one of: 'I’m working on...', 'I’m exploring...', 'I wanted to reach out...'.\n"
        "- use initial message message.\n"
        "- Do not frame as problem-solving.\n"
        "- Keep the sentence simple and direct.\n"
        "- Avoid long clauses and abstract wording.\n"
        "- Do NOT invent details.\n"
        "- Do NOT use buzzwords.\n"
        "- Prefer concrete phrasing like: someone experienced in this, someone who has done this before, looking to connect with.\n"
        "- Tone: calm, professional, human, slightly warm.\n"
        "- Keep language simple and clear.\n"
        + (
            "- The first message was short or generic; expand it into one clear, honest sentence using only what they implied—do not invent projects, roles, or facts.\n"
            if _is_vague(payload.initial_message)
            else ""
        )
    )
    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw_text = response.output_text or ""
    parsed = json.loads(_extract_json_object(raw_text))
    return PreviewLLMOutput.model_validate(parsed)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "intake backend is running"}


def _build_preview_response(payload: PreviewRequest) -> PreviewResponse:
    logger.info("[preview-email] tab=%s", payload.tab)
    if not _is_meaningful_input(payload.initial_message):
        print ("_build_preview_response", payload.initial_message, '\n\n\n\n\n', flush=True)
        response = _build_weak_input_fallback_preview(payload.tab)
        logger.info("[preview-email] fallback=invalid_input response=%s", response.model_dump())
        return response

    payload = payload.model_copy(
        update={"initial_message": _deactivate_links(payload.initial_message)}
    )

    try:
        llm = _call_llm_for_preview(payload)
        llm_sentence = (llm.main_sentence or "").strip()
        if not llm_sentence:
            response = _build_weak_input_fallback_preview(payload.tab)
            logger.info("[preview-email] fallback=empty_main_sentence response=%s", response.model_dump())
            return response
        subject = f"{TAB_LABELS[payload.tab]} inquiry via website"
        response = PreviewResponse(subject=subject, body=_compose_email_body(llm_sentence))
        logger.info("[preview-email] response=%s", response.model_dump())
        return response
    except Exception as exc:
        logger.warning("[preview-email] llm_fallback reason=%s", str(exc))
        response = _build_weak_input_fallback_preview(payload.tab)
        logger.info("[preview-email] response=%s", response.model_dump())
        return response


def _extract_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # First IP in X-Forwarded-For is the original client.
        first = xff.split(",")[0].strip()
        if first:
            return first
    xrip = request.headers.get("x-real-ip", "").strip()
    if xrip:
        return xrip
    return request.client.host if request.client else "unknown"


def _is_rate_limited(client_ip: str, bucket: str, max_requests: int, window_sec: int) -> bool:
    now = time.time()
    cutoff = now - window_sec
    key = (bucket, client_ip)
    with _rate_limit_lock:
        attempts = _rate_attempts_by_key[key]
        while attempts and attempts[0] < cutoff:
            attempts.popleft()
        if len(attempts) >= max_requests:
            return True
        attempts.append(now)
        return False


def _send_via_resend(subject: str, email_body: str, reply_email: EmailStr) -> SendEmailResponse:
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    email_from = os.getenv("EMAIL_FROM", "").strip()
    email_to = os.getenv("EMAIL_TO", "").strip()

    if not resend_api_key:
        return SendEmailResponse(sent=False, message="RESEND_API_KEY is missing.")
    if not email_from:
        return SendEmailResponse(sent=False, message="EMAIL_FROM is missing.")
    if not email_to:
        return SendEmailResponse(sent=False, message="EMAIL_TO is missing.")

    request_body = {
        "from": email_from,
        "to": [email_to],
        "subject": subject,
        "text": email_body,
        "reply_to": str(reply_email),
    }
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post("https://api.resend.com/emails", json=request_body, headers=headers)
        if response.is_success:
            return SendEmailResponse(sent=True, message="Email sent successfully.")

        error_body = ""
        try:
            parsed = response.json()
            error_body = parsed.get("message") or parsed.get("error") or json.dumps(parsed)
        except Exception:
            error_body = response.text
        return SendEmailResponse(
            sent=False,
            message=f"Resend API error ({response.status_code}): {error_body}".strip(),
        )
    except Exception as exc:
        return SendEmailResponse(sent=False, message=f"Resend send failed: {exc}")


@app.post("/preview-email", response_model=PreviewResponse)
def preview_email(payload: PreviewRequest, request: Request) -> PreviewResponse:
    client_ip = _extract_client_ip(request)
    if _is_rate_limited(
        client_ip=client_ip,
        bucket="preview-email",
        max_requests=PREVIEW_RATE_LIMIT_MAX,
        window_sec=RATE_LIMIT_WINDOW_SEC,
    ):
        logger.warning("[preview-email] rate_limited ip=%s", client_ip)
        raise HTTPException(
            status_code=429,
            detail="Too many preview attempts. Please wait a few minutes and try again.",
        )
    response = _build_preview_response(payload)
    session_id = request.headers.get("x-session-id", "unknown")
    turn_count = 1
    log_event(
        "preview_generated",
        session_id=session_id,
        email_length=len(response.body),
        email_preview_text=safe_text(response.body),
        input_text=safe_text(payload.initial_message),
        turn_count=turn_count,
    )
    return response


@app.post("/send-email", response_model=SendEmailResponse)
def send_email(payload: SendEmailRequest, request: Request) -> SendEmailResponse:
    client_ip = _extract_client_ip(request)
    session_id = request.headers.get("x-session-id", "unknown")
    if _is_rate_limited(
        client_ip=client_ip,
        bucket="send-email",
        max_requests=SEND_RATE_LIMIT_MAX,
        window_sec=RATE_LIMIT_WINDOW_SEC,
    ):
        message = "Too many send attempts. Please wait a few minutes and try again."
        logger.warning("[send-email] rate_limited ip=%s", client_ip)
        return SendEmailResponse(sent=False, message=message)

    logger.info("[send-email] start tab=%s reply_to=%s ip=%s", payload.tab, payload.reply_email, client_ip)
    log_event(
        "send_attempted",
        session_id=session_id,
        email_length=len(payload.email_preview),
        email_text=safe_text(payload.email_preview),
    )
    subject = f"{TAB_LABELS[payload.tab]} inquiry via website"
    safe_body = _deactivate_links(payload.email_preview)
    response = _send_via_resend(subject, safe_body, payload.reply_email)

    if response.sent:
        logger.info("[send-email] success driver=resend message=%s", response.message)
        log_event(
            "send_succeeded",
            session_id=session_id,
        )
    else:
        logger.warning("[send-email] failure driver=resend message=%s", response.message)
        log_event(
            "send_failed",
            session_id=session_id,
            error=str(response.message)[:200],
            email_text=safe_text(payload.email_preview),
        )
    return response
