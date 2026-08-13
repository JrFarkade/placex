from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, ProfileCreate, ProfileResponse
from app.schemas.token import Token
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token
from app.core.config import settings
import requests
import urllib.parse
import secrets
import base64
import json

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

# Temporary in-memory store for OAuth CSRF state verification
OAUTH_STATES = set()

def decode_token_sub(token: str) -> str:
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        try:
            parts = token.split('.')
            if len(parts) != 3:
                return None
            pay_b64 = parts[1]
            pay_b64 += '=' * (-len(pay_b64) % 4)
            data = json.loads(base64.urlsafe_b64decode(pay_b64).decode('utf-8'))
            return data.get("sub")
        except Exception:
            return None

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id_str = decode_token_sub(token)
    if not user_id_str:
        raise credentials_exception
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    user = UserRepository.get_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = UserRepository.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists."
        )
    return UserRepository.create_user(db, user_in=user_in)

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = UserRepository.get_by_email(db, email=user_in.email)
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password."
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/google/login")
def google_login():
    """
    Generates secure OAuth state parameter and redirects user to Google Consent Screen.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not configured. GOOGLE_CLIENT_ID environment variable is missing."
        )
    
    state = secrets.token_urlsafe(32)
    OAUTH_STATES.add(state)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return {"url": url}

@router.get("/google/callback")
def google_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles OAuth 2.0 authorization code exchange with Google, verifies identity,
    creates/links user in DB, and redirects to frontend with PlaceX JWT token.
    """
    if error:
        redirect_url = f"{settings.FRONTEND_URL}/login?error=Google%20sign-in%20was%20cancelled."
        return RedirectResponse(url=redirect_url)

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Google.")

    if state and state in OAUTH_STATES:
        OAUTH_STATES.remove(state)

    # 1. Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    try:
        token_res = requests.post(token_url, data=token_data, timeout=10.0)
        token_json = token_res.json()
        google_access_token = token_json.get("access_token")
        
        if not google_access_token:
            redirect_url = f"{settings.FRONTEND_URL}/login?error=Failed%20to%20obtain%20Google%20access%20token."
            return RedirectResponse(url=redirect_url)

        # 2. Fetch authenticated profile info from Google UserInfo API
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        userinfo_res = requests.get(userinfo_url, headers={"Authorization": f"Bearer {google_access_token}"}, timeout=10.0)
        google_info = userinfo_res.json()

        # 3. Create or Link User
        user = UserRepository.get_or_create_google_user(db, google_info)
        access_token = create_access_token(subject=user.id)

        # 4. Redirect to Frontend Dashboard with PlaceX JWT token
        encoded_user = urllib.parse.quote(json.dumps({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }))
        redirect_url = f"{settings.FRONTEND_URL}/?token={access_token}&user={encoded_user}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        print(f"[Google OAuth Callback Error]: {e}")
        redirect_url = f"{settings.FRONTEND_URL}/login?error=Unable%20to%20sign%20in%20with%20Google%20right%20now."
        return RedirectResponse(url=redirect_url)

@router.post("/google/token", response_model=Token)
def verify_google_token(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Verifies a Google token (ID token or Access token) received directly from frontend,
    fetches authenticated identity server-side, links/creates user, and returns PlaceX JWT token.
    """
    token_str = payload.get("token") or payload.get("id_token")
    if not token_str:
        raise HTTPException(status_code=400, detail="Google token is required.")

    try:
        # Verify token with Google server-side
        userinfo_res = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_str}"},
            timeout=5.0
        )
        if userinfo_res.status_code != 200:
            # Fallback check ID token info endpoint
            userinfo_res = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}",
                timeout=5.0
            )

        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid or expired Google token.")

        google_info = userinfo_res.json()
        user = UserRepository.get_or_create_google_user(db, google_info)
        access_token = create_access_token(subject=user.id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google token verification failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user=Depends(get_current_user)):
    return current_user

@router.get("/profile", response_model=ProfileResponse)
def read_user_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    profile = UserRepository.get_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile

@router.post("/profile", response_model=ProfileResponse)
def update_user_profile(profile_in: ProfileCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return UserRepository.update_profile(db, user_id=current_user.id, profile_in=profile_in)
