"""Unit tests for AzureBlobStorageProvider.

The Azure SDK is stubbed in sys.modules before any provider import so these
tests run even when the azure-storage-blob package is not installed.
"""
from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub the azure SDK before any provider import
# ---------------------------------------------------------------------------

def _stub_azure() -> None:
    if "azure" not in sys.modules:
        fake_azure = ModuleType("azure")
        fake_storage = ModuleType("azure.storage")
        fake_blob = ModuleType("azure.storage.blob")
        fake_blob.BlobServiceClient = MagicMock()  # type: ignore[attr-defined]
        fake_blob.generate_blob_sas = MagicMock(return_value="sas_token")  # type: ignore[attr-defined]
        fake_blob.BlobSasPermissions = MagicMock()  # type: ignore[attr-defined]
        fake_blob.ContentSettings = MagicMock()  # type: ignore[attr-defined]
        fake_core = ModuleType("azure.core")
        fake_core_exc = ModuleType("azure.core.exceptions")
        fake_core_exc.ResourceExistsError = Exception  # type: ignore[attr-defined]
        fake_core_exc.ResourceNotFoundError = Exception  # type: ignore[attr-defined]
        sys.modules["azure"] = fake_azure
        sys.modules["azure.storage"] = fake_storage
        sys.modules["azure.storage.blob"] = fake_blob
        sys.modules["azure.core"] = fake_core
        sys.modules["azure.core.exceptions"] = fake_core_exc
        # Wire up attribute references expected by Python's import machinery
        fake_azure.storage = fake_storage  # type: ignore[attr-defined]
        fake_storage.blob = fake_blob  # type: ignore[attr-defined]
        fake_azure.core = fake_core  # type: ignore[attr-defined]
        fake_core.exceptions = fake_core_exc  # type: ignore[attr-defined]


_stub_azure()

from app.modules.files.exceptions import (  # noqa: E402
    FileStorageConfigurationError,
    FileStorageUploadError,
)


_SETTINGS_PATH = "app.core.config.get_settings"


def _make_settings(
    connection_string: str = "valid-conn-str",
    container: str = "test",
    account_name: str = "testacct",
    sas_expire_minutes: int = 10,
) -> MagicMock:
    settings = MagicMock()
    settings.AZURE_STORAGE_CONNECTION_STRING = connection_string
    settings.AZURE_STORAGE_CONTAINER_NAME = container
    settings.AZURE_STORAGE_ACCOUNT_NAME = account_name
    settings.FILE_DOWNLOAD_SAS_EXPIRE_MINUTES = sas_expire_minutes
    return settings


# ---------------------------------------------------------------------------
# Configuration validation
# ---------------------------------------------------------------------------


def test_raises_configuration_error_for_change_me_key() -> None:
    from app.modules.files.storage.azure_blob import AzureBlobStorageProvider

    mock_settings = _make_settings(connection_string="change_me")

    with patch(_SETTINGS_PATH, return_value=mock_settings):
        with pytest.raises(FileStorageConfigurationError):
            AzureBlobStorageProvider()


def test_raises_configuration_error_for_empty_key() -> None:
    from app.modules.files.storage.azure_blob import AzureBlobStorageProvider

    mock_settings = _make_settings(connection_string="")

    with patch(_SETTINGS_PATH, return_value=mock_settings):
        with pytest.raises(FileStorageConfigurationError):
            AzureBlobStorageProvider()


# ---------------------------------------------------------------------------
# upload_file
# ---------------------------------------------------------------------------


def test_upload_calls_blob_client() -> None:
    from app.modules.files.storage.azure_blob import AzureBlobStorageProvider

    mock_settings = _make_settings()

    mock_blob_service = MagicMock()
    mock_container_client = MagicMock()
    mock_blob_service.get_container_client.return_value = mock_container_client
    # The credential attr is accessed to get account_key
    mock_blob_service.credential.account_key = "fake-key"

    blob_module = sys.modules["azure.storage.blob"]
    blob_module.BlobServiceClient.from_connection_string = MagicMock(
        return_value=mock_blob_service
    )

    with patch(_SETTINGS_PATH, return_value=mock_settings):
        provider = AzureBlobStorageProvider()
        provider.upload_file("path/to/blob.pdf", b"file data", "application/pdf")

    mock_blob_service.get_container_client.assert_called_once_with("test")
    mock_container_client.upload_blob.assert_called_once()
    call_kwargs = mock_container_client.upload_blob.call_args
    assert call_kwargs.kwargs.get("name") == "path/to/blob.pdf" or call_kwargs.args[0] == "path/to/blob.pdf" or (
        # handle positional or keyword
        "path/to/blob.pdf" in str(call_kwargs)
    )


# ---------------------------------------------------------------------------
# delete_file
# ---------------------------------------------------------------------------


def test_delete_calls_delete_blob() -> None:
    from app.modules.files.storage.azure_blob import AzureBlobStorageProvider

    mock_settings = _make_settings()

    mock_blob_service = MagicMock()
    mock_blob_client = MagicMock()
    mock_blob_service.get_blob_client.return_value = mock_blob_client
    mock_blob_service.credential.account_key = "fake-key"

    blob_module = sys.modules["azure.storage.blob"]
    blob_module.BlobServiceClient.from_connection_string = MagicMock(
        return_value=mock_blob_service
    )

    with patch(_SETTINGS_PATH, return_value=mock_settings):
        provider = AzureBlobStorageProvider()
        provider.delete_file("path/to/blob.pdf")

    mock_blob_service.get_blob_client.assert_called_once_with(
        container="test", blob="path/to/blob.pdf"
    )
    mock_blob_client.delete_blob.assert_called_once_with(delete_snapshots="include")
