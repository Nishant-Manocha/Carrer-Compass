export type JobStatus = 'draft' | 'public' | 'closed';

export interface Job {
  id: string;
  title: string;
  teamOrDepartment: string;
  location: string;
  shortDescription: string;
  fullDescription: string;
  status: JobStatus;
  postedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}
