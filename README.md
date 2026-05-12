# RegexCraft — AI-Powered Regex Pattern Matching & Replacement

> Upload a CSV or Excel file → describe your pattern in plain English → let Claude AI generate the regex → apply replacements in one click.

---

## ✨ Features

| Feature | Details |
|---|---|
| File Upload | CSV, XLSX, XLS — up to 50 MB |
| AI Regex Generation | Describe patterns in natural language; Groq AI (Llama 3.3) converts them to regex |
| Preview Matches | See how many cells match before committing |
| Find & Replace | Applies regex replacement across chosen text columns |
| Download | Export the processed file as CSV or XLSX |
| Summarise (optional) | AI condenses each cell in a column to one sentence |
| Classify (optional) | AI labels each cell with one of your custom categories |

---

## 🗂 Project Structure

```
regex-app/
├── backend/                  # Django REST API
│   ├── regex_app/            # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── processor/            # Main app
│   │   ├── models.py         # ProcessingLog model
│   │   ├── services.py       # File parsing, LLM, regex logic
│   │   ├── serializers.py    # DRF request validation
│   │   ├── views.py          # API endpoints
│   │   ├── urls.py           # App URL routing
│   │   └── admin.py
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
│
└── frontend/                 # React application
    ├── public/index.html
    └── src/
        ├── App.jsx            # Root component, state management
        ├── api.js             # Axios API client
        ├── index.js
        ├── index.css          # Global styles & CSS variables
        └── components/
            ├── FileUploadZone.jsx   # Drag-and-drop uploader
            ├── DataTable.jsx        # Paginated data table
            ├── RegexPanel.jsx       # NL input + regex + column selector
            ├── TransformPanel.jsx   # Optional LLM transforms
            └── ResultsPanel.jsx     # Processed results + download
```

---

## 🚀 Setup & Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)

---

### Backend

```bash
# 1. Enter the backend directory
cd regex-app/backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Open .env and set your GROQ_API_KEY

# 5. Apply database migrations
python manage.py migrate

# 6. (Optional) Create a Django admin user
python manage.py createsuperuser

# 7. Start the development server
python manage.py runserver
```

The API will be available at **http://localhost:8000/api/**

---

### Frontend

```bash
# 1. Enter the frontend directory
cd regex-app/frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app will open at **http://localhost:3000**

> The `"proxy": "http://localhost:8000"` setting in `package.json` forwards all `/api/*` requests to Django automatically.

---

## 🌐 API Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `/api/health/` | Health check |
| POST | `/api/upload/` | Upload CSV/Excel, returns parsed table |
| POST | `/api/generate-regex/` | NL description → regex (LLM) |
| POST | `/api/preview/` | Count pattern matches (no replacement) |
| POST | `/api/replace/` | Apply regex replacement |
| POST | `/api/download/` | Download regex-processed file as CSV/XLSX |
| POST | `/api/export/` | Download transform result as CSV/XLSX |
| POST | `/api/transform/` | LLM column transformation (summarise / classify) |

---

## 🐳 Docker Deployment

```bash
# Build and start both services
docker-compose up --build

# The app will be at http://localhost:3000
# The API will be at http://localhost:8000
```

Make sure to set `GROQ_API_KEY` in your environment or a `.env` file before running Docker.

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Your Groq API key (free at console.groq.com) |
| `DJANGO_SECRET_KEY` | ✅ | Django secret key (change in production!) |
| `DEBUG` | ❌ | `True` for dev, `False` for production |
| `ALLOWED_HOSTS` | ❌ | Comma-separated allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | ❌ | Comma-separated frontend origins |

---

## 📝 Example Usage

1. Upload a CSV with a column containing email addresses
2. Type: *"Find all email addresses"*
3. Click **Generate Regex with AI** → Groq AI generates `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,7}\b`
4. Select the email column, enter `REDACTED` as replacement
5. Click **Preview Matches** to confirm
6. Click **Apply Replacement** to process
7. Download the result as CSV or XLSX

---

## 🎥 Demo Video
Please click here:
[![Demo Video](https://img.youtube.com/vi/5z_dZBzeJ_k/0.jpg)](https://youtu.be/5z_dZBzeJ_k)  
or use link: https://youtu.be/5z_dZBzeJ_k
