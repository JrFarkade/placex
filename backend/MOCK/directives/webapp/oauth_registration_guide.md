# PlaceX Webapp — OAuth App Registration & Configuration Guide

**Document ID**: `directives/webapp/oauth_registration_guide.md`  
**Status**: Active / Manual Setup Directive  
**Subsystem**: Webapp (`webapp/`)  
**Audience**: Project Maintainer / Developer (Manual Step)

---

## 1. Overview & Architectural Contract

The **PlaceX Webapp** uses OAuth 2.0 / OpenID Connect for candidate authentication with two supported identity providers:
1. **GitHub OAuth**: For developer profile linking, repository context extraction, and candidate sign-in.
2. **LinkedIn OAuth 2.0**: For professional profile signals, seniority verification, and candidate sign-in.

> [!IMPORTANT]
> **No Fake/Invented Credentials in Code**:
> OAuth Client IDs and Secrets must NEVER be hardcoded into source control. They must be registered manually in each provider's developer console and supplied via environment variables in `.env`.

---

## 2. GitHub OAuth App Setup (Manual Steps)

1. Log into your GitHub account and navigate to:  
   **Settings** $\rightarrow$ **Developer Settings** $\rightarrow$ **OAuth Apps** $\rightarrow$ **New OAuth App**  
   (Direct URL: [https://github.com/settings/applications/new](https://github.com/settings/applications/new))

2. Fill in the application registration details:
   - **Application Name**: `PlaceX Candidate Portal (Local Dev)`
   - **Homepage URL**: `http://localhost:8000/` (or your production URL)
   - **Application Description**: `PlaceX Real-Time Technical Interview Platform`
   - **Authorization callback URL**:  
     ```
     http://localhost:8000/accounts/github/login/callback/
     ```

3. Click **Register application**.

4. Copy the **Client ID** and generate a new **Client Secret**.

5. Add them to your `.env` file:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   ```

---

## 3. LinkedIn Developer App Setup (Manual Steps)

1. Log into LinkedIn and go to the **LinkedIn Developer Portal**:  
   [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)

2. Click **Create App** and fill in:
   - **App Name**: `PlaceX Platform`
   - **LinkedIn Page**: Associate with your company or personal page.
   - **App Logo**: Upload a logo image.

3. Under the **Products** tab in your app dashboard:
   - Add **Sign In with LinkedIn using OpenID Connect** (allows `openid`, `profile`, `email` scopes).

4. Under the **Auth** tab:
   - Add the Authorized Redirect URL:
     ```
     http://localhost:8000/accounts/linkedin_oauth2/login/callback/
     ```

5. Copy the **Client ID** and **Primary Client Secret**.

6. Add them to your `.env` file:
   ```bash
   LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
   ```

---

## 4. MySQL Database Configuration (Optional / Local Dev Fallback)

The webapp is configured to connect to MySQL by default, but seamlessly falls back to local SQLite if MySQL credentials or server are not detected.

To configure MySQL locally:
1. Create a MySQL database and user:
   ```sql
   CREATE DATABASE placex_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'placex_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON placex_db.* TO 'placex_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. Add database settings to your `.env`:
   ```bash
   DB_ENGINE=django.db.backends.mysql
   DB_NAME=placex_db
   DB_USER=placex_user
   DB_PASSWORD=your_password
   DB_HOST=127.0.0.1
   DB_PORT=3306
   ```

---

## 5. Summary Checklist for Developers

- [ ] GitHub OAuth App created with callback `http://localhost:8000/accounts/github/login/callback/`
- [ ] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` added to `.env`
- [ ] LinkedIn Developer App created with OpenID Connect product and callback `http://localhost:8000/accounts/linkedin_oauth2/login/callback/`
- [ ] `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` added to `.env`
- [ ] Run `python webapp/manage.py migrate`
