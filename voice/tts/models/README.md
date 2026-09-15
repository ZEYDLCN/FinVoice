# Piper ses modeli

Bu klasöre bir Piper ses modeli (`*.onnx` + `*.onnx.json`) yerleştirin —
binary olduğu ve onlarca MB olduğu için repoya commit edilmedi.

## İndirme (normal ortamlarda — Hugging Face erişimi olan)

```bash
python -m piper.download_voices tr_TR-dfki-medium --download-dir voice/tts/models
```

## İndirme (Hugging Face'in engellendiği ortamlarda)

Bu projenin geliştirildiği bazı sandbox ortamlarında `huggingface.co`
erişimi engellidir (bkz. `voice/README.md`'deki faster-whisper notu). Piper
projesinin eski (v0.0.2 - v1.0.0 arası) sürümleri ses modellerini doğrudan
GitHub release asset'i olarak da barındırıyordu — bu URL'ler genellikle
huggingface.co'dan farklı bir politikaya tabidir:

```bash
curl -L -o /tmp/voice.tar.gz \
  https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-us-lessac-low.tar.gz
tar xzf /tmp/voice.tar.gz -C voice/tts/models
```

Bu, modern `piper-tts` (>=1.8) Python paketiyle uyumludur — bu repoda
gerçek sentezleme ile doğrulandı (bkz. `voice/tests/test_synthesizer_real.py`).

## Ortam değişkeni

```bash
export FINVOICE_VOICE_PIPER_VOICE_PATH=voice/tts/models/tr_TR-dfki-medium.onnx
```
