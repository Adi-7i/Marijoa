from __future__ import annotations

from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """Abstract base class for file storage providers."""

    @abstractmethod
    def upload_file(self, blob_name: str, data: bytes, content_type: str) -> None: ...

    @abstractmethod
    def delete_file(self, blob_name: str) -> None: ...

    @abstractmethod
    def generate_download_url(self, blob_name: str, expires_minutes: int) -> str: ...
