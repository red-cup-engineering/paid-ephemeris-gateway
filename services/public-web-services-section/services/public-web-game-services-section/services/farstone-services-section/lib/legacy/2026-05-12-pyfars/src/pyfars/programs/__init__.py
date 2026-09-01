"""Programs — concrete program-frame classes layered above the SDK.

A program is a process executing FARS operators on a system (FARS
theory: ``concepts/program.md``). This package collects the program
classes pyfars ships:

  - ``Program`` — abstract base. Lifecycle: validate → boot → run →
    halt.

  - ``EngineProgram`` — the polity's long-running engine. UDS server
    + closure-and-dispatch tick loop. One per directory.

  - ``LoadDirectoryProgram`` — one-shot program that walks a directory,
    projects each file to cells, emits per-file witnesses, returns a
    loaded :class:`System`. The cold-start program: load-directory +
    one or more materializer programs run before the engine attaches.

  - ``MaterializerProgram`` — one-shot system→directory materializer.
    ``ServiceMaterializerProgram`` adds supervisor handoff;
    ``NixFlakeMaterializerProgram`` is the concrete nix-flake form.

  - ``HarnessProgram`` — long-running agentic-loop scaffolding. Drives
    one persona-agent through one assignment with auth-gated tool
    calls, witness-per-step, substrate-readable termination. The
    runtime that integrates pydantic_ai with the substrate's tool
    surface and office authority.

  - ``ScriptProgram`` — one-shot subprocess enactment. Spawned by the
    dispatch tick when an Assignment names an agent whose ``Agent.type``
    is ``automated-process``.

  - ``BridgeProgram`` — long-running bidirectional protocol-translator.
    ``FederationProgram`` is PyFARS↔PyFARS native federation;
    ``ActivityPubBridge`` and ``A2ABridge`` are federation-bridges to
    external protocols (vocabulary-translating, lossy); ``McpBridge``
    serves system operations as MCP tools; ``WebBridge`` exposes the
    engine's UDS surface as HTTP for browser inspection;
    ``IdentityProviderBridge`` hosts the polity's OAuth Authorization
    Server (the bridge whose protocol *issues* credentials others verify).
"""
from pyfars.programs.a2a import A2ABridge
from pyfars.programs.activitypub import ActivityPubBridge
from pyfars.programs.base import Program, ProgramResult, ProgramRootInvalid
from pyfars.programs.bridge import BridgeProgram
from pyfars.programs.engine import EngineProgram
from pyfars.programs.federation import FederationProgram
from pyfars.programs.harness import HarnessProgram, HarnessResult
from pyfars.programs.harness_materializer import (
    HarnessLoadError,
    HarnessMaterializerProgram,
    list_harnesses,
    load_harness,
)
from pyfars.programs.identity import IdentityProviderBridge
from pyfars.programs.load_directory import LoadDirectoryProgram
from pyfars.programs.materializer import (
    HandoffCommand,
    MaterializerEmission,
    MaterializerProgram,
    MaterializerResult,
    ServiceMaterializerProgram,
    materializer_jinja_env,
)
from pyfars.programs.mcp import McpBridge
from pyfars.programs.nix_flake_materializer import NixFlakeMaterializerProgram
from pyfars.programs.openclaw import OpenClawWorkspaceMaterializer
from pyfars.programs.script import ScriptProgram, ScriptResult
from pyfars.programs.web import WebBridge

__all__ = [
    "A2ABridge",
    "ActivityPubBridge",
    "BridgeProgram",
    "EngineProgram",
    "FederationProgram",
    "HandoffCommand",
    "HarnessLoadError",
    "HarnessMaterializerProgram",
    "HarnessProgram",
    "HarnessResult",
    "IdentityProviderBridge",
    "list_harnesses",
    "load_harness",
    "LoadDirectoryProgram",
    "MaterializerEmission",
    "MaterializerProgram",
    "MaterializerResult",
    "McpBridge",
    "NixFlakeMaterializerProgram",
    "OpenClawWorkspaceMaterializer",
    "Program",
    "ProgramResult",
    "ProgramRootInvalid",
    "ScriptProgram",
    "ScriptResult",
    "ServiceMaterializerProgram",
    "WebBridge",
    "materializer_jinja_env",
]
