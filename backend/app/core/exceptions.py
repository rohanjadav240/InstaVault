"""Custom exception classes for InstaVault."""

from fastapi import HTTPException, status


class InstaVaultException(Exception):
    """Base exception for InstaVault."""

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(self.message)


class ArchiveValidationError(InstaVaultException):
    """Raised when archive validation fails."""
    pass

ValidationError = ArchiveValidationError


class ZipBombError(ArchiveValidationError):
    """Raised when a potential zip bomb is detected."""
    pass


class PathTraversalError(ArchiveValidationError):
    """Raised when path traversal is detected in archive."""
    pass


class FileTooLargeError(ArchiveValidationError):
    """Raised when file exceeds size limits."""
    pass


class TooManyFilesError(ArchiveValidationError):
    """Raised when archive has too many files."""
    pass


class ParsingError(InstaVaultException):
    """Raised when parsing fails."""
    pass


class ProcessingError(InstaVaultException):
    """Raised when processing fails."""
    pass


class ExportError(InstaVaultException):
    """Raised when export generation fails."""
    pass


# HTTP Exceptions as convenience functions
def not_found(detail: str = "Resource not found") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def bad_request(detail: str = "Bad request") -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def forbidden(detail: str = "Not enough permissions") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def conflict(detail: str = "Resource already exists") -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def server_error(detail: str = "Internal server error") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )
