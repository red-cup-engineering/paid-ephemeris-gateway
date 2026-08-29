---
name: test dummy bob
description: Synthetic test-fixture character under codi-obrien's nested substrate; not part of any polity character roster. Used for exercising session-with-character round-trips without writing into real character spaces.
agency:
  - agent: writer-of-a-diary-entry
    defaults:
      character: test-dummy-bob
      dir: doing/governing/characters/codi-obrien/doing/governing/characters/test-dummy-bob/diary
  - agent: writer-of-a-retrospective-diary-entry
    defaults:
      character: test-dummy-bob
      dir: doing/governing/characters/codi-obrien/doing/governing/characters/test-dummy-bob/turn-retrospectives
  - agent: writer-of-a-prospective-diary-entry
    defaults:
      character: test-dummy-bob
      dir: doing/governing/characters/codi-obrien/doing/governing/characters/test-dummy-bob/turn-prospectives
  - getter-of-the-name-of-this-thing
  - installer-of-a-character-as-a-claude-configuration
---

# test-dummy-bob

Test fixture.
Lives nested under codi-obrien's substrate replica — codi maintains test fixtures here for exercising the harness without polluting real character records.

The agency declares one agent (`writer-of-a-diary-entry`) pre-parameterized to write into this character's own diary subdirectory.
Add or remove agency entries here when exercising other agents through the character-session ingress.
