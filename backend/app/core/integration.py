"""
Integration configuration for existing backend services
This module handles the integration between new FastAPI structure and existing services
"""

import sys
import os
from pathlib import Path

def setup_backend_path():
    """Add the backend directory to sys.path for importing existing modules"""
    # Get the backend directory (4 levels up from this file)
    current_file = Path(__file__).resolve()
    backend_dir = current_file.parent.parent.parent.parent
    
    # Add to sys.path if not already present
    backend_str = str(backend_dir)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)
    
    return backend_dir

def get_config_path():
    """Get the path to the existing config.py file"""
    backend_dir = setup_backend_path()
    return backend_dir / "config.py"

def get_upload_directory():
    """Get the upload directory path"""
    backend_dir = setup_backend_path()
    upload_dir = backend_dir / "uploads"
    upload_dir.mkdir(exist_ok=True)
    return str(upload_dir)

# Setup path on import
setup_backend_path()