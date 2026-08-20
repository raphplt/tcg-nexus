import socket
import unittest
from unittest.mock import patch

from app import url_guard
from app.url_guard import UnsafeUrlError, _is_public_address, assert_safe_url


class TestUrlGuard(unittest.TestCase):
    def test_is_public_address(self):
        self.assertTrue(_is_public_address("8.8.8.8"))
        self.assertTrue(_is_public_address("1.1.1.1"))

        # Private IPs
        self.assertFalse(_is_public_address("127.0.0.1"))
        self.assertFalse(_is_public_address("10.0.0.1"))
        self.assertFalse(_is_public_address("192.168.1.1"))
        self.assertFalse(_is_public_address("172.16.0.1"))

        # Cloud metadata service (169.254.169.254 link-local)
        self.assertFalse(_is_public_address("169.254.169.254"))

    def test_assert_safe_url_schemes(self):
        with self.assertRaises(UnsafeUrlError):
            assert_safe_url("ftp://example.com/image.png")

        with self.assertRaises(UnsafeUrlError):
            assert_safe_url("file:///etc/passwd")

    def test_assert_safe_url_missing_host(self):
        with self.assertRaises(UnsafeUrlError):
            assert_safe_url("http:///path/without/host")

    @patch("socket.getaddrinfo")
    def test_assert_safe_url_public_ip(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))
        ]
        # Should not raise
        assert_safe_url("https://example.com/card.png")

    @patch("socket.getaddrinfo")
    def test_assert_safe_url_internal_ip_blocked(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))
        ]
        with self.assertRaises(UnsafeUrlError) as ctx:
            assert_safe_url("https://localhost/secret")
        self.assertIn("interne", str(ctx.exception).lower())
    def test_is_public_address_ipv6(self):
        self.assertTrue(_is_public_address("2001:4860:4860::8888"))
        self.assertFalse(_is_public_address("::1"))
        self.assertFalse(_is_public_address("fd00::1"))
        self.assertFalse(_is_public_address("0.0.0.0"))
        self.assertFalse(_is_public_address("224.0.0.1"))

    def test_assert_safe_url_accepts_http_and_https(self):
        with patch("socket.getaddrinfo") as resolve:
            resolve.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))
            ]
            assert_safe_url("http://example.com/card.png")
            assert_safe_url("HTTPS://example.com/card.png")

    def test_assert_safe_url_unresolvable_host(self):
        with patch("socket.getaddrinfo", side_effect=socket.gaierror("nope")):
            with self.assertRaises(UnsafeUrlError) as ctx:
                assert_safe_url("https://does-not-exist.invalid/card.png")
        self.assertIn("résolu", str(ctx.exception))

    # A hostname resolving to several records is only safe if every one of them
    # is public: a single internal record would be enough to bypass the check.
    @patch("socket.getaddrinfo")
    def test_assert_safe_url_rejects_mixed_records(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 80)),
        ]
        with self.assertRaises(UnsafeUrlError):
            assert_safe_url("https://rebind.example/card.png")

    @patch("socket.getaddrinfo")
    def test_allowlist_rejects_unlisted_host(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))
        ]
        with patch.object(url_guard, "_ALLOWED_HOSTS", {"assets.tcgdex.net"}):
            assert_safe_url("https://assets.tcgdex.net/card.png")
            with self.assertRaises(UnsafeUrlError) as ctx:
                assert_safe_url("https://example.com/card.png")
        self.assertIn("Hôte non autorisé", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
