import asyncio
import urllib.parse
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        query = 'Estetica Automotiva em Caçador - SC'
        target_url = f'https://www.google.com/maps/search/{urllib.parse.quote_plus(query)}?hl=pt-BR'
        print(f"Navigating to {target_url}...")
        await page.goto(target_url, timeout=30000, wait_until='domcontentloaded')
        await asyncio.sleep(3)
        cards = await page.locator('a[href*="/maps/place/"]').all()
        print(f"Found cards count: {len(cards)}")
        for c in cards[:5]:
            label = await c.get_attribute('aria-label')
            print(f"Card: {label}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
