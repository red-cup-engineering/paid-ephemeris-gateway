"""Web bridge — FastAPI HTTP proxy over the engine's UDS.

A thin proxy by design: every HTTP endpoint is one ``pyfars.client.uds``
call. Browser inspection at ``/``, OpenAPI schema at ``/openapi.json``,
Swagger UI at ``/docs``.

    from pyfars.programs import WebBridge

    bridge = WebBridge(Path("/path/to/directory"), port=8000)
    await bridge.run()
"""
from pyfars.programs.web.bridge import WebBridge

__all__ = ["WebBridge"]
