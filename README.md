# STETH DAY 2026 — Kerala NEET Academy Registration & Reception Portal

A full-stack event registration and reception management portal for Kerala NEET Academy's STETH DAY 2026. Built with React 19, TypeScript, Vite, Tailwind CSS v4, Express, and PostgreSQL/Firebase Firestore.

---

## 🚀 How to Run in Your Native Local Folder

Follow these steps to run the project on your local machine (Windows, macOS, or Linux).

### Prerequisites

Ensure you have the following installed:
- **Node.js**: Version 18.x, 20.x, or 22.x ([Download Node.js](https://nodejs.org/))
- **npm** (comes with Node.js) or **pnpm** / **bun**
- (Optional) **PostgreSQL** database if you wish to run a dedicated local database, or use cloud SQL credentials.

---

### Step 1: Open Your Native Project Folder

Open your terminal or command prompt and navigate to the project directory:

```bash
cd /path/to/your/project-folder
```

---

### Step 2: Install Dependencies

Run npm to install all required dependencies:

```bash
npm install
```

---

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure the necessary variables:

```env
# Optional Gemini AI API Key
GEMINI_API_KEY="your-gemini-api-key"

# App URL (default local port is 3000)
APP_URL="http://localhost:3000"

# Optional PostgreSQL Connection (if using Cloud SQL or local PostgreSQL)
SQL_HOST="localhost"
SQL_USER="postgres"
SQL_PASSWORD="your-db-password"
SQL_DB_NAME="kna_steth_2026"
```

---

### Step 4: Run the Development Server

Start the full-stack server (runs Express backend + Vite frontend together on port 3000):

```bash
npm run dev
```

Once started, open your browser and navigate to:
```
http://localhost:3000
```

---

### Step 5: Building for Production

To create an optimized production build:

```bash
# Compile frontend and bundle backend
npm run build

# Start the production server
npm start
```

---

## 🔑 Default Admin Credentials

- **Admin Portal**: Navigate to `/` and select **Admin Console** or visit `/admin`
- **Email**: `admin@keralaneetacademy.org`
- **Password**: `admin123`

---

## 🛠 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts full-stack dev server with hot reload (`tsx server.ts`) on port 3000 |
| `npm run build` | Builds Vite client assets and bundles `server.ts` into `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run preview` | Previews the production build with Vite |
| `npm run clean` | Removes build artifacts (`dist` folder) |
