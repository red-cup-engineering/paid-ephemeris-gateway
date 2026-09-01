"""Module entry point for the ``pyfars`` CLI dispatcher."""
import sys

from pyfars.apps.cli.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
