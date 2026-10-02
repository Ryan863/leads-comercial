import os
import sys
import subprocess

def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    
    python_cmd = venv_python if os.path.exists(venv_python) else sys.executable

    print(f"[*] Iniciando Sondar Scraper Backend via: {python_cmd}")
    print("[*] Servidor rodando em: http://127.0.0.1:8000")
    print("[*] Documentação interativa Swagger: http://127.0.0.1:8000/docs")

    cmd = [python_cmd, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    try:
        subprocess.run(cmd, cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n[*] Servidor encerrado.")

if __name__ == "__main__":
    main()
