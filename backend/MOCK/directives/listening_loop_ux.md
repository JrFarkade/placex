# PlaceX Live Brain — Listening Loop & Avatar UX Specification

**Document ID**: `directives/listening_loop_ux.md`  
**Status**: Draft / Specification Ready for Implementation  
**Audience**: Live Brain Pipeline Engineers, Avatar UX Developers  

---

## 1. Executive Summary

This directive defines the conversational UX, avatar micro-behaviors, and live feedback loops during the candidate's active speaking and listening turns. The objective is to eliminate robotic artifacting (uncanny stillness, instant sub-50ms mechanical replies, jittery interim captions) and create a natural, human-feeling interview environment without adding latency overhead to the core reasoning pipeline.

---

## 2. Avatar Idle & Listening Behavior

### 2.1 Continuous Looping Idle Base
* **State**: `AVATAR_IDLE_LISTENING`
* **Visual Characteristics**:
  * Seamless breathing cycles (subtle chest/shoulder movement, ~12-16 breaths/min).
  * Natural, unpatterned blink intervals (Poisson distribution with $\mu = 3.5\text{s}$, range 2.0s – 6.0s).
  * Centered, attentive eye contact with micro-saccades ($\pm 1.5^\circ$) to avoid an unnatural stare.
* **Stream Maintenance**:
  * Maintain continuous WebRTC video streaming from the avatar renderer at standard framerate (e.g. 25–30 FPS).
  * Transition from speech to idle must use cross-fade or keyframe-aligned blending without dropping frames.

---

## 3. VAD-Triggered Micro-Reactions & Backchanneling

### 3.1 Listening Micro-Reactions
To give the candidate real-time visual feedback that they are being heard while speaking:
* **Trigger**: Sustained candidate voice activity detected by Silero VAD ($\ge 2.5\text{s}$ continuous speech with confidence $> 0.85$).
* **Micro-Clips**:
  * **Attentive Nod (`NOD_SUBTLE`)**: 0.8s duration, single gentle down-up head movement.
  * **Head Tilt (`TILT_ENGAGED`)**: 1.2s duration, slight lateral angle change ($3^\circ$) held briefly.
  * **Affirmative Brow (`BROW_RAISE_BRIEF`)**: 0.4s duration, slight brow elevation during technical explanations.
* **Throttling & Guardrails**:
  * **Cooldown**: Minimum 6.0s between any two micro-reactions.
  * **Max Per Turn**: At most 2 micro-reactions per candidate monologue turn.
  * **Suppression**: Immediately abort or skip if candidate stops speaking or if barge-in occurs.

---

## 4. Deliberately Variable Response Timing (Conversational Pacing)

### 4.1 The Uncanny "Zero-Latency" Problem
Instantaneous responses (sub-100ms between candidate silence and interviewer speech) feel mechanical and break conversational immersion. Conversely, unmanaged delays $> 2.0\text{s}$ feel sluggish.

### 4.2 Conversational Jitter Model
When the candidate finishes their turn (VAD silence threshold reached):
* **Pacing Delay Window**: Inject a controlled cognitive pause delay:
  $$\Delta t_{\text{pause}} = \text{Base} + \text{RandomJitter} + \text{ComplexityWeight}$$
* **Parameters**:
  * **Short Answers / Confirmations**: $300\text{ms} - 500\text{ms}$ delay.
  * **Complex Architecture / Rubric Follow-ups**: $600\text{ms} - 900\text{ms}$ delay.
* **Pre-computation**:
  * LLM generation and TTS synthesis continue in parallel during this buffer window.
  * Audio playback to the candidate is released precisely when the jitter timer expires, ensuring zero buffer stalls while maintaining organic conversational timing.

---

## 5. Live Captions Synced to VAD & Utterance Boundaries

### 5.1 The Problem with Raw STT Partials
Raw STT partial frames emit rapidly fluctuating hypotheses, causing visual word flickering, text jumping, and distracting redraws in the candidate UI.

### 5.2 VAD-Aligned Caption Smoothing
1. **Candidate Speech (Live Input Captions)**:
   * **Buffering**: Accumulate STT interim words into an active phrase buffer.
   * **Commit Condition**: Render stable word clusters on word-final timestamps rather than raw token stream events.
   * **Finalization**: When VAD signals turn completion (`stop_secs = 0.3s`), finalize the caption bubble with smooth CSS opacity transition.
2. **Interviewer Speech (Avatar Output Captions)**:
   * Synchronized with ElevenLabs word-level alignment timestamps.
   * Render in bounded sentence chunks (max 12 words per line) matching the avatar's lip-sync progress.

---

## 6. Pipeline Integration & Hand-off

```
[Candidate Audio] ──> [Silero VAD] ────┬──> [Micro-Reaction Selector] ──> [Avatar Video (Simli/Renderer)]
                         │              │
                         │              └──> [Caption Smoother] ───────> [UI Live Captions]
                         │
                         └──> [Deepgram STT] ──> [LLM] ──> [Pacing Jitter] ──> [ElevenLabs TTS] ──> [Avatar LipSync]
```

* **Implementation Phase**: To be routed for full pipeline implementation in Pipecat once core connectivity smoke tests are validated.
