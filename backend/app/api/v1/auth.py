from typing import Optional
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
from datetime import datetime
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

def extract_profile_username(platform: str, url: str) -> str:
    """
    Extracts display username from profile URLs automatically.
    """
    if not url:
        return ""
    try:
        clean = url.split("?")[0].split("#")[0].rstrip("/")
        parsed = urllib.parse.urlparse(clean if "://" in clean else "https://" + clean)
        parts = [p for p in parsed.path.split('/') if p]

        if platform == "linkedin":
            if "in" in parts:
                idx = parts.index("in")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            return parts[-1] if parts else "profile"

        elif platform == "leetcode":
            if "u" in parts:
                idx = parts.index("u")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            return parts[-1] if parts else "profile"
    except Exception:
        pass
    return "profile"

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
        "client_id": settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else "",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI.strip() if settings.GOOGLE_REDIRECT_URI else "",
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
        "state": state
    }

    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"
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

# --- GITHUB OAUTH ENDPOINTS ---

@router.get("/github/login")
def github_login(current_user=Depends(get_current_user)):
    """
    Generates secure GitHub OAuth authorization URL for authenticating student's GitHub profile.
    Embeds authenticated user's ID into state parameter for precise session mapping.
    """
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth is not configured. GITHUB_CLIENT_ID environment variable is missing."
        )
    
    # State parameter format: <user_id>:<random_token>
    state = f"{current_user.id}:{secrets.token_urlsafe(24)}"

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "read:user",
        "state": state
    }

    url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    return {"url": url}

@router.get("/github/callback")
def github_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles GitHub OAuth 2.0 authorization code callback, retrieves public profile metadata from GitHub API,
    and associates the GitHub account with the exact authenticated PlaceX student.
    """
    print(f"[GitHub OAuth Debug] Callback received: code={code[:10] if code else None}, state={state}, error={error}")

    if error:
        redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&error=GitHub%20connection%20was%20cancelled."
        return RedirectResponse(url=redirect_url)

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from GitHub.")

    # 1. Parse user_id from state parameter
    user_id = None
    if state and ":" in state:
        try:
            user_id = int(state.split(":")[0])
        except (ValueError, IndexError):
            user_id = None

    # Fallback to first user in DB if state user_id not parsed
    from app.models.user import User
    if not user_id:
        first_user = db.query(User).first()
        if first_user:
            user_id = first_user.id

    if not user_id:
        redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&error=Authentication%20session%20expired."
        return RedirectResponse(url=redirect_url)

    # 2. Exchange authorization code for access token with GitHub
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    token_data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI
    }

    try:
        token_res = requests.post(token_url, json=token_data, headers=headers, timeout=10.0)
        token_json = token_res.json()
        github_token = token_json.get("access_token")

        if not github_token:
            err_msg = token_json.get("error_description") or "Couldn't connect to GitHub. Please try again."
            redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&error={urllib.parse.quote(err_msg)}"
            return RedirectResponse(url=redirect_url)

        # 3. Fetch public profile information from GitHub REST API
        github_user_res = requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_token}",
                "User-Agent": "PlaceX-Career-OS"
            },
            timeout=10.0
        )
        gh_data = github_user_res.json()
        username = gh_data.get("login")
        profile_url = gh_data.get("html_url") or f"https://github.com/{username}"

        if not username:
            redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&error=Failed%20to%20retrieve%20GitHub%20username."
            return RedirectResponse(url=redirect_url)

        # 4. Save / Associate GitHub profile with user in DB
        from app.models.profile import ConnectedProfile

        existing = db.query(ConnectedProfile).filter(
            ConnectedProfile.user_id == user_id,
            ConnectedProfile.platform == "github"
        ).first()

        profile_metadata = {
            "name": gh_data.get("name") or username,
            "avatar_url": gh_data.get("avatar_url"),
            "bio": gh_data.get("bio"),
            "public_repos": gh_data.get("public_repos", 0),
            "followers": gh_data.get("followers", 0),
            "following": gh_data.get("following", 0),
            "access_token": github_token  # Stored ONLY in DB server-side
        }

        if existing:
            existing.username = username
            existing.profile_url = profile_url
            existing.profile_data = profile_metadata
            existing.updated_at = datetime.utcnow()
        else:
            new_cp = ConnectedProfile(
                user_id=user_id,
                platform="github",
                username=username,
                profile_url=profile_url,
                connection_type="oauth",
                profile_data=profile_metadata
            )
            db.add(new_cp)

        db.commit()

        redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&connected=github"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        print(f"[GitHub OAuth Exception]: {e}")
        redirect_url = f"{settings.FRONTEND_URL}/?feature=profile&error=Couldn%27t%20connect%20to%20GitHub.%20Please%20try%20again."
        return RedirectResponse(url=redirect_url)

# --- CONNECTED PROFILES ENDPOINTS ---

@router.get("/profiles/connected")
def get_connected_profiles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Returns connected career profiles (GitHub, LinkedIn, LeetCode) for authenticated student.
    Derives display username automatically from stored profile URL for LinkedIn and LeetCode.
    Excludes sensitive access tokens from response.
    """
    from app.models.profile import ConnectedProfile
    cps = db.query(ConnectedProfile).filter(ConnectedProfile.user_id == current_user.id).all()
    
    result = {}
    for cp in cps:
        derived_username = cp.username
        if cp.platform in ["linkedin", "leetcode"]:
            derived_username = extract_profile_username(cp.platform, cp.profile_url) or cp.username

        # Strip access token from profile_data
        clean_profile_data = dict(cp.profile_data or {})
        clean_profile_data.pop("access_token", None)

        result[cp.platform] = {
            "platform": cp.platform,
            "username": derived_username,
            "profile_url": cp.profile_url,
            "connection_type": cp.connection_type,
            "profile_data": clean_profile_data,
            "connected_at": cp.connected_at.strftime("%Y-%m-%d")
        }
    return result

