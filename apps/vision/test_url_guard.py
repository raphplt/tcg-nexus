import unittest
from unittest.mock import patch
import socket

from app.url_guard import assert_safe_url, UnsafeUrlError, _is_public_address


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


if __name__ == "__main__":
    unittest.main()
