"""
Shared test fixtures (Gold Standard).

RULES:
1. All mocks use create_autospec — never bare Mock()
2. Fixtures are the SINGLE SOURCE OF TRUTH for test dependencies
3. Add new fixtures here, not in individual test files
"""

import sys
import os
from pathlib import Path
import pytest

# Ensure the project root is on the path so `app` is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment defaults before any module-level imports.
# These allow app.config.Settings() to instantiate without real credentials.
# Override per-test via monkeypatch where needed.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")


@pytest.fixture
def temp_workspace(tmp_path):
    """Provides a temporary workspace directory for integration tests."""
    workspace = tmp_path / "test-workspace"
    workspace.mkdir()
    return workspace
