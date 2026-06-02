import sys
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import SendEmailResponse, app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_preview_email_success_shape(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    class FakeLLMOutput:
        main_sentence = "I’m exploring a collaboration on production-ready AI systems."

    monkeypatch.setattr("main._call_llm_for_preview", lambda _: FakeLLMOutput())

    response = await client.post(
        "/preview-email",
        json={"tab": "work_together", "initial_message": "I would like to discuss building production AI systems."},
    )

    body = response.json()
    assert response.status_code == 200
    assert set(body.keys()) == {"subject", "body"}
    assert body["subject"] == "Work together inquiry via website"
    assert "Hi Ana" in body["body"]


@pytest.mark.asyncio
async def test_preview_email_fallback_when_openai_client_missing(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr("main.openai_client", None)

    response = await client.post(
        "/preview-email",
        json={
            "tab": "work_together",
            "initial_message": "I am exploring collaboration on production AI systems and would love to connect.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["subject"] == "Work together inquiry via website"
    assert "I’d love to explore working together and see if there’s a good fit." in body["body"]


@pytest.mark.asyncio
async def test_preview_email_fallback_when_llm_call_fails(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    def raise_llm_error(_payload):
        raise RuntimeError("simulated llm failure")

    monkeypatch.setattr("main._call_llm_for_preview", raise_llm_error)

    response = await client.post(
        "/preview-email",
        json={
            "tab": "hiring",
            "initial_message": "I am hiring for a senior machine learning engineer focused on production systems.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["subject"] == "Hiring inquiry via website"
    assert "I’m currently hiring and would be glad to share more about the role." in body["body"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"tab": "invalid-tab", "initial_message": "valid enough input for validation"},
        {"tab": "hiring", "initial_message": ""},
        {"tab": "hiring", "initial_message": "x" * 201},
    ],
)
async def test_preview_email_validation_failures(client: AsyncClient, payload: dict):
    response = await client.post("/preview-email", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_send_email_missing_reply_email_returns_validation_error(client: AsyncClient):
    payload = {"tab": "hiring", "email_preview": "Hello Ana"}
    response = await client.post("/send-email", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"tab": "other", "email_preview": "", "reply_email": "person@example.com"},
        {"tab": "other", "email_preview": "x" * 501, "reply_email": "person@example.com"},
        {"tab": "other", "email_preview": "Looks good", "reply_email": "not-an-email"},
    ],
)
async def test_send_email_invalid_payloads(client: AsyncClient, payload: dict):
    response = await client.post("/send-email", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_cors_preflight_allows_configured_origin(client: AsyncClient):
    response = await client.options(
        "/preview-email",
        headers={
            "Origin": "https://ana-stanojevic.com",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://ana-stanojevic.com"


@pytest.mark.asyncio
async def test_cors_preflight_rejects_unlisted_origin(client: AsyncClient):
    response = await client.options(
        "/preview-email",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None


@pytest.mark.asyncio
async def test_send_email_success_response_shape(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "main._send_via_resend",
        lambda subject, email_body, reply_email: SendEmailResponse(
            sent=True, message="Email sent successfully."
        ),
    )

    response = await client.post(
        "/send-email",
        json={
            "tab": "other",
            "email_preview": "Hi Ana,\n\nI wanted to connect.\n\nBest,",
            "reply_email": "person@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"sent": True, "message": "Email sent successfully."}
