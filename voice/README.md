# voice — Faz 3: VAD + STT

Ses işleme boru hattı: konuşma algılama (Silero VAD) → sessizliği kırpma →
metne çevirme (faster-whisper). `frontend/`'in Faz 2'deki mikrofon
göstergesinden farklı olarak burası **gerçek** transcript üreten servistir.

```text
audio (wav/webm/ogg/...) → 16kHz mono PCM → Silero VAD → speech segments
                                                              │
                                              en baştaki/sondaki sessizlik kırpılır
                                                              ▼
                                                     faster-whisper → transcript
```

## Neden torch yok?

Silero VAD'ın resmi `pip install silero-vad` paketi zorunlu olarak
`torch` + `torchaudio` (CPU'da bile ~550MB) ister — sadece ~1MB'lık bir ONNX
modelini çalıştırmak için. Bunun yerine:

- `vad/models/silero_vad_16k.onnx` — Silero'nun resmi, değiştirilmeden
  vendor edilmiş 16kHz ONNX ağırlığı (MIT lisans, bkz. `vad/models/LICENSE`).
- `vad/silero.py` + `vad/segmenter.py` — modelin ONNX I/O sözleşmesini ve
  `get_speech_timestamps` algoritmasını sıfırdan, yalnızca `onnxruntime` +
  `numpy` ile yeniden yazan bir port (kaynak: snakers4/silero-vad, MIT).
  `voice/vad/silero.py`'nin başındaki yorum tam I/O şemasını belgeler.

`faster-whisper` zaten CTranslate2 tabanlı olduğu için torch gerektirmiyor —
bu sayede tüm `voice/` servisi torch'suz, hafif bir kurulumla çalışıyor.

## Çalıştırma

```bash
cd FinVoice   # repo kökü — modül importları `voice.xxx` şeklinde köke göre
python -m venv voice/.venv && source voice/.venv/bin/activate
pip install -r voice/requirements.txt
uvicorn voice.service.app:app --reload --port 8100
```

Swagger UI: http://localhost:8100/docs

Örnek çağrı:

```bash
curl -X POST http://localhost:8100/v1/transcribe -F "file=@ornek.wav"
```

```json
{
  "text": "poliçe numaramı sorgulamak istiyorum",
  "language": "tr",
  "vadSegments": [{ "startMs": 120, "endMs": 2430 }],
  "vadLatencyMs": 18,
  "sttLatencyMs": 210,
  "totalLatencyMs": 228
}
```

Konuşma algılanmazsa (`vadSegments: []`) STT hiç çalıştırılmaz — boşuna
inference maliyeti ödenmez (bkz. ana spesifikasyon §6).

## Whisper modeli hakkında

`faster-whisper`, ilk kullanımda seçilen modeli (`FINVOICE_VOICE_WHISPER_MODEL`,
varsayılan `tiny`) Hugging Face Hub'dan indirir ve `~/.cache/huggingface`
altında önbelleğe alır. **Bu indirme için internet erişimi gereklidir** —
bazı kısıtlı/sanal ağ ortamlarında (ör. bu projenin geliştirildiği bazı
CI/agent sandbox'ları) `huggingface.co`'ya erişim engellenmiş olabilir; bu
durumda servis `FINVOICE_VOICE_STT_BACKEND=fake` ile (bkz. aşağı) sahte bir
transcript döndürerek geri kalan boru hattını (VAD, latency ölçümü, API
sözleşmesi) test etmeye devam eder.

## Ortam değişkenleri (`FINVOICE_VOICE_` prefix'i ile)

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `STT_BACKEND` | `faster-whisper` | `fake` → model indirmeden sahte transcript (test/CI) |
| `WHISPER_MODEL` | `tiny` | faster-whisper/CTranslate2 model adı (`tiny`, `base`, `small`, ...) |
| `WHISPER_LANGUAGE` | *(boş = otomatik algıla)* | ör. `tr`, `en` |
| `VAD_THRESHOLD` | `0.5` | konuşma eşiği |
| `VAD_MIN_SPEECH_DURATION_MS` | `250` | bundan kısa segmentler atılır |
| `VAD_MIN_SILENCE_DURATION_MS` | `100` | segment sonu için beklenecek sessizlik |
| `VAD_SPEECH_PAD_MS` | `30` | segment kenarlarına eklenen pay |

## Testler

```bash
cd FinVoice
source voice/.venv/bin/activate
pytest voice/                 # hızlı paket — gerçek Silero VAD, sahte STT
pytest voice/ -m slow         # + gerçek faster-whisper indirir ve çalıştırır
```

Varsayılan (`slow` hariç) paket **hiçbir model indirmeden** çalışır: Silero
VAD ağırlığı repo içinde vendor edilmiş, STT tarafı `FakeTranscriber` ile
test edilir. `-m slow` paketi gerçek `faster-whisper` transcription'ını
`tests/fixtures/sample_en.wav` (espeak-ng ile üretilmiş sentetik İngilizce
konuşma) üzerinde doğrular ve metinde "policy"/"active" kelimelerinin
geçtiğini kontrol eder — internet erişimi (Hugging Face Hub) gerektirir.

## Docker

Build context'i repo köküdür (voice/ tek başına değil, çünkü import'lar
`voice.xxx` şeklinde köke göre):

```bash
docker build -f voice/Dockerfile -t finvoice-voice .
# veya kök dizinden:
docker compose up --build voice
```

## Dizin yapısı

```text
voice/
├── audio_utils.py     # herhangi bir formatı (PyAV ile) 16kHz mono'ya çevirir
├── vad/
│   ├── models/
│   │   ├── silero_vad_16k.onnx   # vendored, MIT (silero-vad projesi)
│   │   └── LICENSE
│   ├── silero.py       # onnxruntime tabanlı model wrapper (state/context yönetimi)
│   └── segmenter.py    # get_speech_timestamps() — konuşma segmenti çıkarma
├── stt/
│   └── transcriber.py  # FasterWhisperTranscriber + FakeTranscriber
├── service/
│   ├── app.py           # FastAPI: POST /v1/transcribe
│   └── config.py
└── tests/
    ├── fixtures/         # sample_en.wav (espeak-ng), silence.wav
    ├── test_audio_utils.py
    ├── test_silero_vad.py
    ├── test_transcriber_fake.py
    ├── test_transcriber_real.py   # @pytest.mark.slow
    ├── test_service.py
    └── test_service_real.py       # @pytest.mark.slow
```

## Frontend entegrasyonu (sıradaki adım)

Bu servis şu an bağımsız çalışıyor; Faz 2'deki `useMicrophone` hook'u henüz
buraya bağlı değil (yalnızca ses seviyesi ölçüyor). Faz 4'te LangGraph agent
ile birlikte, frontend'in kaydettiği ses (MediaRecorder → webm/opus) bu
servise gönderilip dönen transcript agent'a girdi olarak verilecek.
