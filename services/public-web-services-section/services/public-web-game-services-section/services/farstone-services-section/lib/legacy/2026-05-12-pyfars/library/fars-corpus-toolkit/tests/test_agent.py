"""Tests for fars.runtime.agent."""
import pytest

from fars.runtime.agent import Agent, AgentRegistry


def test_agent_construction():
    a = Agent(name="claude-code", capabilities=frozenset({"writeprose", "edit"}))
    assert a.name == "claude-code"
    assert a.has_capability("edit")
    assert not a.has_capability("compile")


def test_agent_skill_check():
    a = Agent(name="x", skills=frozenset({"validate-frontmatter"}))
    assert a.has_skill("validate-frontmatter")
    assert not a.has_skill("solve-pde")


def test_registry_register_and_get():
    reg = AgentRegistry()
    a = Agent(name="ci", capabilities=frozenset({"run-tests"}))
    reg.register(a)
    assert reg.get("ci") is a
    assert reg.get("absent") is None


def test_registry_duplicate_raises():
    reg = AgentRegistry()
    reg.register(Agent(name="x"))
    with pytest.raises(ValueError):
        reg.register(Agent(name="x"))


def test_registry_by_capability():
    reg = AgentRegistry()
    reg.register(Agent(name="a1", capabilities=frozenset({"edit"})))
    reg.register(Agent(name="a2", capabilities=frozenset({"edit", "review"})))
    reg.register(Agent(name="a3", capabilities=frozenset({"review"})))
    editors = reg.by_capability("edit")
    assert {a.name for a in editors} == {"a1", "a2"}


def test_registry_iter_and_len():
    reg = AgentRegistry()
    reg.register(Agent(name="x"))
    reg.register(Agent(name="y"))
    assert len(reg) == 2
    names = {a.name for a in reg}
    assert names == {"x", "y"}
