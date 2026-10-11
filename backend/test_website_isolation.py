import unittest
from scraper import extract_clean_website_url
from stealth import classify_web_presence

class TestWebsiteIsolation(unittest.TestCase):
    def test_clean_direct_website(self):
        url = "https://www.escolapetry.com.br"
        self.assertEqual(extract_clean_website_url(url), "https://www.escolapetry.com.br")

    def test_google_redirect_decoding(self):
        google_url = "https://www.google.com/url?q=https%3A%2F%2Fwww.escolapetry.com.br%2F&opi=89978449"
        self.assertEqual(extract_clean_website_url(google_url), "https://www.escolapetry.com.br/")

    def test_google_internal_urls_filtered(self):
        bad_urls = [
            "https://maps.google.com/maps/place/Escola+Petry",
            "https://www.google.com/maps/search/escolas",
            "https://www.google.com.br/maps",
            "https://maps.gstatic.com/tactile/pane",
            "https://waze.com/ul?ll=-27.0, -51.0",
            "https://goo.gl/maps/12345",
        ]
        for url in bad_urls:
            self.assertIsNone(extract_clean_website_url(url), f"Should filter: {url}")

    def test_invalid_and_empty_urls(self):
        self.assertIsNone(extract_clean_website_url(""))
        self.assertIsNone(extract_clean_website_url(None))
        self.assertIsNone(extract_clean_website_url("javascript:void(0)"))
        self.assertIsNone(extract_clean_website_url("not-a-url"))

    def test_classify_web_presence(self):
        self.assertEqual(classify_web_presence(None), ("none", None))
        self.assertEqual(classify_web_presence(""), ("none", None))
        self.assertEqual(
            classify_web_presence("https://www.instagram.com/escolapetry"),
            ("social", "https://www.instagram.com/escolapetry")
        )
        self.assertEqual(
            classify_web_presence("https://www.escolapetry.com.br"),
            ("site", "https://www.escolapetry.com.br")
        )

if __name__ == "__main__":
    unittest.main()
