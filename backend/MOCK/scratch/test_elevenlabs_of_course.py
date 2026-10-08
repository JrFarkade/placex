import os
import sys
import io
import wave
import httpx
import av
import numpy as np
from dotenv import load_dotenv

def main():
    # Load .env
    env_path = os.path.join(os.path.dirname(__file__), '..', 'placex_files', '.env')
    load_dotenv(env_path, override=True)

    api_key = os.getenv('ELEVENLABS_API_KEY')
    voice_id = os.getenv('ELEVENLABS_VOICE_ID')

    if not api_key:
        print("[ERROR] ELEVENLABS_API_KEY is not set in .env")
        sys.exit(1)
    if not voice_id:
        print("[ERROR] ELEVENLABS_VOICE_ID is not set in .env")
        sys.exit(1)

    print("=" * 60)
    print("ElevenLabs Standalone Direct TTS Validation")
    print("=" * 60)
    print(f"Voice ID: {voice_id}")
    print(f"Model ID: eleven_flash_v2_5")
    print(f"Input Text: \"Of course!\"")
    print("=" * 60)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    payload = {
        "text": "Of course!",
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8
        }
    }

    print("\n[1] Sending direct HTTP POST request to ElevenLabs...")
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(url, json=payload, headers=headers)

    print(f"HTTP Status: {resp.status_code} {resp.reason_phrase}")
    print(f"Content-Type: {resp.headers.get('content-type')}")

    if resp.status_code != 200:
        print(f"[ERROR] API call failed: {resp.text}")
        sys.exit(1)

    raw_bytes = resp.content
    raw_byte_length = len(raw_bytes)
    print(f"Raw response byte length: {raw_byte_length} bytes")

    # [2] Decode audio via PyAV (validates MP3 container, headers, and audio frame decoding)
    print("\n[2] Validating and decoding audio stream...")
    audio_container = av.open(io.BytesIO(raw_bytes))
    audio_stream = audio_container.streams.audio[0]
    
    sample_rate = audio_stream.codec_context.sample_rate
    channels = audio_stream.codec_context.channels
    format_name = audio_container.format.name
    codec_name = audio_stream.codec_context.name

    print(f"  Container Format: {format_name}")
    print(f"  Codec: {codec_name}")
    print(f"  Sample Rate: {sample_rate} Hz")
    print(f"  Channels: {channels}")

    # Decode frames to PCM
    pcm_chunks = []
    total_samples = 0
    for frame in audio_container.decode(audio_stream):
        # Convert to numpy array (s16le or float)
        array = frame.to_ndarray()
        pcm_chunks.append(array)
        total_samples += frame.samples

    if not pcm_chunks:
        print("[ERROR] No audio frames could be decoded!")
        sys.exit(1)

    # Combine all decoded samples
    all_audio = np.concatenate(pcm_chunks, axis=1) if len(pcm_chunks[0].shape) > 1 else np.concatenate(pcm_chunks)
    duration_s = total_samples / sample_rate

    # Convert to 16-bit PCM for WAV export
    if all_audio.dtype != np.int16:
        if np.issubdtype(all_audio.dtype, np.floating):
            int16_audio = (np.clip(all_audio, -1.0, 1.0) * 32767).astype(np.int16)
        else:
            int16_audio = all_audio.astype(np.int16)
    else:
        int16_audio = all_audio

    # Flatten/interleave if multi-channel
    if channels == 1:
        pcm_bytes = int16_audio.flatten().tobytes()
    else:
        pcm_bytes = int16_audio.T.flatten().tobytes()

    # Calculate audio energy / RMS to verify it's not silent
    audio_float = int16_audio.astype(np.float32) / 32768.0
    rms = np.sqrt(np.mean(audio_float ** 2))
    peak = np.max(np.abs(audio_float))
    non_zero_ratio = np.count_nonzero(int16_audio) / int16_audio.size

    print(f"  Decoded Total Samples: {total_samples}")
    print(f"  Calculated Duration: {duration_s:.3f} s")
    print(f"  RMS Amplitude: {rms:.4f}")
    print(f"  Peak Amplitude: {peak:.4f}")
    print(f"  Non-Zero Sample Ratio: {non_zero_ratio * 100:.1f}%")

    # [3] Save to WAV in execution/
    execution_dir = os.path.join(os.path.dirname(__file__), '..', 'execution')
    os.makedirs(execution_dir, exist_ok=True)
    wav_path = os.path.normpath(os.path.join(execution_dir, 'elevenlabs_of_course.wav'))

    with wave.open(wav_path, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)

    wav_size = os.path.getsize(wav_path)
    print(f"\n[3] Saved WAV file:")
    print(f"  Path: {wav_path}")
    print(f"  WAV File Size: {wav_size} bytes")

    # Verify WAV file can be read by standard wave module
    with wave.open(wav_path, 'rb') as check_wav:
        w_ch = check_wav.getnchannels()
        w_sw = check_wav.getsampwidth()
        w_fr = check_wav.getframerate()
        w_nframes = check_wav.getnframes()
        w_dur = w_nframes / float(w_fr)
        print(f"  WAV Verification: {w_ch} ch, {w_sw * 8}-bit, {w_fr} Hz, {w_nframes} frames ({w_dur:.3f}s) -> VALID")

    # [4] Final Verdict
    print("\n" + "=" * 60)
    if raw_byte_length > 0 and total_samples > 0 and rms > 0.01:
        print("VERDICT: REAL AUDIO (Valid voice payload generated successfully)")
    else:
        print("VERDICT: EMPTY OR CORRUPT PAYLOAD")
    print("=" * 60)

if __name__ == '__main__':
    main()
