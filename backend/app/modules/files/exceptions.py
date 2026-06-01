from __future__ import annotations

from app.core.exceptions import AppException


class FileValidationError(AppException):
    """Raised when an uploaded file fails validation checks (type, size, name)."""

    def __init__(self, message: str) -> None:
        super().__init__(
            code="FILE_VALIDATION_ERROR",
            message=message,
            status_code=400,
        )


class FileStorageConfigurationError(AppException):
    """Raised when the storage backend is not properly configured."""

    def __init__(self, message: str = "Storage backend is not properly configured") -> None:
        super().__init__(
            code="FILE_STORAGE_CONFIGURATION_ERROR",
            message=message,
            status_code=503,
        )


class FileStorageUploadError(AppException):
    """Raised when a file upload to the storage backend fails."""

    def __init__(self, message: str = "File upload to storage failed") -> None:
        super().__init__(
            code="FILE_STORAGE_UPLOAD_ERROR",
            message=message,
            status_code=503,
        )


class FileStorageDeleteError(AppException):
    """Raised when a file deletion from the storage backend fails."""

    def __init__(self, message: str = "Failed to delete file from storage") -> None:
        super().__init__(
            code="FILE_STORAGE_DELETE_ERROR",
            message=message,
            status_code=503,
        )
