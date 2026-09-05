---
type: harness-config
harness: systemd-user
status: active
---

# systemd-user harness (Farston)

Farston activates the systemd-user harness with the harness default target (`.pyfars/harness-output/systemd-user/`) — a substrate-local staging directory.
Tests can verify the projection without writing to a host's actual systemd directory.

For real deployment to a Farston host, the operator copies the staged units into `~/.config/systemd/user/` and runs `systemctl --user daemon-reload`.
Or change `target:` to `~/.config/systemd/user` for in-place install.
