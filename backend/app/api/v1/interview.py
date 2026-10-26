from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.interview_service.services.interview_service import InterviewService

router = APIRouter(prefix="/interview", tags=["Interview Intelligence"])

@router.post("/start")
def start_interview(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    interview_type = payload.get("interview_type", "Technical")
    target_company = payload.get("target_company", "")
    role = payload.get("role", "")
    difficulty = payload.get("difficulty", "")
    domain_interests = payload.get("domain_interests", [])

    return InterviewService.start_session(
        db=db,
        user_id=current_user.id,
        interview_type=interview_type,
        target_company=target_company,
        role=role,
        difficulty=difficulty,
        domain_interests=domain_interests
    )

@router.post("/answer")
def submit_answer(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session_id = payload.get("session_id", 1)
    question = payload.get("question", "")
    answer_text = payload.get("answer_text", "")
    duration_sec = float(payload.get("duration_sec", 0.0))

    return InterviewService.evaluate_response(
        db=db,
        session_id=session_id,
        question=question,
        answer_text=answer_text,
        duration_sec=duration_sec
    )

@router.post("/finish")
def finish_interview(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session_id = payload.get("session_id", 1)
    return InterviewService.finish_session(db=db, session_id=session_id)

@router.get("/simli-session")
def get_simli_session():
    import os, requests
    simli_key = os.getenv("SIMLI_API_KEY", "").strip()
    face_id = os.getenv("SIMLI_FACE_ID", "cace3ef7-a4c4-425d-a8cf-a5358eb0c427").strip()
    if not simli_key:
        return {"available": False, "error": "SIMLI_API_KEY not configured"}
    try:
        tok_res = requests.post(
            "https://api.simli.ai/compose/token",
            json={"faceId": face_id, "handleSilence": True, "maxSessionLength": 600, "maxIdleTime": 30},
            headers={"x-simli-api-key": simli_key},
            timeout=5
        )
        ice_res = requests.get(
            "https://api.simli.ai/compose/ice",
            headers={"x-simli-api-key": simli_key},
            timeout=5
        )
        if not tok_res.ok:
            return {"available": False, "error": tok_res.text}
        return {
            "available": True,
            "session_token": tok_res.json().get("session_token"),
            "ice_servers": ice_res.json() if ice_res.ok else [],
            "face_id": face_id
        }
    except Exception as e:
        return {"available": False, "error": str(e)}

@router.post("/tts")
def interview_tts(payload: dict = Body(...)):
    import os, requests
    from fastapi.responses import Response
    text = (payload.get("text") or "").strip()
    if not text:
        return Response(content="Text required", status_code=400)
    eleven_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = payload.get("voice_id") or os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
    if not eleven_key:
        return Response(content="ELEVENLABS_API_KEY not configured", status_code=400)
    try:
        r = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"Content-Type": "application/json", "xi-api-key": eleven_key},
            json={"text": text, "model_id": "eleven_flash_v2_5", "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}},
            timeout=10
        )
        if not r.ok:
            return Response(content=r.text, status_code=r.status_code)
        return Response(content=r.content, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        return Response(content=str(e), status_code=500)

@router.post("/teardown")
def teardown_interview(
    payload: dict = Body(default={}),
    current_user = Depends(get_current_user)
):
    InterviewService._kill_port_7860()
    return {"status": "ok"}

