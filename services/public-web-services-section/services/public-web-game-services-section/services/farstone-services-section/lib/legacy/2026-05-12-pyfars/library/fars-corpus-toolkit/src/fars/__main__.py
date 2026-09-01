"""``python -m corpus`` defers to the CLI dispatcher in ``fars.cli``."""
import sys

from fars.cli.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
