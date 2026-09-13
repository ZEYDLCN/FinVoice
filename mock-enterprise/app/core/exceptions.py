"""Shared domain exceptions and their HTTP mapping."""


class NotFoundError(Exception):
    """Raised when a requested entity does not exist."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ConflictError(Exception):
    """Raised when an operation cannot be completed due to entity state."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
