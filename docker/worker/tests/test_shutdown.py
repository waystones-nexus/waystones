"""
test_shutdown.py — Tests for server_wrapper.py:delayed_exit().

A task accepted during the post-task grace period must not be killed by the
exit timer scheduled when the previous task finished.
"""
import pytest

from conftest import load_worker

wrapper = load_worker("server_wrapper.py")


@pytest.fixture
def exits(monkeypatch):
    calls = []
    monkeypatch.setattr(wrapper.os, "_exit", lambda code: calls.append(code))
    monkeypatch.setattr(wrapper.time, "sleep", lambda s: None)
    yield calls
    wrapper.active_tasks_count = 0


def test_exits_when_still_idle(exits):
    wrapper.active_tasks_count = 0
    wrapper.delayed_exit()
    assert exits == [0]


def test_stays_up_when_task_arrived_during_grace(exits):
    wrapper.active_tasks_count = 1
    wrapper.delayed_exit()
    assert exits == []
