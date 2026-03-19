import { Job, Application } from './types';
import { seedJobs } from './seed-data';
import { z } from 'zod';

// In-memory store
let jobs: Job[] = [...seedJobs];
let applications: Application[] = [];

export const applicationSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be under 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  resumeUrl: z.string().min(1, 'Resume is required'),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

// GET /api/jobs — only public
export function getPublicJobs(): Job[] {
  return jobs.filter(j => j.status === 'public');
}

// GET /api/jobs/:id
export function getJobById(id: string): Job | null {
  const job = jobs.find(j => j.id === id);
  if (!job || job.status !== 'public') return null;
  return job;
}

// POST /api/applications
export function submitApplication(input: ApplicationInput): { success: boolean; error?: string; application?: Application } {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { jobId, email } = parsed.data;

  // Check job exists
  const job = jobs.find(j => j.id === jobId && j.status === 'public');
  if (!job) return { success: false, error: 'Job not found' };

  // Check duplicate
  const duplicate = applications.find(a => a.jobId === jobId && a.email.toLowerCase() === email.toLowerCase());
  if (duplicate) return { success: false, error: 'You have already applied for this position.' };

  const application: Application = {
    id: crypto.randomUUID(),
    jobId: parsed.data.jobId,
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone,
    resumeUrl: parsed.data.resumeUrl,
    createdAt: new Date().toISOString(),
  };

  applications.push(application);
  return { success: true, application };
}

// For testing
export function getApplications(): Application[] {
  return [...applications];
}

export function resetStore() {
  jobs = [...seedJobs];
  applications = [];
}
