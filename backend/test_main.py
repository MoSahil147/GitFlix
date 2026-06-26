from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_status_returns_required_keys():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "missing_required" in data
    assert "warnings" in data


def test_status_value_is_ok_or_degraded():
    response = client.get("/status")
    assert response.json()["status"] in ("ok", "degraded")


def test_cancel_nonexistent_request_returns_not_found():
    response = client.post("/generate/cancel?request_id=does-not-exist")
    assert response.status_code == 200
    assert response.json()["status"] == "not_found"


def test_cancel_sets_event_and_returns_cancelled(monkeypatch):
    import threading
    from main import _cancel_events

    event = threading.Event()
    _cancel_events["test-req"] = event

    response = client.post("/generate/cancel?request_id=test-req")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert event.is_set()

    _cancel_events.pop("test-req", None)


def test_cancel_already_cancelled_event():
    import threading
    from main import _cancel_events

    event = threading.Event()
    event.set()
    _cancel_events["test-req-2"] = event

    response = client.post("/generate/cancel?request_id=test-req-2")
    assert response.status_code == 200
    assert response.json()["status"] == "already_cancelled"

    _cancel_events.pop("test-req-2", None)
