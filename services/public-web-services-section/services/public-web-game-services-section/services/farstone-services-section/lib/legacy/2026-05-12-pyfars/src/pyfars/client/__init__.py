"""Client — how a process talks to a running engine.

A client process opens the engine's UDS, exchanges cells, optionally
persists structured session state across reconnects, and (for federation
peers) exchanges convergence envelopes with other engines.
"""
