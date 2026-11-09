import re

from app.core.config import CODESPACES_CORS_ORIGIN_REGEX


def test_codespaces_cors_pattern_is_limited_to_forwarded_frontend_origins() -> None:
    allowed = re.compile(CODESPACES_CORS_ORIGIN_REGEX)

    assert allowed.fullmatch("https://friendly-codespace-5173.app.github.dev")
    assert not allowed.fullmatch("https://friendly-codespace-8000.app.github.dev")
    assert not allowed.fullmatch("https://attacker.example")
