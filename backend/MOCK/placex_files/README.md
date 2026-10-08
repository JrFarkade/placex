# PlaceX Live Brain — real-time pipeline

One candidate session = one Pipecat pipeline. Each stage is a separate,
swappable processor, which is what keeps this from becoming a tangle as
more people touch it.

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
pipecat run bot.py
```

You'll need accounts for: Google AI Studio (Gemini), Deepgram, ElevenLabs,
Simli, and Daily — every one of these has a free tier or free trial credit,
so the whole pipeline is runnable at $0 before you decide anything needs to
be paid.

## Pipeline shape

```
transport.input()
  -> stt                    (Deepgram — swap for Whisper here only)
  -> behavioral_tagger       (parallel tap, never blocks the loop)
  -> user_aggregator
  -> llm                     (Gemini — Live Brain reasoning)
  -> tts                     (ElevenLabs — streaming, word timestamps)
  -> simli                   (avatar audio+video, synced to tts output)
  -> transport.output()
  -> assistant_aggregator
```

## Ownership split (so branches don't collide)

| Stage | File | Owns |
|---|---|---|
| STT | `bot.py` (stt block) | Whisper vs Deepgram decision, transcription quality |
| Behavioral signals | `behavioral_tagger.py` | Filler/pause detection, feeds Scoring Brain |
| Live Brain logic | `bot.py` (system prompt, context) | Question flow, prompt engineering |
| TTS | `bot.py` (tts block) | Voice quality, latency tuning |
| Avatar | `bot.py` (simli block) | Simli vs HeyGen vs D-ID vs Three.js decision |

## Free-tier roadmap

Build in this order — each milestone is fully testable on free tiers before
you add the next cost center, so you never pay for a piece you haven't
validated yet.

**1. Text-only Live Brain** — Gemini API only, no transport/voice/avatar.
Run the interview logic as a plain script, print candidate turns, validate
the prompt/question flow. Cost: $0 on the Gemini Flash free tier.

**2. Add voice, no avatar** — wire in Deepgram STT + ElevenLabs TTS, talk
to the Live Brain out loud, skip `simli` in the pipeline for now. Deepgram's
$200 credit comfortably covers weeks of team testing. ElevenLabs is the
tight one: the free tier is ~10 minutes of audio a month on the
Multilingual model. Switch the TTS model to `eleven_flash_v2_5` — it costs
about half the credits per character and is lower-latency anyway, which you
want for a real-time interviewer regardless of price. Confirm the exact
constructor kwarg in Pipecat's ElevenLabs docs before wiring it in.

**3. Add the avatar** — bring `simli` back into the pipeline. $10 signup
credit plus 50 free minutes/month, roughly 2–3 full mock-interview sessions
before you'd spend anything.

**4. Add Daily transport for real multi-person testing** — 10,000 free
participant-minutes/month is generous enough that this is very unlikely to
be your bottleneck; most teams hit the ElevenLabs or Simli ceiling first.

**Bottleneck order, cheapest to run out first:** ElevenLabs free minutes,
then Simli free minutes, then Deepgram's $200, then Daily's 10K minutes.
Gemini Flash has no quota ceiling on the free tier. Budget your testing
cadence accordingly — a handful of full end-to-end sessions a week will
exhaust ElevenLabs before anything else.

Each of these maps to its own branch/milestone. Because they're separate
processors, two people can rebuild the STT stage and the avatar stage in
parallel without touching each other's code — the contract between them is
just "frames go in, frames come out unchanged in shape."

## Next milestone

Wire the Prep Brain's per-question JSON blueprint into
`INTERVIEWER_SYSTEM_PROMPT` / the `LLMContext` messages, so the Live Brain
follows the actual generated question bank instead of a static prompt.
