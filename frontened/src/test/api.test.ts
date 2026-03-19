import { describe, it, expect, beforeEach } from 'vitest';
import { getPublicJobs, getJobById, submitApplication, getApplications, resetStore } from '@/lib/api';

describe('Career Board API', () => {
  beforeEach(() => {
    resetStore();
  });

  // API/Validation Test 1: Jobs list only returns public jobs
  it('getPublicJobs excludes draft and closed jobs', () => {
    const jobs = getPublicJobs();
    expect(jobs.length).toBe(4); // 4 public out of 5 seeded
    expect(jobs.every(j => j.status === 'public')).toBe(true);
  });

  // API/Validation Test 2: Invalid application is rejected
  it('rejects application with missing required fields', () => {
    const result = submitApplication({
      jobId: '1',
      name: 'J',
      email: 'test@example.com',
      phone: '1234567890',
      resumeUrl: 'local://resume.pdf',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  // API/Validation Test 3: Invalid email is rejected
  it('rejects application with invalid email', () => {
    const result = submitApplication({
      jobId: '1',
      name: 'John',
      email: 'not-an-email',
      phone: '1234567890',
      resumeUrl: 'local://resume.pdf',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email');
  });

  // Edge Case Test: Duplicate application is rejected
  it('rejects duplicate application for same job and email', () => {
    const input = {
      jobId: '1',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '1234567890',
      resumeUrl: 'local://resume.pdf',
    };

    const first = submitApplication(input);
    expect(first.success).toBe(true);

    const second = submitApplication(input);
    expect(second.success).toBe(false);
    expect(second.error).toContain('already applied');
  });

  // API Test: Successful application is persisted
  it('persists a successful application', () => {
    const result = submitApplication({
      jobId: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      resumeUrl: 'local://resume.pdf',
    });
    expect(result.success).toBe(true);
    expect(result.application).toBeDefined();
    expect(result.application!.email).toBe('john@example.com');

    const all = getApplications();
    expect(all.length).toBe(1);
    expect(all[0].jobId).toBe('1');
  });

  // Edge Case Test: Non-existent job returns null
  it('getJobById returns null for non-existent job', () => {
    expect(getJobById('999')).toBeNull();
  });

  // Edge Case Test: Draft job is not accessible
  it('getJobById returns null for draft job', () => {
    expect(getJobById('4')).toBeNull(); // Job 4 is draft
  });

  // API Test: Application to non-existent job fails
  it('rejects application to non-existent job', () => {
    const result = submitApplication({
      jobId: '999',
      name: 'Test',
      email: 'test@test.com',
      phone: '1234567890',
      resumeUrl: 'local://r.pdf',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Job not found');
  });
});
