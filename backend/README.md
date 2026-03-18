# tcareer compass backend

## Setup

1. Create `.env` (you can copy from `.env.example`)
2. Ensure MongoDB is running
3. Install deps and run:

```bash
npm install
npm run dev
```

## Endpoints

- `GET /jobs` – list public jobs
- `POST /upload` – multipart upload (fields: `name`, `email`, `file`)
- `GET /resumes` – list uploaded resumes (MongoDB records)
- `GET /resumes/:fileName` – serve the actual file from `/uploads`
- `POST /applications` – create application, blocks duplicates by `(jobId + email)`

