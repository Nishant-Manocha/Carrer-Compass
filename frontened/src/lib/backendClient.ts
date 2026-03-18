import { AuthResponse, Job, User } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

type UploadResponse = {
  id: string;
  name: string;
  email: string;
  fileName: string;
  url: string;
};

type ApiErrorPayload = {
  error?: string;
  field?: "name" | "email" | "phone" | "resume" | "jobId";
  code?: string;
};

export class ApiError extends Error {
  field?: ApiErrorPayload["field"];
  code?: string;

  constructor(message: string, opts?: { field?: ApiErrorPayload["field"]; code?: string }) {
    super(message);
    this.name = "ApiError";
    this.field = opts?.field;
    this.code = opts?.code;
  }
}

async function parseJsonSafe(res: Response): Promise<ApiErrorPayload> {
  return (await res.json().catch(() => ({}))) as ApiErrorPayload;
}

function toNetworkFriendlyError(err: unknown): Error {
  // Browser fetch throws TypeError on network/CORS issues
  if (err instanceof TypeError) {
    return new Error(
      "Failed to reach the server. Make sure the backend is running on http://localhost:4000 and CORS_ORIGIN matches your frontend URL."
    );
  }
  return err instanceof Error ? err : new Error("Something went wrong");
}

export async function uploadResume(params: { name: string; email: string; file: File }): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("name", params.name);
  fd.append("email", params.email);
  fd.append("file", params.file);

  try {
    const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Upload failed", { field: data?.field, code: data?.code });
    return data as UploadResponse;
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function submitApplicationToBackend(input: {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeReference: string;
  resumeUploadId?: string;
}): Promise<{ id: string }> {
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Submit failed", { field: data?.field, code: data?.code });
    return data as { id: string };
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

// Auth functions
export async function signup(input: any): Promise<{ message: string; email: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Signup failed");
    return data as { message: string; email: string };
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function verifyOTP(input: { email: string; otp: string }): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Verification failed");
    return data as AuthResponse;
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function login(input: any): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Login failed");
    return data as AuthResponse;
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

// Admin functions
export async function adminGetJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/jobs`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new ApiError("Failed to fetch admin jobs");
    return await res.json();
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function adminAddJob(job: Partial<Job>): Promise<Job> {
  try {
    const res = await fetch(`${API_BASE}/admin/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify(job)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Failed to add job");
    return data as Job;
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function adminUpdateJob(id: string, updates: Partial<Job>): Promise<Job> {
  try {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new ApiError(data?.error || "Failed to update job");
    return data as Job;
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function fetchPublicJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new ApiError("Failed to fetch jobs");
    return await res.json();
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function fetchJobById(id: string): Promise<Job> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new ApiError("Failed to fetch job details");
    return await res.json();
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

export async function getUserApplications(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/my-applications`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new ApiError("Failed to fetch applications");
    return await res.json();
  } catch (err) {
    throw toNetworkFriendlyError(err);
  }
}

