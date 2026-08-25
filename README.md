# Django + React – People Directory

Full-stack **Person Directory** with JWT auth, owner-scoped CRUD, pagination/search/ordering, and user profile with avatar upload + free-aspect crop.

## Features
- **Auth:** Register / Login (JWT access 15m + refresh 7d + blacklist on logout), auto-refresh via axios interceptor
- **People:** Create/Edit/Delete/List (pagination 5/page, search by first/last name, ordering by first/last name), validation (all fields required, email format, 2MB type checks)
- **Profile (`/profile`):** View/update `username`, `email`, `first_name`, `last_name`, `password` (optional), `avatar` (JPEG/PNG/WEBP, 2MB, free-aspect crop via `react-easy-crop` in modal) – avatar shown next to Logout with fallback SVG
- **UI:** Vanilla CSS design system (`--bg #fcfcfa`, `--ink #11110f`, `--line #e9e8e3`, Fraunces/Inter), sticky navbar (blur), card/pill buttons

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.14, Django 6.1, DRF 3.18, SimpleJWT 5.5 + token_blacklist, django-cors-headers 4.9, Pillow 12.3, SQLite |
| Frontend | React 19.2, TypeScript 6, Vite 8, react-router 8.3, Axios 1.19, react-easy-crop, ESLint 10 |

## Folder Structure
```
backend/
  manage.py
  backend/settings.py, urls.py
  accounts/ (Custom User + avatar, Register/Profile/Logout views)
  todo/ (Person model + ViewSet)
  media/avatars/ (uploaded avatars, gitignored)
  db.sqlite3
frontend/
  src/App.tsx (PersonList + NavBar + Routes)
  src/components/{login,register,profile,avatar-crop-modal,modal,person-detail,private-route}.tsx
  src/api.tsx, useAuth.ts, types.ts, index.css
  vite.config.ts (React Compiler)
```

## Prerequisites
- Python 3.10+ (tested 3.14) & pip
- Node 18+ & npm
- Git

## 1. Backend Setup (Django)

```bash
# from project root
cd backend

# create & activate venv (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
# Linux/macOS: source venv/bin/activate

# install deps (no requirements.txt yet – install directly)
pip install Django==6.1 djangorestframework==3.18.0 django-cors-headers==4.9.0 djangorestframework-simplejwt==5.5.1 Pillow==12.3.0

# or if you create requirements.txt:
# pip install -r requirements.txt

# migrate (creates accounts_user with avatar)
python manage.py migrate

# optional: create admin
python manage.py createsuperuser

# run (must run from backend/ where manage.py lives, port 8000)
python manage.py runserver
# -> http://localhost:8000/api/   Admin http://localhost:8000/admin/
```

**Settings already configured:**
- `MEDIA_URL=/media/` `MEDIA_ROOT=BASE_DIR/media` (auto-created)
- `CORS_ALLOWED_ORIGINS = ["http://localhost:3000","http://localhost:5173"]`, `CorsMiddleware` at top
- `ALLOWED_HOSTS=["*"]` (dev), `JWT ACCESS 15m REFRESH 7d`

**Media:** Uploaded avatars saved to `backend/media/avatars/` and served at `http://localhost:8000/media/avatars/...` when `DEBUG=True`.

## 2. Frontend Setup (React)

```bash
cd frontend
npm install          # installs react-easy-crop, axios, router, etc.
npm run dev          # Vite dev -> http://localhost:5173
npm run build        # tsc -b && vite build -> dist/
npm run lint         # eslint .
npm run preview      # preview built dist
```

No `.env` needed – API base is `http://localhost:8000/api/` in `src/api.tsx:4`. To change, edit `baseURL` or add `VITE_API_URL` and use `import.meta.env.VITE_API_URL`.

## 3. First Run Checklist

1. Start backend `python manage.py runserver` (8000) and frontend `npm run dev` (5173) in two terminals.
2. Open `http://localhost:5173` -> redirected to `/login`.
3. **Register** (`/register`) → auto-login → lands on `/dashboard` (People list).
4. **Login** (`/login`) with `username` + `password` → stores `access`/`refresh` in `localStorage`, navbar shows avatar fallback + Logout (sticky top, blur).
5. **Add person** → Add person → fill First/Last/Email/Gender/Hobbies (all required, hobbies ≥1, email format) → Save.
6. **Profile** → click avatar in navbar → `/profile` → edit username/email/first/last, change password (leave blank to keep), upload image → crop freely (drag + zoom slider, any rectangle) → Confirm → cropped <2MB JPEG → Save → navbar avatar updates instantly.
7. **Logout** → clears tokens, navbar shows Login/Register.

## API Endpoints

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/register/` | No | `{username,email,password}` |
| POST | `/api/token/` | No | `{username,password}` → `{access,refresh}` |
| POST | `/api/token/refresh/` | No | `{refresh}` → `{access}` |
| POST | `/api/logout/` | Yes | `{refresh}` (blacklist) |
| GET/PATCH | `/api/profile/` | Yes | GET JSON; PATCH `username,email,first_name,last_name,avatar(File),password` (multipart or JSON, avatar `null` to remove) |
| GET | `/api/persons/?page=&search=&ordering=` | Yes | Paginated `{count,next,previous,results:Person[]}` |
| POST | `/api/persons/` | Yes | `Person` JSON |
| GET/PUT/DELETE | `/api/persons/{id}/` | Yes | `Person` |

`Person` = `{id?, first_name, last_name, email, gender: "male"|"female"|"other", hobbies: ("sports"|"dancing"|"playing"|"others")[] }`

## Troubleshooting

- **ModuleNotFoundError: corsheaders / rest_framework / rest_framework_simplejwt** → `pip install` above, ensure `venv` activated and `pip` points to `venv/Scripts/python`.
- **`can't open file manage.py`** → run from `backend/` dir (where `manage.py` lives), not project root.
- **Invalid HTTP_HOST header: testserver** → `ALLOWED_HOSTS=["*"]` already set for tests.
- **CORS error** → backend must run on 8000, frontend on 5173, `CorsMiddleware` must be first in `settings.py:73`.
- **Image upload 400 "Avatar must be smaller than 2MB"** → crop to smaller area or choose <2MB JPEG/PNG/WEBP; original allowed 5MB for cropping, final cropped enforced 2MB client + server.
- **Avatar not showing** → check `media/avatars/` exists and `DEBUG=True` serves `/media/`; JWT must be present (`localStorage.access`).

## Scripts Reference

| Location | Script |
|----------|--------|
| `backend/` | `python manage.py check`, `makemigrations`, `migrate`, `shell`, `runserver 8000` |
| `frontend/` | `npm run dev` (5173), `build`, `lint`, `preview` |

## License
MIT – customize as needed.
