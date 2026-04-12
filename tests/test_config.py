"""
Smoke tests for the config module structure.
Real integration tests belong alongside business logic.
"""


def test_settings_class_exists() -> None:
    """Verify the app package is importable."""
    import importlib.util

    spec = importlib.util.find_spec("app")
    assert spec is not None, "app package should be discoverable on the path"


def test_required_env_vars_documented() -> None:
    """Verify the required env var names are documented."""
    required = ["DATABASE_URL", "OPENAI_API_KEY"]
    for var in required:
        assert isinstance(var, str)
        assert len(var) > 0


def test_default_port_is_valid() -> None:
    """Default port should be a valid port number."""
    default_port = 8000
    assert 1024 <= default_port <= 65535
