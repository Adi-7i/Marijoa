from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.modules.files.exceptions import (
    FileStorageConfigurationError,
    FileStorageDeleteError,
    FileStorageUploadError,
)
from app.modules.files.storage.base import StorageProvider

_storage_instance: StorageProvider | None = None


class AzureBlobStorageProvider(StorageProvider):
    """Azure Blob Storage implementation of StorageProvider."""

    def __init__(self) -> None:
        from azure.storage.blob import BlobServiceClient

        from app.core.config import get_settings

        settings = get_settings()
        conn_str = settings.AZURE_STORAGE_CONNECTION_STRING
        if not conn_str or conn_str == "change_me":
            raise FileStorageConfigurationError(
                "Azure Storage connection string is not configured"
            )
        self._client = BlobServiceClient.from_connection_string(conn_str)
        self._container = settings.AZURE_STORAGE_CONTAINER_NAME
        self._account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
        try:
            self._account_key = self._client.credential.account_key
        except AttributeError:
            self._account_key = None

    def upload_file(self, blob_name: str, data: bytes, content_type: str) -> None:
        from azure.core.exceptions import ResourceExistsError
        from azure.storage.blob import ContentSettings

        try:
            container_client = self._client.get_container_client(self._container)
            container_client.upload_blob(
                name=blob_name,
                data=data,
                content_settings=ContentSettings(content_type=content_type),
                overwrite=False,
            )
        except ResourceExistsError:
            raise FileStorageUploadError(
                "A file with this path already exists"
            ) from None
        except Exception:
            raise FileStorageUploadError("File upload to storage failed") from None

    def delete_file(self, blob_name: str) -> None:
        from azure.core.exceptions import ResourceNotFoundError as AzureNotFoundError

        try:
            blob_client = self._client.get_blob_client(
                container=self._container, blob=blob_name
            )
            blob_client.delete_blob(delete_snapshots="include")
        except AzureNotFoundError:
            pass  # Blob already gone, treat as success
        except Exception:
            raise FileStorageDeleteError(
                "Failed to delete file from storage"
            ) from None

    def generate_download_url(self, blob_name: str, expires_minutes: int) -> str:
        from azure.storage.blob import BlobSasPermissions, generate_blob_sas

        if not self._account_key:
            raise FileStorageConfigurationError(
                "Account key not available for SAS generation"
            )
        expiry = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
        sas_token = generate_blob_sas(
            account_name=self._account_name,
            container_name=self._container,
            blob_name=blob_name,
            account_key=self._account_key,
            permission=BlobSasPermissions(read=True),
            expiry=expiry,
        )
        return (
            "https://"
            + self._account_name
            + ".blob.core.windows.net/"
            + self._container
            + "/"
            + blob_name
            + "?"
            + sas_token
        )


def get_storage_provider() -> AzureBlobStorageProvider:
    """Creates a new AzureBlobStorageProvider instance per call (MVP pattern)."""
    return AzureBlobStorageProvider()
