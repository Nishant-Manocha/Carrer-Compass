import { Job } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.info("Please signup or login to view and apply for this job.");
      navigate('/signup', { state: { redirectTo: `/jobs/${job.id}` } });
    } else {
      navigate(`/jobs/${job.id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        onClick={handleClick}
        className="block cursor-pointer rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
      >
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-card-foreground">
              {job.title}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {job.teamOrDepartment}
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-pretty leading-relaxed">
              {job.shortDescription}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="h-3 w-3" />
              {job.postedAt ? format(new Date(job.postedAt), 'MMM d') : 'Recently'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
