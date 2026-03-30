# Carrer-Compass

##  Quick Start 

If you're cloning this project on a new machine, follow these steps to get your tests and environment fully working.

### 1. Setup Environment Variables
Before running the app or tests, you need your `.env` files.
- Copy `backend/.env.example` to `backend/.env`
- Copy `frontened/.env.example` to `frontened/.env`

### 2. Install Dependencies & Testing Tools
From the project root directory, run:
```bash
npm install
npm run setup
```
> **Note:** The `npm run setup` command installs everything for both backend and frontend, and downloads the Chrome/Firefox browsers required by Playwright UI testing.

### 3. Run All Tests
To verify everything is working, run:
```bash
npm run test:all
```
> **Windows Users:** If the backend tests crash immediately, ensure you have the [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) installed, as it is required by the `mongodb-memory-server` test database.

### 4. Run the Application Locally
```bash
npm run dev
```

### Notes
- Frontend runs in `frontened/`
- Backend runs in `backend/`

