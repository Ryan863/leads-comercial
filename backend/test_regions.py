import asyncio
import urllib.parse
import re
import sys
from typing import Optional

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from playwright.async_api import async_playwright

VALID_DDDS = {
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48", "49",
    "51", "53", "54", "55",
    "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "71", "73", "74", "75", "77", "79",
    "81", "82", "83", "84", "85", "86", "87", "88", "89",
    "91", "92", "93", "94", "95", "96", "97", "98", "99"
}

def clean_phone_smart(raw: str, default_ddd: str = "49") -> tuple[str, bool]:
    if not raw:
        return ("", False)
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("55") and len(digits) in (12, 13):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) in (11, 12):
        digits = digits[1:]
    # Se capturou número local sem DDD (8 ou 9 dígitos), aplica o DDD regional
    if len(digits) in (8, 9) and default_ddd in VALID_DDDS:
        digits = f"{default_ddd}{digits}"
    if len(digits) not in (10, 11):
        return ("", False)
    ddd = digits[:2]
    if ddd not in VALID_DDDS:
        return ("", False)
    if len(digits) == 11:
        formatted = f"({ddd}) {digits[2:7]}-{digits[7:]}"
    else:
        formatted = f"({ddd}) {digits[2:6]}-{digits[6:]}"
    return (formatted, True)

async def extract_phone_from_page(page, card_text="", default_ddd="49"):
    # 1. Busca em atributos explicitos no painel de detalhes
    phone_candidates = []
    
    # a) data-item-id contendo phone:tel:
    for el in await page.locator('[data-item-id*="phone:tel:"]').all():
        item_id = await el.get_attribute("data-item-id") or ""
        match = re.search(r"phone:tel:([0-9+]+)", item_id)
        if match:
            phone_candidates.append(match.group(1))
            
    # b) a[href^="tel:"]
    for el in await page.locator('a[href^="tel:"]').all():
        href = await el.get_attribute("href") or ""
        phone_candidates.append(re.sub(r"^tel:", "", href))
        
    # c) aria-label contendo Telefone:
    for el in await page.locator('[aria-label*="Telefone:"], [aria-label*="telefone:"]').all():
        aria = await el.get_attribute("aria-label") or ""
        phone_candidates.append(aria)
        
    # d) Elementos de texto na seção de informações do painel
    for el in await page.locator('button[data-tooltip*="telefone" i], button[data-tooltip*="Telefone"], div[data-item-id*="phone"]').all():
        txt = await el.inner_text()
        if any(c in txt for c in "0123456789"):
            phone_candidates.append(txt)
        aria = await el.get_attribute("aria-label") or ""
        if any(c in aria for c in "0123456789"):
            phone_candidates.append(aria)

    # e) Fallback: se o card_text tiver número explícito
    if card_text:
        match_card = re.findall(r"(?:\(?0?[1-9]{2}\)?\s*)?(?:9\s*)?[2-9]\d{3}[-\s]\d{4}", card_text)
        for m in match_card:
            phone_candidates.append(m)

    # Processa os candidatos com clean_phone_smart
    for cand in phone_candidates:
        formatted, is_wpp = clean_phone_smart(cand, default_ddd)
        if formatted:
            return formatted, is_wpp

    return "", False

async def test_region(query: str, default_ddd: str):
    print(f"\n=======================================================", flush=True)
    print(f"TESTANDO: {query} (DDD padrão: {default_ddd})", flush=True)
    print(f"=======================================================", flush=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        target_url = f'https://www.google.com/maps/search/{urllib.parse.quote_plus(query)}?hl=pt-BR'
        await page.goto(target_url, timeout=30000, wait_until='domcontentloaded')
        await asyncio.sleep(2)
        
        cards = await page.locator('div.Nv2PK').all()
        print(f"Cards encontrados: {len(cards)}", flush=True)
        
        for i, card in enumerate(cards[:3]):
            link_el = card.locator('a.hfpxzc, a[href*="/maps/place/"]').first
            name = await link_el.get_attribute('aria-label')
            card_text = await card.inner_text()
            
            await link_el.click()
            await asyncio.sleep(1.2)
            
            phone, is_wpp = await extract_phone_from_page(page, card_text, default_ddd)
            print(f"  [{i+1}] {name} -> Telefone: '{phone}' | WhatsApp: {is_wpp}", flush=True)
            
        await browser.close()

async def main():
    await test_region('Pizzarias em Videira - SC', '49')
    await test_region('Clínicas em Caçador - SC', '49')
    await test_region('Restaurantes em Moema - SP', '11')

if __name__ == '__main__':
    asyncio.run(main())
