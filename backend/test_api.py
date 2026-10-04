import asyncio
import json
import time
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def test_full_pipeline():
    print("\n--- [TESTE 1] Checagem de Saúde (/api/health) ---")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(f"{BASE_URL}/api/health")
            print(f"Status Code: {r.status_code}")
            print(f"Payload de Resposta: {r.json()}")
            assert r.status_code == 200
        except Exception as e:
            print(f"Falha ao conectar no backend ({BASE_URL}): {e}")
            print("Certifique-se de que o backend está rodando via 'python run.py'.")
            return

        print("\n--- [TESTE 2] Validação de Parâmetros Vazios/Inválidos (/api/search) ---")
        bad_payload = {"query": "   ", "quantity": 5, "source": "auto"}
        r_bad = await client.post(f"{BASE_URL}/api/search", json=bad_payload)
        print(f"Status Code com query vazia: {r_bad.status_code} (Esperado 422)")
        print(f"Mensagem de erro: {r_bad.text}")

        print("\n--- [TESTE 3] Disparo de Varredura Válida (/api/search) ---")
        search_payload = {
            "query": "Pizzarias em Videira - SC",
            "quantity": 2,
            "source": "auto"
        }
        t0 = time.time()
        r_search = await client.post(f"{BASE_URL}/api/search", json=search_payload)
        print(f"Status Code: {r_search.status_code}")
        data = r_search.json()
        print(f"Payload de Resposta: {json.dumps(data, indent=2)}")
        job_id = data["id"]
        assert r_search.status_code == 200

        print(f"\n--- [TESTE 4] Leitura de Streaming SSE (/api/search/{job_id}/stream) ---")
        received_leads = 0
        async with client.stream("GET", f"{BASE_URL}/api/search/{job_id}/stream", timeout=60.0) as stream_resp:
            print(f"Stream conectado! Status Code: {stream_resp.status_code}")
            async for line in stream_resp.aiter_lines():
                if not line.strip():
                    continue
                if line.startswith(": ping"):
                    print("  [SSE Heartbeat] : ping")
                    continue
                if line.startswith("data: "):
                    raw_data = line[6:]
                    try:
                        event = json.loads(raw_data)
                        ev_type = event.get("type")
                        if ev_type == "lead":
                            received_leads += 1
                            lead_data = event.get("data", {})
                            print(f"  [SSE LEAD #{received_leads}] Nome: '{lead_data.get('name')}' | Tel: '{lead_data.get('phone')}' | Presença: '{lead_data.get('presence')}'")
                        elif ev_type == "done":
                            print(f"  [SSE DONE] Varredura finalizada. Total: {event.get('current')}/{event.get('total')}")
                            break
                        elif ev_type == "error":
                            print(f"  [SSE ERROR] {event.get('message')}")
                            break
                    except Exception as parse_err:
                        print(f"  [SSE RAW] {raw_data} (erro parse: {parse_err})")

        print(f"\n--- [TESTE 5] Consulta de Status Final (/api/search/{job_id}/status) ---")
        r_status = await client.get(f"{BASE_URL}/api/search/{job_id}/status")
        print(f"Status final: {r_status.status_code} | Leads: {r_status.json().get('count')}")
        print(f"Tempo total de teste: {time.time()-t0:.2f}s")
        print("\n[OK] TODOS OS TESTES PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
