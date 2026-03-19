import { JobCard } from '@/components/JobCard';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { fetchPublicJobs } from '@/lib/backendClient';
import { Job } from '@/lib/types';

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const item = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function Index() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await fetchPublicJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const goToDashboard = () => {
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <img src="/CareerCompass logo design concept.png" alt="Career-Compass Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold">Career-Compass</span>
          </div>
          <div className="flex gap-3">
            {token ? (
              <>
                <Button variant="outline" onClick={goToDashboard}>
                  {user.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                </Button>
                <Button variant="ghost" onClick={logout}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Login</Button>
                <Button onClick={() => navigate('/signup')}>Sign Up</Button>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10"
        >
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance text-center">
            Help us build the future of work
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {jobs.length} open {jobs.length === 1 ? 'position' : 'positions'}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {jobs.map(job => (
            <motion.div key={job.id} variants={item}>
              <JobCard job={job} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
