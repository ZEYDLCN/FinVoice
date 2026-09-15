# voice — Faz 3 (VAD + STT) & Faz 5 (TTS)

Ses giriş/çıkış boru hattı: konuşma algılama (Silero VAD) → sessizliği
kırpma → metne çevirme (faster-whisper) ve tersi yönde, metni sese çevirme
(Piper). `frontend/`'in Faz 2'deki mikrofon göstergesinden farklı olarak
burası **gerçek** transcript ve **gerçek** ses üreten servistir.

```text
STT yönü:
audio (wav/webm/ogg/...) → 16kHz mono PCM → Silero VAD → speech segments
                                                              │
                                              en baştaki/sondaki sessizlik kırpılır
                                                              ▼
                                                     faster-whisper → transcript

TTS yönü:
text → Piper → WAV audio
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

`faster-whisper` zaten CTranslate2 tabanlı olduğu için torch gerektirmiyor,
`piper-tts` de kendi espeak-ng phonemizer'ını ve onnxruntime tabanlı
vocoder'ını bir arada getiriyor (yine torch yok) — bu sayede tüm `voice/`
servisi torch'suz, hafif bir kurulumla çalışıyor.

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

Metni sese çevirme:

```bash
curl -X POST http://localhost:8100/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hasar kaydınız oluşturuldu. Dosya numaranız CLM-98221."}' \
  -o cevap.wav
```

Yanıt gövdesi doğrudan `audio/wav`'dır; latency ve üretilen sesin süresi
header'larda döner: `X-TTS-Latency-Ms`, `X-TTS-Duration-S`.

## Piper ses modeli hakkında

`piper-tts`'in resmi indirici aracı (`python -m piper.download_voices`)
modelleri Hugging Face Hub'dan çeker — `FINVOICE_VOICE_STT_BACKEND` ile
aynı kısıtlamaya tabi (bkz. aşağı). Bu nedenle ses modeli de repoya vendor
edilmedi (tek bir ses için bile onlarca MB). Kurulum ve alternatif indirme
yolu (bu sandbox'ta gerçekten doğrulanmış GitHub release URL'i dahil) için
[`voice/tts/models/README.md`](./tts/models/README.md)'ye bakın.
`FINVOICE_VOICE_TTS_BACKEND=fake` ile model olmadan da API'yi ayağa
kaldırabilirsiniz (sessiz bir WAV döner).

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
| `TTS_BACKEND` | `piper` | `fake` → model yüklemeden sessiz WAV (test/CI) |
| `PIPER_VOICE_PATH` | `voice/tts/models/tr_TR-dfki-medium.onnx` | `.onnx` ses model dosyasının yolu |

## Testler

```bash
cd FinVoice
source voice/.venv/bin/activate
pytest voice/                 # hızlı paket — gerçek Silero VAD, sahte STT
pytest voice/ -m slow         # + gerçek faster-whisper indirir ve çalıştırır
```

Varsayılan (`slow` hariç) paket **hiçbir model indirmeden** çalışır: Silero
VAD ağırlığı repo içinde vendor edilmiş, STT tarafı `FakeTranscriber`, TTS
tarafı `FakeSynthesizer` ile test edilir. `-m slow` paketi:

- gerçek `faster-whisper` transcription'ını `tests/fixtures/sample_en.wav`
  (espeak-ng ile üretilmiş sentetik İngilizce konuşma) üzerinde doğrular ve
  metinde "policy"/"active" kelimelerinin geçtiğini kontrol eder — Hugging
  Face Hub erişimi gerektirir.
- gerçek Piper sentezlemesini doğrular: bir ses modelini (bkz. yukarı) ilk
  seferde indirip `voice/.piper_cache/` altında önbelleğe alır, sonra
  gerçek sesin sessiz olmadığını (`max amplitude > 1000`) kontrol eder —
  GitHub erişimi gerektirir. **Bu testler bu projenin geliştirildiği
  sandbox'ta gerçekten çalıştırılıp geçti** (Hugging Face'in aksine
  GitHub release indirmeleri bu ortamda engellenmemişti).

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
├── tts/
│   ├── models/
│   │   └── README.md    # ses modeli indirme talimatları (vendor edilmedi)
│   └── synthesizer.py    # PiperSynthesizer + FakeSynthesizer
├── service/
│   ├── app.py           # FastAPI: POST /v1/transcribe, POST /v1/synthesize
│   └── config.py
└── tests/
    ├── fixtures/         # sample_en.wav (espeak-ng), silence.wav
    ├── conftest.py        # piper_voice_path fixture (GitHub'dan indirir+önbelleğe alır)
    ├── test_audio_utils.py
    ├── test_silero_vad.py
    ├── test_transcriber_fake.py
    ├── test_transcriber_real.py   # @pytest.mark.slow
    ├── test_synthesizer_fake.py
    ├── test_synthesizer_real.py   # @pytest.mark.slow
    ├── test_service.py
    └── test_service_real.py       # @pytest.mark.slow
```

## Frontend / Agent entegrasyonu (sıradaki adım)

Bu servis şu an bağımsız çalışıyor. Faz 2'deki `useMicrophone` hook'u henüz
buraya bağlı değil (yalnızca ses seviyesi ölçüyor) ve `backend/`'deki Faz 4
agent'ı henüz bu servisi çağırmıyor. Kalan kablolama:

1. Frontend: mikrofonun kaydettiği ses (MediaRecorder → webm/opus) buraya
   `POST /v1/transcribe` ile gönderilip dönen `text`, `backend/`'in
   `POST /v1/chat`'ine iletilecek.
2. `backend/`'in döndürdüğü `reply` metni buraya `POST /v1/synthesize` ile
   gönderilip dönen WAV, frontend'de oynatılacak.

Bu, ROADMAP.md'nin mimari diyagramındaki tam döngüyü (Mic → VAD → STT →
Agent → TTS → Speaker) kapatan son kablolama adımıdır — Faz 1-5'in her biri
bağımsız olarak çalışır ve test edilmiş durumda; eksik olan yalnızca
bunları birbirine bağlayan orkestrasyon (frontend tarafında, ya da ayrı bir
"realtime gateway" katmanında).
