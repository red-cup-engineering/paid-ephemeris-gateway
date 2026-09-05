"""OpenClaw workspace materializer.

Projects governance personas to ``.openclaw/agents/<slug>.md`` so
OpenClaw discovers them as selectable agents.

Sources (composed per persona):
  - ``governance/personas/<slug>.md``       identity, model-config
  - ``governance/offices/<office-slug>.md`` remit, deontic-profile
  - ``governance/agents/`` entries in office ``agents-serving:``  skills

Target: ``.openclaw/agents/<slug>.md`` (OpenClaw agent profile format)
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

import yaml

from pyfars.kernel.store import System
from pyfars.programs.materializer import MaterializerProgram


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end == -1:
        return {}, text
    fm = yaml.safe_load(text[4:end]) or {}
    body = text[end + 4:].lstrip("\n")
    return fm, body


_MODEL_MAP: dict[str, str] = {
    "opus-research":     "groq/llama-3.3-70b-versatile",
    "sonnet":            "nvidia/nemotron-3-super-120b-a12b",
    "nemotron":          "nvidia/nemotron-3-super-120b-a12b",
    "haiku":             "groq/llama-3.3-70b-versatile",
}
_DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b"


def _resolve_model(model_config: str | None) -> str:
    if not model_config:
        return _DEFAULT_MODEL
    return _MODEL_MAP.get(str(model_config), _DEFAULT_MODEL)


class OpenClawWorkspaceMaterializer(MaterializerProgram):
    """Projects governance personas to .openclaw/agents/<slug>.md.

    Each active ``kind: persona-agent`` record in
    ``governance/personas/`` becomes one OpenClaw agent profile whose
    identity, remit, and skills are composed from the persona, its
    office, and the agents serving that office.
    """

    materializer_slug = "openclaw-workspace"
    scopes = ["governance/offices", "governance/agents"]

    def materialize(self, system: System) -> Mapping[Path, bytes]:
        out: dict[Path, bytes] = {}
        agents_dir = self.root / "governance" / "agents"
        if not agents_dir.is_dir():
            return out

        offices_dir = self.root / "governance" / "offices"

        for agent_file in sorted(agents_dir.glob("*.md")):
            if agent_file.name.startswith("_"):
                continue
            fm, body = _parse_frontmatter(
                agent_file.read_text(encoding="utf-8")
            )

            slug = agent_file.stem
            name = fm.get("name") or fm.get("title", slug)
            description = fm.get("description") or fm.get("origin", "")
            model = _resolve_model(fm.get("model-config"))

            office_remit = ""
            deontic: dict = {}
            office_skills: list[str] = []

            # serves: [office-slug, ...] or holds-office: office:slug
            serves = fm.get("serves") or []
            if isinstance(serves, str):
                serves = [serves]
            holds_office = fm.get("holds-office", "")
            if holds_office and not serves:
                serves = [str(holds_office).removeprefix("office:")]

            for office_ref in serves:
                office_slug = str(office_ref).removeprefix("office:")
                if not offices_dir.is_dir():
                    continue
                office_path = offices_dir / f"{office_slug}.md"
                if not office_path.exists():
                    continue
                ofm, _ = _parse_frontmatter(
                    office_path.read_text(encoding="utf-8")
                )
                if not office_remit:
                    office_remit = ofm.get("remit", "")
                deontic.update(ofm.get("deontic-profile", {}) or {})
                for skill in ofm.get("provides-skill", []) or []:
                    office_skills.append(str(skill))

            for skill in fm.get("provides-skill", []) or []:
                office_skills.append(str(skill))

            rendered = _render_profile(
                slug=slug,
                name=name,
                description=description,
                model=model,
                office_remit=office_remit,
                deontic=deontic,
                skills=office_skills,
                body=body,
            )
            target = Path(".openclaw") / "agents" / f"{slug}.md"
            out[target] = rendered.encode("utf-8")

        return out


def _render_profile(
    *,
    slug: str,
    name: str,
    description: str,
    model: str,
    office_remit: str,
    deontic: dict,
    skills: list[str],
    body: str,
) -> str:
    desc = (description[:197] + "...") if len(description) > 200 else description

    lines = ["---", f"name: {name}"]
    if desc:
        lines.append(f"description: {desc}")
    lines.append(f"model: {model}")
    if skills:
        seen: set[str] = set()
        unique_skills = [s for s in skills if not (s in seen or seen.add(s))]  # type: ignore[func-returns-value]
        lines.append("tools:")
        for skill in unique_skills[:20]:
            lines.append(f"  - skill: {skill}")
    lines.append("---")
    lines.append("")

    if office_remit:
        lines.append(f"**Remit:** {office_remit}")
        lines.append("")

    may = deontic.get("may", [])
    must = deontic.get("must", [])
    must_not = deontic.get("must-not", [])
    if may or must or must_not:
        lines.append("**Authority:**")
        for item in may:
            lines.append(f"- may: {item}")
        for item in must:
            lines.append(f"- must: {item}")
        for item in must_not:
            lines.append(f"- must-not: {item}")
        lines.append("")

    if body.strip():
        lines.append(body.strip())
        lines.append("")

    return "\n".join(lines)


__all__ = ["OpenClawWorkspaceMaterializer"]
