from pathlib import Path

import pytest

DOCUMENTS_DIR = Path(__file__).parent.parent / "documents"


@pytest.fixture
def documents_dir() -> Path:
    return DOCUMENTS_DIR
