import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchJobById } from '@/lib/backendClient';
import { Job } from '@/lib/types';
import { ApplicationForm } from '@/components/ApplicationForm';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login or signup to view job details");
      navigate("/signup", { state: { redirectTo: location.pathname } });
      return;
    }

    const loadJob = async () => {
      if (!id) {
        navigate("/404");
        return;
      }
      try {
        const data = await fetchJobById(id);
        setJob(data);
      } catch (error) {
        console.error("Failed to fetch job:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Job not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This position may have been removed or doesn't exist.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all jobs
          </Link>
        </div>
      </div>
    );
  }

  // Convert markdown-style bold to simple rendering
  const descriptionLines = job.fullDescription.split('\n');

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All positions
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
            {job.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <Users className="h-3.5 w-3.5" />
              {job.teamOrDepartment}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Posted {format(new Date(job.postedAt), 'MMM d, yyyy')}
            </span>
          </div>

          <div className="mt-8 text-sm leading-[1.6] text-foreground/90 text-pretty whitespace-pre-line">
            {descriptionLines.map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <p key={i} className="mt-4 mb-1 font-semibold text-foreground">
                    {line.replace(/\*\*/g, '')}
                  </p>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <p key={i} className="ml-4 before:content-['•'] before:mr-2 before:text-muted-foreground">
                    {line.slice(2)}
                  </p>
                );
              }
              return line ? <p key={i}>{line}</p> : <br key={i} />;
            })}
          </div>

          <div className="mt-10">
            <ApplicationForm jobId={job.id} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
