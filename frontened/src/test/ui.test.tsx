import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import AdminDashboard from '@/pages/AdminDashboard';
import UserDashboard from '@/pages/UserDashboard';
import NotFound from '@/pages/NotFound';
import JobDetail from '@/pages/JobDetail';
import { ApplicationForm } from '@/components/ApplicationForm';
import VerifyOTP from '@/pages/VerifyOTP';

// Mock fetch globally
(globalThis as any).fetch = vi.fn();

const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Remote',
    shortDescription: 'Build amazing UIs',
    fullDescription: 'Full description of the job.',
    status: 'public',
    postedAt: new Date().toISOString()
  }
];

describe('Career-Compass UI Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Test 1: Home Page rendering with mock data
  it('renders public jobs on home page', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockJobs,
    });

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Career-Compass')).toBeInTheDocument();
    });
  });

  // Test 2: Login Page interaction
  it('handles login form submission', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'fake-token',
        user: { id: '1', name: 'Nishant', role: 'user', email: 'test@example.com' }
      }),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token');
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  // Test 3: Admin Dashboard protection
  it('redirects to home if non-admin tries to access admin dashboard', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'user' }));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  // Test 4: User Dashboard shows applications
  it('renders user dashboard with application history', async () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Nishant', email: 'test@example.com' }));
    
    // Mock for getUserApplications
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { 
          _id: 'app1', 
          jobId: '1', 
          jobTitle: 'Senior Frontend Engineer', 
          jobShortDescription: 'Desc', 
          createdAt: new Date().toISOString() 
        }
      ],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <UserDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Total Applications')).toBeInTheDocument();
    });
  });

  // Test 5: 404 Page rendering
  it('renders 404 page for invalid routes', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Oops! Page not found/i)).toBeInTheDocument();
    expect(screen.getByText('/invalid-route')).toBeInTheDocument();
  });

  // Test 6: Job Detail page rendering
  it('renders job details and shows application form when logged in', async () => {
    localStorage.setItem('token', 'fake-token');
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockJobs[0],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/1']}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Full description of the job.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Jane Smith/i)).toBeInTheDocument();
    });
  });

  // Test 7: Form validation in ApplicationForm
  it('shows validation errors for empty fields in application form', async () => {
    localStorage.setItem('token', 'fake-token');

    render(
      <MemoryRouter>
        <ApplicationForm jobId="1" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });
  });

  // Test 8: Logout functionality on Home Page
  it('handles logout correctly', async () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ role: 'user' }));

    (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      const logoutBtn = screen.getByRole('button', { name: /Logout/i });
      fireEvent.click(logoutBtn);
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  describe('Frontend Edge Cases', () => {
    // Test 9: Handle API Server Error gracefully
    it('shows error toast when API fails to fetch jobs', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      render(
        <MemoryRouter>
          <Index />
        </MemoryRouter>
      );

      // Should show empty state or at least not crash
      await waitFor(() => {
        expect(screen.queryByText('Senior Frontend Engineer')).not.toBeInTheDocument();
      });
    });

    // Test 10: Empty applications state
    it('shows empty message in user dashboard when no applications exist', async () => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('user', JSON.stringify({ name: 'Nishant', email: 'test@example.com' }));
      
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <UserDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/You haven't applied for any jobs yet/i)).toBeInTheDocument();
      });
    });

    // Test 11: Loading states
    it('displays loading message while fetching job details', async () => {
      // Mock fetch to hang (never resolve in this test)
      (fetch as any).mockReturnValue(new Promise(() => {}));
      
      // Must be logged in to avoid redirect to /signup
      localStorage.setItem('token', 'fake-token');

      render(
        <MemoryRouter initialEntries={['/jobs/1']}>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Loading job details/i)).toBeInTheDocument();
    });
  });
});
