# rag — Faz 6: Kurumsal Doküman Arama (RAG)

PDF poliçe/ürün dokümanlarından, yapılandırılmış API'lerle (mock-enterprise,
Faz 1) cevaplanamayan sorular için ilgili metin parçalarını getiren
retrieval servisi. **Bu servis bir LLM çağırmaz** — yalnızca arama yapar;
dönen parçaları nihai cevaba çeviren `backend/`'deki agent'tır (Faz 4,
`search_policy_documents` tool'u ile).

```text
PDF → Text Extraction → Chunking → Embedding → FAISS → Retriever
                                                            │
                                          "İlgili metin parçaları" (LLM'e değil, agent'a döner)
```

## Neden sentence-transformers değil, TF-IDF?

ROADMAP.md'nin orijinal planı `sentence-transformers` idi. Ama bu paket
zorunlu olarak `torch` ister ve modeli Hugging Face Hub'dan indirir — bu
projenin başka hiçbir yerinde olmayan iki şey (voice/'da torch yok; bu
projenin geliştirildiği sandbox `huggingface.co`'yu engelliyor, bkz.
`voice/README.md`, `backend/README.md`). Bunun yerine **varsayılan backend
karakter n-gram TF-IDF**'tir (`scikit-learn`, indirme yok, torch yok):

- Türkçe eklemeli bir dil olduğu için ("kart" / "kartımı" / "kartından" aynı
  kökü paylaşır ama aynı kelime token'ı değildir) kelime düzeyinde TF-IDF
  bu eşleşmeleri kaçırır. 3-5 karakterlik n-gram'lar ortak kökü (ek olmadan)
  yakalar — kökbulma (stemmer) gerektirmeyen, eklemeli diller için bilinen
  bir teknik.
- `embeddings/sentence_transformer.py`'de gerçek, çalışan bir alternatif
  backend de var — Hugging Face erişimi olan ortamlarda
  `FINVOICE_RAG_EMBEDDING_BACKEND=sentence-transformers` ile kullanılabilir
  (ek olarak `pip install sentence-transformers` gerekir — varsayılan
  `requirements.txt`'e dahil edilmedi, torch getirmesin diye).

Bu, `voice/`'daki "torch yok" ilkesiyle tutarlı, bilinçli bir mimari karar —
gizlenmedi, `embeddings/tfidf.py`'nin başındaki yorumda gerekçesiyle
yazılı.

## Örnek dokümanlar

`documents/` altındaki 3 PDF, mock-enterprise'ın sentetik verisiyle tutarlı,
bu proje için yazılmış **sentetik** içerik (gerçek sigorta/banka şartları
değil):

- `kasko_sartlari.pdf` — 7 madde: teminat kapsamı, ikame araç, doğal afet
  istisnası, manevi tazminat istisnası, hasarsızlık indirimi, hasar bildirim
  süresi, eksper süreci
- `kart_sozlesmesi.pdf` — 5 madde: kayıp/çalıntı bildirimi, yeni kart teslim
  süresi, yurt dışı işlem ücreti, gecikme faizi, ek kart
- `sss.pdf` — 5 soru-cevap

`documents/generate_sample_docs.py` ile yeniden üretilebilir (içeriği
düzenleyip script'i tekrar çalıştırın). PDF'ler Türkçe karakterler için
vendor edilmiş bir font kullanır: `assets/fonts/DejaVuSans.ttf` (MIT benzeri
Bitstream Vera lisansı, bkz. `assets/fonts/LICENSE`).

## Çalıştırma

```bash
cd FinVoice
python -m venv rag/.venv && source rag/.venv/bin/activate
pip install -r rag/requirements.txt
uvicorn rag.service.app:app --reload --port 8300
```

İlk istek indeksi kurar (birkaç PDF için milisaniyeler sürer, model indirme
yok). Örnek çağrı:

```bash
curl -X POST http://localhost:8300/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Yurt dışında kartımı kullanırsam ek ücret alınır mı?"}'
```

```json
{
  "results": [
    {
      "text": "Kartımı yurt dışında kullanabilir miyim? Evet, kartlar yurt dışında kullanıma açıktır. ...",
      "source": "sss.pdf",
      "score": 0.605
    },
    {
      "text": "3. Yurt Dışı İşlem Ücreti Yurt dışında gerçekleştirilen POS ve online alışverişlerde ... %2,5 ...",
      "source": "kart_sozlesmesi.pdf",
      "score": 0.317
    }
  ]
}
```

Bu tam olarak bu sandbox'ta çalıştırılıp doğrulanmış gerçek bir sonuçtur.

## Ortam değişkenleri (`FINVOICE_RAG_` prefix'i ile)

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `EMBEDDING_BACKEND` | `tfidf` | `sentence-transformers` → semantik (torch + HF indirme gerekir) |
| `SENTENCE_TRANSFORMER_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | yalnızca `sentence-transformers` backend'inde |
| `DOCUMENTS_DIR` | `rag/documents` | indekslenecek PDF klasörü |
| `TOP_K` | `3` | istek başına döndürülecek sonuç sayısı (varsayılan) |

## Testler

```bash
cd FinVoice
source rag/.venv/bin/activate
pytest rag/                 # tamamı gerçek — model indirme yok
pytest rag/ -m slow         # + gerçek sentence-transformers (ekstra pip install + HF erişimi gerekir)
```

Bu fazın testleri, projenin diğer fazlarından farklı olarak **hiçbir "fake"
gerektirmez**: TF-IDF hiçbir model indirmediği için varsayılan test paketi
zaten uçtan uca gerçek çalışır — gerçek PDF'ler, gerçek metin çıkarma,
gerçek chunking, gerçek embedding, gerçek FAISS index, gerçek Türkçe
sorgular (ör. "İkame araç kaç gün sağlanır?" → `kasko_sartlari.pdf`'in
doğru maddesini buluyor mu?).

## Dizin yapısı

```text
rag/
├── documents/
│   ├── generate_sample_docs.py   # PDF'leri üreten script
│   ├── kasko_sartlari.pdf, kart_sozlesmesi.pdf, sss.pdf
├── assets/fonts/                 # DejaVuSans (Türkçe karakterler için, vendored)
├── ingestion/
│   ├── pdf_loader.py              # extract_text()
│   └── chunker.py                  # chunk_text() — başlık/soru tabanlı, sezgisel
├── embeddings/
│   ├── base.py                     # Embedder Protocol
│   ├── tfidf.py                     # varsayılan (karakter n-gram TF-IDF)
│   └── sentence_transformer.py      # opsiyonel (torch + HF indirme)
├── retriever/
│   ├── models.py                    # Chunk, SearchResult
│   ├── store.py                      # FaissVectorStore
│   └── retriever.py                   # PolicyRetriever (build_index, query)
├── service/
│   ├── app.py                        # FastAPI: POST /v1/search
│   └── config.py
└── tests/
```

## Agent entegrasyonu

`backend/tools/rag_tools.py`'deki `search_policy_documents` tool'u bu
servisi çağırır ve Faz 4 agent'ının tool listesine eklenmiştir (bkz.
`backend/tools/registry.py`, `backend/agents/prompts.py`). Agent, basit
teminat sorularında `check_policy_coverage`'ı, sözleşme metni gerektiren
sorularda bu tool'u kullanacak şekilde yönlendirildi.
