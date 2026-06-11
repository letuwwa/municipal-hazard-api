from .auth import router as auth_router
from .hazard_report import router as hazard_router

__all__ = ["auth_router", "hazard_router"]
