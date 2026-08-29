# Client — talking to a running engine

The client surface is the way out-of-process callers (the CLI, bridges hosted in other processes, federation peers) reach a running `EngineProgram`.
Every call goes through the polity's UDS socket at `<root>/.pyfars/run.sock`.

## UDS

::: pyfars.client.uds
