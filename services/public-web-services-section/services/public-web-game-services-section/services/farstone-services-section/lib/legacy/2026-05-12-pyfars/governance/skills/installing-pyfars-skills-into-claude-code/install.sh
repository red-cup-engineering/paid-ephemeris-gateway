#!/usr/bin/env bash
# Project pyfars governance/skills/ into <polity-root>/.claude/skills/.
#
# Every pyfars skill is a directory of the form:
#   governance/skills/<slug>/SKILL.md   (+ optional supporting files)
#
# Projected into Claude Code's expected layout:
#   <polity-root>/.claude/skills/<slug>/SKILL.md   (+ supporting files)
#
# Pyfars skill frontmatter (name:, description:) is already in the shape Claude
# Code expects; no content transformation is performed. The projection
# replaces each destination skill directory wholesale and is additive across
# skills — orphans from removed pyfars skills are not cleaned up. To force a
# clean reflection, `rm -rf <polity-root>/.claude/skills/*` before running.
#
# Usage:
#   install.sh [pyfars-skills-root] [polity-root]
#
# Defaults (the 561-polity layout):
#   pyfars-skills-root = $PWD/tools/platform/pyfars/governance/skills
#   polity-root        = $PWD

set -euo pipefail

src="${1:-${PWD}/tools/platform/pyfars/governance/skills}"
polity_root="${2:-${PWD}}"
dst="${polity_root}/.claude/skills"

if [ ! -d "$src" ]; then
  echo "error: pyfars skills source not found at $src" >&2
  exit 1
fi

mkdir -p "$dst"

count=0
errors=0
for entry in "$src"/*; do
  name="$(basename "$entry")"

  # The _index.md record describes the skills directory itself, not a skill.
  [ "$name" = "_index.md" ] && continue

  if [ ! -d "$entry" ]; then
    echo "error: $entry is not a directory; every pyfars skill must be <slug>/SKILL.md" >&2
    errors=$((errors + 1))
    continue
  fi

  if [ ! -f "$entry/SKILL.md" ]; then
    echo "error: $entry/SKILL.md is missing; every pyfars skill must contain SKILL.md" >&2
    errors=$((errors + 1))
    continue
  fi

  rm -rf "${dst:?}/${name}"
  cp -r "$entry" "$dst/$name"
  count=$((count + 1))
done

if [ "$errors" -gt 0 ]; then
  echo "installed $count pyfars skills with $errors errors" >&2
  exit 1
fi

echo "installed $count pyfars skills into $dst"
