from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import get_settings


BLOCKED_HOSTS = {"localhost", "metadata.google.internal"}
BLOCKED_IPS = {ipaddress.ip_address("169.254.169.254")}
ALLOWED_CONTENT_TYPES = ("text/html", "text/plain", "application/xhtml+xml")


@dataclass
class FetchResult:
    url: str
    status_code: int
    content_type: str | None
    body: bytes


class UnsafeUrlError(ValueError):
    pass


def _resolve_public_ips(hostname: str) -> list[ipaddress._BaseAddress]:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise UnsafeUrlError("Unable to resolve URL host") from exc
    addresses = []
    for info in infos:
        raw = info[4][0]
        address = ipaddress.ip_address(raw)
        if not is_public_ip(address):
            raise UnsafeUrlError("URL resolves to a private or unsafe IP address")
        addresses.append(address)
    return addresses


def is_public_ip(address: ipaddress._BaseAddress) -> bool:
    if address in BLOCKED_IPS:
        return False
    return not (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def validate_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeUrlError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise UnsafeUrlError("URL host is required")
    hostname = parsed.hostname.lower().rstrip(".")
    if hostname in BLOCKED_HOSTS:
        raise UnsafeUrlError("Unsafe host is blocked")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        _resolve_public_ips(hostname)
    else:
        if not is_public_ip(address):
            raise UnsafeUrlError("Private or unsafe IP address is blocked")
    return url


def fetch_url(url: str) -> FetchResult:
    settings = get_settings()
    current = validate_url(url)
    headers = {
        "User-Agent": settings.DEEP_RESEARCH_USER_AGENT,
        "Accept": "text/html,text/plain,application/xhtml+xml",
    }
    timeout = float(settings.DEEP_RESEARCH_FETCH_TIMEOUT_SECONDS)
    max_bytes = int(settings.DEEP_RESEARCH_FETCH_MAX_BYTES)
    with httpx.Client(timeout=timeout, follow_redirects=False, headers=headers) as client:
        for _ in range(settings.DEEP_RESEARCH_MAX_REDIRECTS + 1):
            response = client.get(current)
            if response.is_redirect:
                location = response.headers.get("Location")
                if not location:
                    break
                current = validate_url(urljoin(current, location))
                continue
            content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if response.status_code >= 400:
                raise httpx.HTTPStatusError("Source returned an error", request=response.request, response=response)
            if content_type and content_type not in ALLOWED_CONTENT_TYPES:
                raise UnsafeUrlError("Unsupported content type")
            body = response.content[:max_bytes]
            return FetchResult(
                url=str(response.url),
                status_code=response.status_code,
                content_type=content_type or None,
                body=body,
            )
    raise UnsafeUrlError("Too many redirects")

