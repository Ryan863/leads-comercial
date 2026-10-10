import random
import re
from typing import Optional, Tuple

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1366, "height": 768},
]

STEALTH_JS = """
// Sobrescreve detecção de automação (navigator.webdriver)
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
});

// Emula plugins do Chrome
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});

// Emula idiomas comuns em navegadores brasileiros
Object.defineProperty(navigator, 'languages', {
    get: () => ['pt-BR', 'pt', 'en-US', 'en'],
});

// Mock da propriedade chrome.runtime
window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
};

// Evita detecção de headless pelo WebGL
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) {
        return 'Google Inc. (NVIDIA)';
    }
    if (parameter === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
    }
    return getParameter.apply(this, [parameter]);
};
"""

def get_random_user_agent() -> str:
    return random.choice(USER_AGENTS)

def get_random_viewport() -> dict:
    return random.choice(VIEWPORTS)

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

def clean_phone(raw: str, default_ddd: str = "") -> Tuple[str, bool]:
    """
    Limpa e valida números de telefone brasileiros com DDD válido (10 ou 11 dígitos),
    evitando números corrompidos, CEPs, CNPJs ou fragmentos.
    Se capturado sem DDD (8 ou 9 dígitos), aplica o default_ddd regional.
    No Brasil comercial/B2B, tanto celulares quanto telefones fixos operam WhatsApp Business.
    """
    if not raw:
        return ("", False)
    
    digits = re.sub(r"\D", "", raw)
    
    # Remove código 55 do início se presente
    if digits.startswith("55") and len(digits) in (12, 13):
        digits = digits[2:]
        
    # Remove zero inicial de discagem interurbana (ex: 071 9... ou 049 3...)
    if digits.startswith("0") and len(digits) in (11, 12):
        digits = digits[1:]
        
    # Se capturou número local sem DDD (8 ou 9 dígitos), aplica o DDD regional se fornecido
    clean_def_ddd = re.sub(r"\D", "", default_ddd or "")
    if len(digits) in (8, 9) and clean_def_ddd in VALID_DDDS:
        digits = f"{clean_def_ddd}{digits}"

    if len(digits) not in (10, 11):
        return ("", False)
        
    ddd = digits[:2]
    if ddd not in VALID_DDDS:
        return ("", False)
        
    if len(digits) == 11:
        # Celular no Brasil sempre começa com 9 após o DDD
        first_subscriber_digit = digits[2]
        if first_subscriber_digit != "9":
            return ("", False)
        formatted = f"({ddd}) {digits[2:7]}-{digits[7:]}"
    else:  # len(digits) == 10
        # Fixo no Brasil normalmente começa com 2, 3, 4 ou 5
        first_subscriber_digit = digits[2]
        if first_subscriber_digit not in ("2", "3", "4", "5"):
            return ("", False)
        formatted = f"({ddd}) {digits[2:6]}-{digits[6:]}"
        
    # Empresas e comércios no Brasil utilizam WhatsApp Business ativamente em números fixos e móveis
    return (formatted, True)

def classify_web_presence(website: Optional[str]) -> Tuple[str, Optional[str]]:
    """
    Classifica a presença online em:
    - 'none': Sem site (Alta prioridade comercial)
    - 'social': Usa link de Instagram/Facebook como site
    - 'site': Possui site institucional / domínio próprio
    """
    if not website or not website.strip():
        return ("none", None)
        
    url = website.strip().lower()
    
    social_domains = [
        "instagram.com", "facebook.com", "fb.com", "linktr.ee", 
        "bio.link", "wa.me", "api.whatsapp.com", "tiktok.com"
    ]
    
    for s in social_domains:
        if s in url:
            return ("social", website.strip())
            
    return ("site", website.strip())
