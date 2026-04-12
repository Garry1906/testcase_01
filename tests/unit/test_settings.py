"""
Unit tests for app.config.Settings.

Tests the Settings class in isolation — no external services.
"""

import importlib
import warnings

import pytest


class TestSettingsDefaults:
    """Verify default field values."""

    def test_default_port_is_8000(self):
        import app.config

        importlib.reload(app.config)
        assert app.config.settings.python_port == 8000

    def test_debug_defaults_to_false(self):
        import app.config

        importlib.reload(app.config)
        assert app.config.settings.debug is False

    def test_log_level_defaults_to_debug(self):
        import app.config

        importlib.reload(app.config)
        assert app.config.settings.python_log_level == "DEBUG"

    def test_host_defaults_to_all_interfaces(self):
        import app.config

        importlib.reload(app.config)
        assert app.config.settings.python_host == "0.0.0.0"


class TestDatabaseUrlValidator:
    """Verify the placeholder-detection validator."""

    def test_placeholder_url_triggers_warning(self):
        """A URL containing 'your-' should produce a UserWarning."""
        from app.config import Settings

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            s = Settings(
                database_url="your-database-url",
                openai_api_key="sk-test",
            )
        assert any("placeholder" in str(warning.message).lower() for warning in w)
        # Validator still returns the value
        assert s.database_url == "your-database-url"

    def test_valid_url_produces_no_warning(self):
        """A proper test URL should not trigger a warning."""
        from app.config import Settings

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            Settings(
                database_url="postgresql://test:test@localhost:5432/testdb",
                openai_api_key="sk-test",
            )
        assert not any("placeholder" in str(warning.message).lower() for warning in w)


class TestOpenAIKeyValidator:
    @pytest.mark.parametrize("key", ["", "   "])
    def test_invalid_key_raises(self, key):
        from pydantic import ValidationError
        from app.config import Settings

        with pytest.raises(ValidationError):
            Settings(database_url="x", openai_api_key=key)

    def test_valid_key_passes(self):
        from app.config import Settings

        assert (
            Settings(
                database_url="x",
                openai_api_key="sk-valid",  # pragma: allowlist secret
            ).openai_api_key
            == "sk-valid"
        )
