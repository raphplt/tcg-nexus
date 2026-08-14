"""Garde-fous SSRF sur les URLs candidates téléchargées par /match."""

from __future__ import annotations

import ipaddress
import os
import socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}

MAX_DOWNLOAD_BYTES = int(os.getenv("VISION_MAX_DOWNLOAD_BYTES", 10 * 1024 * 1024))

_ALLOWED_HOSTS = {
    host.strip().lower()
    for host in os.getenv("VISION_ALLOWED_HOSTS", "").split(",")
    if host.strip()
}


class UnsafeUrlError(ValueError):
    pass


def _is_public_address(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    # link_local couvre 169.254.169.254 (métadonnées cloud)
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def assert_safe_url(url: str) -> None:
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeUrlError(f"Schéma non autorisé : {parsed.scheme!r}")

    host = parsed.hostname
    if not host:
        raise UnsafeUrlError("URL sans hôte")

    if _ALLOWED_HOSTS and host.lower() not in _ALLOWED_HOSTS:
        raise UnsafeUrlError(f"Hôte non autorisé : {host!r}")

    try:
        infos = socket.getaddrinfo(host, parsed.port or 0, proto=socket.IPPROTO_TCP)
    except socket.gaierror as error:
        raise UnsafeUrlError(f"Hôte non résolu : {host!r}") from error

    # toutes les IP résolues doivent être publiques : un seul enregistrement
    # pointant vers le réseau interne suffirait à contourner le contrôle
    for info in infos:
        address = info[4][0]
        if not _is_public_address(address):
            raise UnsafeUrlError(f"Adresse interne refusée : {address}")
