#!/usr/bin/env python3
"""Compatibility entry point. Uses the transactional, manifest-backed updater."""
from update_reference import main
if __name__ == '__main__':
    raise SystemExit(main())