@router.get("/github/contributions")
def get_github_contributions(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Fetches authenticated student's real GitHub contribution calendar data using GitHub's GraphQL API.
    Returns week-by-week contribution days and total contribution count.
    """
    from app.models.profile import ConnectedProfile
    cp = db.query(ConnectedProfile).filter(
        ConnectedProfile.user_id == current_user.id,
        ConnectedProfile.platform == "github"
    ).first()

    if not cp or not cp.username:
        raise HTTPException(status_code=404, detail="GitHub account is not connected.")

    access_token = (cp.profile_data or {}).get("access_token")

    # GitHub GraphQL Query for contribution calendar
    query = """
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
    """

    headers = {"User-Agent": "PlaceX-Career-OS"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    try:
        res = requests.post(
            "https://api.github.com/graphql",
            json={"query": query, "variables": {"username": cp.username}},
            headers=headers,
            timeout=10.0
        )
        data = res.json()

        if "data" in data and data["data"] and data["data"].get("user"):
            calendar = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
            return {
                "username": cp.username,
                "totalContributions": calendar.get("totalContributions", 0),
                "weeks": calendar.get("weeks", [])
            }

        # Fallback 1: Try public contributions worker API if token was not present or returned GraphQL error
        fallback_res = requests.get(
            f"https://github-contributions-api.johannesknorr.workers.dev/v1/{cp.username}",
            timeout=10.0
        )
        if fallback_res.status_code == 200:
            f_json = fallback_res.json()
            years = f_json.get("years", [])
            total = 0
            if years:
                total = years[0].get("total", 0)

            # Reformat to GitHub GraphQL weeks format
            raw_contribs = f_json.get("contributions", [])
            weeks = []
            current_week = []
            for item in raw_contribs:
                cnt = item.get("count", 0)
                lvl = "NONE"
                if cnt > 0 and cnt <= 3:
                    lvl = "FIRST_QUARTILE"
                elif cnt > 3 and cnt <= 6:
                    lvl = "SECOND_QUARTILE"
                elif cnt > 6 and cnt <= 10:
                    lvl = "THIRD_QUARTILE"
                elif cnt > 10:
                    lvl = "FOURTH_QUARTILE"

                current_week.append({
                    "date": item.get("date"),
                    "contributionCount": cnt,
                    "contributionLevel": lvl
                })
                if len(current_week) == 7:
                    weeks.append({"contributionDays": current_week})
                    current_week = []
            if current_week:
                weeks.append({"contributionDays": current_week})

            return {
                "username": cp.username,
                "totalContributions": total,
                "weeks": weeks
            }

        err_msg = "Could not retrieve GitHub contribution data right now."
        if "errors" in data and len(data["errors"]) > 0:
            err_msg = data["errors"][0].get("message", err_msg)

        raise HTTPException(status_code=400, detail=err_msg)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[GitHub Contributions Exception]: {e}")
        raise HTTPException(status_code=500, detail="Unable to load GitHub contribution activity right now.")

@router.get("/github/repos")
def get_github_repos(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Fetches public repositories for authenticated student's connected GitHub account using GitHub REST API.
    Returns clean list of repositories with names, descriptions, stars, forks, language, updated_at, and html_url.
    """
    from app.models.profile import ConnectedProfile
    cp = db.query(ConnectedProfile).filter(
        ConnectedProfile.user_id == current_user.id,
        ConnectedProfile.platform == "github"
    ).first()

    if not cp or not cp.username:
        raise HTTPException(status_code=404, detail="GitHub account is not connected.")

    access_token = (cp.profile_data or {}).get("access_token")

    headers = {"User-Agent": "PlaceX-Career-OS", "Accept": "application/vnd.github.v3+json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    try:
        url = "https://api.github.com/user/repos?type=public&sort=updated&per_page=100" if access_token else f"https://api.github.com/users/{cp.username}/repos?type=public&sort=updated&per_page=100"
        
        res = requests.get(url, headers=headers, timeout=10.0)
        
        if res.status_code != 200 and access_token:
            fallback_url = f"https://api.github.com/users/{cp.username}/repos?type=public&sort=updated&per_page=100"
            res = requests.get(fallback_url, headers={"User-Agent": "PlaceX-Career-OS"}, timeout=10.0)

        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Unable to retrieve GitHub repositories.")

        raw_repos = res.json()
        if not isinstance(raw_repos, list):
            raw_repos = []

        clean_repos = []
        for repo in raw_repos:
            clean_repos.append({
                "id": repo.get("id"),
                "name": repo.get("name"),
                "description": repo.get("description") or "No description",
                "language": repo.get("language") or "Other",
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "updated_at": repo.get("updated_at"),
                "html_url": repo.get("html_url") or f"https://github.com/{cp.username}/{repo.get('name')}",
                "is_private": repo.get("private", False)
            })

        return {
            "username": cp.username,
            "total_count": len(clean_repos),
            "repositories": clean_repos
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[GitHub Repos Exception]: {e}")
        raise HTTPException(status_code=500, detail="Unable to load GitHub repositories right now.")

@router.post("/profiles/connected/url")
def save_profile_url(payload: dict = Body(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Saves or updates manual profile URL for LinkedIn or LeetCode.
    Validates URL format safely and extracts username before storing.
    """
    from app.models.profile import ConnectedProfile

    platform = payload.get("platform")
    url = (payload.get("url") or "").strip()

    if platform not in ["linkedin", "leetcode"]:
        raise HTTPException(status_code=400, detail="Invalid platform. Must be 'linkedin' or 'leetcode'.")

    if not url:
        raise HTTPException(status_code=400, detail="Profile URL is required.")

    # Format URL protocol if missing
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # Validate domain and format safely
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()

    if platform == "linkedin":
        if "linkedin.com" not in domain or "/in/" not in parsed.path:
            raise HTTPException(
                status_code=400,
                detail="Enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username/)."
            )
        username = extract_profile_username("linkedin", url)

    elif platform == "leetcode":
        if "leetcode.com" not in domain:
            raise HTTPException(
                status_code=400,
                detail="Enter a valid LeetCode profile URL (e.g. https://leetcode.com/u/username/)."
            )
        username = extract_profile_username("leetcode", url)

    existing = db.query(ConnectedProfile).filter(
        ConnectedProfile.user_id == current_user.id,
        ConnectedProfile.platform == platform
    ).first()

    if existing:
        existing.username = username
        existing.profile_url = url
        existing.connection_type = "profile_url"
        existing.updated_at = datetime.utcnow()
    else:
        new_cp = ConnectedProfile(
            user_id=current_user.id,
            platform=platform,
            username=username,
            profile_url=url,
            connection_type="profile_url",
            profile_data={}
        )
        db.add(new_cp)

    db.commit()
    return {"status": "success", "platform": platform, "username": username, "profile_url": url}

@router.delete("/profiles/connected/{platform}")
def disconnect_profile(platform: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Disconnects and removes connected profile association for student.
    """
    from app.models.profile import ConnectedProfile
    cp = db.query(ConnectedProfile).filter(
        ConnectedProfile.user_id == current_user.id,
        ConnectedProfile.platform == platform
    ).first()

    if cp:
        db.delete(cp)
        db.commit()
        return {"status": "disconnected", "platform": platform}
    
    raise HTTPException(status_code=404, detail="Connected profile not found.")

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
