"""
Integration tests: app.config module with real environment loading.

Tests the full Settings lifecycle — module load, env resolution, and validation.
"""

import importlib


class TestSettingsIntegration:
    """Integration tests verifying Settings loads correctly from the environment."""

    def test_settings_loads_from_env(self, monkeypatch):
        """Settings resolves required fields from environment variables."""
        monkeypatch.setenv(
            "DATABASE_URL", "postgresql://test:test@localhost:5432/testdb"
        )
        monkeypatch.setenv("OPENAI_API_KEY", "sk-integration-test")

        import app.config

        importlib.reload(app.config)

        assert app.config.settings.database_url.startswith("postgresql://")
        assert app.config.settings.openai_api_key == "sk-integration-test"

    def test_settings_port_is_accessible(self, monkeypatch):
        """Settings object exposes the python_port field."""
        monkeypatch.setenv(
            "DATABASE_URL", "postgresql://test:test@localhost:5432/testdb"
        )
        monkeypatch.setenv("OPENAI_API_KEY", "sk-integration-test")

        import app.config

        importlib.reload(app.config)

        port = app.config.settings.python_port
        assert isinstance(port, int)
        assert 1024 <= port <= 65535

    def test_settings_debug_flag_can_be_overridden(self, monkeypatch):
        """DEBUG=true env var enables debug mode."""
        monkeypatch.setenv(
            "DATABASE_URL", "postgresql://test:test@localhost:5432/testdb"
        )
        monkeypatch.setenv("OPENAI_API_KEY", "sk-integration-test")
        monkeypatch.setenv("DEBUG", "true")

        import app.config

        importlib.reload(app.config)

        assert app.config.settings.debug is True
