import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPublicJobs } from "@/lib/backendClient";
import { Job } from "@/lib/types";
import { JobCard } from "@/components/JobCard";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [suggestedJobs, setSuggestedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const jobs = await fetchPublicJobs();
        // Show up to 3 random jobs as suggestions
        const shuffled = [...jobs].sort(() => 0.5 - Math.random());
        setSuggestedJobs(shuffled.slice(0, 3));
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSuggestions();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl w-full"
      >
        <div className="relative mb-8 inline-block">
          <h1 className="text-9xl font-extrabold text-primary/10 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="h-16 w-16 text-primary animate-pulse" />
          </div>
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
          Oops! Page not found
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          We couldn't find the page you're looking for at <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm">{location.pathname}</code>. 
          It might have been moved, deleted, or never existed.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Button variant="default" size="lg" onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" /> Go Home
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>

        {suggestedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-left"
          >
            <div className="flex items-center gap-2 mb-6 border-b pb-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Explore other opportunities</h3>
            </div>
            <div className="grid gap-4">
              {suggestedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="link" onClick={() => navigate("/")}>
                View all open positions
              </Button>
            </div>
          </motion.div>
        )}
        
        {loading && !suggestedJobs.length && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
