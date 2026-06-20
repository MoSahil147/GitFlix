from datetime import datetime

import pytest
from pydantic import ValidationError

from schemas import CommitData


def _valid_commit(**overrides):
    defaults = dict(
        sha="abc12345",
        author_login="sahil",
        timestamp=datetime.now(),
        message="feat: add github ingestion",
        files_changed=3,
        lines_added=150,
        lines_deleted=20,
    )
    return CommitData(**{**defaults, **overrides})


def test_valid_commit_creates_successfully():
    commit = _valid_commit()
    assert commit.sha == "abc12345"
    assert commit.author_login == "sahil"
    assert commit.files_changed == 3


def test_files_changed_must_be_int():
    with pytest.raises(ValidationError) as exc_info:
        _valid_commit(files_changed="Three")
    assert "files_changed" in str(exc_info.value)


def test_lines_added_must_be_int():
    with pytest.raises(ValidationError):
        _valid_commit(lines_added="many")


def test_sha_is_required():
    with pytest.raises(ValidationError):
        CommitData(
            author_login="sahil",
            timestamp=datetime.now(),
            message="feat: something",
            files_changed=1,
            lines_added=10,
            lines_deleted=0,
        )


def test_timestamp_must_be_datetime():
    with pytest.raises(ValidationError):
        _valid_commit(timestamp="not-a-date")


def test_optional_diff_excerpt_defaults_to_none():
    commit = _valid_commit()
    assert commit.diff_excerpt is None


def test_optional_diff_excerpt_accepts_string():
    commit = _valid_commit(diff_excerpt="+ added line\n- removed line")
    assert commit.diff_excerpt == "+ added line\n- removed line"
