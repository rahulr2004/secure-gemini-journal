# Gemini AI Journal & Reflections Vault

A secure, user-authenticated personal reflection journal and AI brainstorming companion powered by **Gemini 3.6 Flash**, **Firebase Authentication**, **Cloud Firestore**, and **Google Cloud Run**.

Mandatory Campaign Submission Hashtag: `#AccelerateAIwithCloudRun`

---

## 🎯 Problem & Solution

- **The Problem:** Modern journalers need reflective, insightful feedback on their daily thoughts, mental models, and goals without compromising the deep privacy and isolation of their intimate journal entries.
- **The Solution:** A private, full-stack reflection platform that pairs multi-turn conversational AI with zero-knowledge client architectures, owner-bound Firestore security rules, server-side secret isolation via Google Cloud Secret Manager, and instant deployment on Google Cloud Run.

---

## 🛡️ Architecture & Threat Model Overview (5 Threat Zones)

This application adheres strictly to the **5 Threat Zones** model and the **OWASP Top 10 for LLM Applications**:

```
[ Web Client / Browser (React 19 + Tailwind) ]
                     │  (HTTPS / TLS)
                     ▼
[ Cloud Run Container Service (Express + Vite) ] ── (Secret Manager) ──► [ GEMINI_API_KEY ]
                     │                                                        │
                     ├────────────────── (Backend SDK) ───────────────────────┘
                     │
                     ▼
[ Firebase Auth & Cloud Firestore Database ]
  ├── /users/{userId}/profile/info        (Owner isolated)
  ├── /users/{userId}/entries/{entryId}   (Owner isolated)
  ├── /users/{userId}/goals/{goalId}      (Owner isolated)
  ├── /users/{userId}/memories/{memoryId} (Owner isolated)
  └── /users/{userId}/proposals/{propId}  (Owner isolated)
```

| Threat Zone | Scope | Key Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | User reflections, voice dictation, search queries | Strict server schema validation, 10MB payload limit, Markdown sanitization |
| **2. Planning & Reasoning** | Gemini multi-turn conversation & autonomous synthesis | 4-Tier fallback ladder (`gemini-3.6-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.7-flash`) |
| **3. Tool Execution** | Server API endpoints (`/api/gemini/*`, `/jobs/*`) | Secret keys isolated server-side, zero browser exposure, read-only autonomous agents |
| **4. Memory & State** | Firestore collections (`/users/{userId}/...`) | Owner-bound security rules (`request.auth.uid == userId`) with default-deny |
| **5. Inter-System Communication** | OAuth & Google GenAI API | Google Federated Identity, Secret Manager integration, HTTPS TLS transport |

---

## ✨ Key Features

1. **Google Federated Authentication**: Instant, passwordless sign-in with persistent local sessions and user profile management.
2. **Multi-Turn Adaptive AI Journaling**: Conversational dialogue with Gemini across 4 specialized modes (`Reflection`, `Summary`, `Brainstorm`, `Advice`).
3. **Voice-to-Text Dictation**: Native Web Speech API integration allowing hands-free stream-of-consciousness journaling.
4. **Dynamic AI Synthesis & Insights**: Generate structured takeaways, key themes, and actionable next steps.
5. **Interactive 30-Day Trends & Mood Analytics**: Dynamic analytics chart powered by Recharts visualizing entry cadence, mood index, and dialogue volume.
6. **Smart Search & Date Filtering**: Search across titles, tags, and reflection dialogue with customizable date ranges.
7. **Sunday Synthesis Autonomous Agent**: Scheduled weekly reflection synthesis proposals with dismissible user acceptance.
8. **Goal Milestones & AI Memory Vault**: Goal breakdown coaching and private fact memory extraction.
9. **Full Vault Export**: One-click download of all journal history in Markdown/Plain Text or structured JSON.

---

## 📋 Prerequisites & GCP Setup

Enable the required Google Cloud APIs in your GCP project:

```bash
# Set your project ID & preferred Cloud Run region
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="asia-southeast1" # e.g., us-central1, asia-southeast1
gcloud config set project $PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## 🔑 Secret Management Setup (Google Cloud Secret Manager)

Store your Gemini API key in Google Cloud Secret Manager and grant access to the Cloud Run compute service account:

```bash
# 1. Create the Secret Manager Secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API Key version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the runtime compute service account Secret Accessor permissions
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🔒 Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure zero cross-user data leakage:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Dedicated user profile document linked to authentication ID
    match /users/{userId}/profile/{profileDoc} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Dedicated top-level userProfiles collection support
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated user interactions collection
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated user journal entries collection
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated user goals collection
    match /users/{userId}/goals/{goalId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated user AI memory collection
    match /users/{userId}/memories/{memoryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Isolated user Sunday Synthesis proposals
    match /users/{userId}/proposals/{proposalId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Admin aggregated stats - read-only for authenticated admin role
    match /admin/{docId} {
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)/profile/data).data.role == 'admin';
      allow write: if false;
    }
    // Default deny for all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

To deploy via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🚀 Cloud Run Deployment Flow

Build and deploy the containerized full-stack application directly to Google Cloud Run:

```bash
# Deploy to Google Cloud Run with Secret Manager binding
gcloud run deploy gemini-journal-app \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 8080
```

---

## 🏷️ Mandatory Campaign Verification Binding

Apply the mandatory resource label required for the Ideathon campaign verification:

```bash
gcloud run services update gemini-journal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables in .env (see .env.example)
cp .env.example .env

# 3. Start local development server (runs on port 3000)
npm run dev

# 4. Run type checks and build
npm run lint
npm run build
```

---

## 🧪 Step-by-Step Functional Verification Walkthrough

1. **Sign In**: Launch the app and click **"Continue with Google"** to authenticate via Firebase Auth.
2. **Write & Dictate**: Create a new reflection session, choose an AI Mode, click **"Speak"** to dictate or type your reflection, and send.
3. **Multi-Turn Context**: Reply with a follow-up query to test context retention across turns.
4. **AI Reasoning Modes**: Switch between Reflection, Summary, Brainstorm, and Advice modes to see dynamic responses.
5. **AI Synthesis**: Click **"Generate AI Summary"** to produce an overarching reflection summary.
6. **Goal Coach & Memory Vault**: Open the Goals and Memories modals to test goal planning and personal memory extraction.
7. **Filter & Analytics**: Use the search bar, date range picker, and 30-day analytics chart to review trends.
8. **Export Vault**: Export all entries as formatted Markdown or structured JSON.
9. **Sign Out**: Log out to verify complete data privacy and route protection.
