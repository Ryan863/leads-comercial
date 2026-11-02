import sys
import logging

logger = logging.getLogger("KeepAwake")

# Constantes da Win32 API SetThreadExecutionState
ES_SYSTEM_REQUIRED = 0x00000001
ES_DISPLAY_REQUIRED = 0x00000002
ES_USER_PRESENT = 0x00000004
ES_AWAYMODE_REQUIRED = 0x00000040
ES_CONTINUOUS = 0x80000000


class WindowsKeepAwake:
    """
    Gerenciador de energia para prevenir suspensão/hibernação automática no Windows.
    Permite que o usuário saia de casa e deixe o PC ligado com o processo ativo.
    """

    def __init__(self):
        self.is_active = False

    def enable(self) -> bool:
        """Ativa a prevenção de suspensão do sistema."""
        if sys.platform != "win32":
            logger.info("[KEEP-AWAKE] Sistema operacional não-Windows. Suspensão contínua não aplicável.")
            return False

        try:
            import ctypes
            # Tenta com Away Mode (permite desligar a tela sem suspender a CPU)
            flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED
            prev = ctypes.windll.kernel32.SetThreadExecutionState(flags)
            if prev == 0:
                # Caso o hardware não suporte Away Mode, ativa apenas SYSTEM_REQUIRED
                flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED
                ctypes.windll.kernel32.SetThreadExecutionState(flags)

            self.is_active = True
            logger.info("🛡️ [KEEP-AWAKE] Prevenção de suspensão do Windows ATIVADA (ES_SYSTEM_REQUIRED).")
            return True
        except Exception as exc:
            logger.warning(f"⚠️ [KEEP-AWAKE] Falha ao invocar SetThreadExecutionState: {exc}")
            return False

    def disable(self) -> bool:
        """Restaura o estado normal de economia de energia do Windows."""
        if sys.platform != "win32" or not self.is_active:
            return False

        try:
            import ctypes
            ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
            self.is_active = False
            logger.info("🔓 [KEEP-AWAKE] Estado normal de energia do Windows RESTAURADO.")
            return True
        except Exception as exc:
            logger.warning(f"⚠️ [KEEP-AWAKE] Falha ao desativar prevenção de suspensão: {exc}")
            return False


# Instância global reutilizável
keep_awake = WindowsKeepAwake()

