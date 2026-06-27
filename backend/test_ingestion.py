import pytest

from ingestion.github_client import _validate_repo_url


def test_valid_url_is_unchanged():
    assert _validate_repo_url("https://github.com/owner/repo") == "https://github.com/owner/repo"


def test_trailing_slash_is_stripped():
    assert _validate_repo_url("https://github.com/owner/repo/") == "https://github.com/owner/repo"


def test_http_is_upgraded_to_https():
    assert _validate_repo_url("http://github.com/owner/repo") == "https://github.com/owner/repo"


def test_missing_protocol_gets_https():
    assert _validate_repo_url("github.com/owner/repo") == "https://github.com/owner/repo"


def test_uppercase_url_is_lowercased():
    assert _validate_repo_url("https://github.com/Owner/Repo") == "https://github.com/owner/repo"


def test_non_github_host_raises():
    with pytest.raises(ValueError):
        _validate_repo_url("https://gitlab.com/owner/repo")


def test_missing_repo_segment_raises():
    with pytest.raises(ValueError):
        _validate_repo_url("https://github.com/owner")


def test_extra_path_segment_raises():
    with pytest.raises(ValueError):
        _validate_repo_url("https://github.com/owner/repo/tree/main")
