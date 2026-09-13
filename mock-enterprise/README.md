# mock-enterprise

FinVoice Ops'un ileride geliştirilecek Voice Agent'ının (bkz. `ROADMAP.md` Faz 4)
çağıracağı **sahte kurumsal API'ler**. Gerçek bir core-banking / poliçe / hasar
yönetim sistemi yerine geçer; veriler process-in-memory tutulur (kalıcı değildir,
servis her yeniden başladığında seed veriyle sıfırlanır).

## Çalıştırma

```bash
cd mock-enterprise
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Docker

```bash
docker compose up --build mock-enterprise
```

## Testler

```bash
pytest
```

## Endpoint özeti

| Servis   | Method & Path                                          | Açıklama                     |
|----------|----------------------------------------------------------|-------------------------------|
| Health   | `GET /health`                                            | Liveness check                |
| Customer | `GET /api/customers/{id}`                                | Müşteri sorgulama              |
| Customer | `GET /api/customers?q=`                                  | İsim/e-posta ile arama         |
| Policy   | `GET /api/policies/{policyNumber}`                       | Poliçe sorgulama                |
| Policy   | `GET /api/policies?customerId=`                          | Müşterinin poliçeleri            |
| Policy   | `GET /api/policies/{policyNumber}/coverage?topic=`       | Teminat kapsam kontrolü          |
| Claims   | `POST /api/claims`                                       | Hasar dosyası açma               |
| Claims   | `GET /api/claims/{claimId}`                              | Hasar durumu sorgulama            |
| Claims   | `GET /api/claims?policyNumber=`                          | Poliçenin hasar dosyaları          |
| Claims   | `PATCH /api/claims/{claimId}`                            | (demo) durum güncelleme            |
| Cards    | `GET /api/customers/{id}/cards`                          | Müşterinin kartları                 |
| Cards    | `POST /api/cards/{cardId}/freeze`                        | Kart dondurma (kayıp/çalıntı bildirimi) |
| Cards    | `POST /api/cards/{cardId}/request-replacement`           | Yeni kart talebi                     |
| Support  | `POST /api/support/tickets`                              | Destek kaydı oluşturma                |
| Support  | `GET /api/support/tickets/{ticketId}`                    | Destek kaydı sorgulama                 |

## Seed veri

`app/data/store.py` içindeki seed veri, ana `README.md`'deki örneklerle
(`TR-92831`, `Zeyd Alcan`, `Seat Leon`, `CLM-98221` ...) tutarlıdır ki demo
senaryoları dokümantasyonla birebir örtüşsün.

- Müşteriler: `CUST-001` (Zeyd Alcan, aktif kaskolu), `CUST-002` (Ayşe Yılmaz,
  süresi dolmuş poliçeli)
- Poliçeler: `TR-92831` (ACTIVE, FULL_CASCO), `TR-10442` (EXPIRED, THIRD_PARTY)
- Kartlar: `CARD-9001` (CUST-001), `CARD-9002` (CUST-002)
