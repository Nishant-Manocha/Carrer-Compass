import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadResume, submitApplicationToBackend, ApiError } from '@/lib/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ApplicationFormProps {
  jobId: string;
  jobTitle?: string;
  jobShortDescription?: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  resume?: string;
}

export function ApplicationForm({ jobId, jobTitle, jobShortDescription }: ApplicationFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login or signup to apply");
      navigate("/signup", { state: { redirectTo: location.pathname } });
      return;
    }

    setSubmitError('');

    // Validate all
    const newErrors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!resumeFile) {
      newErrors.resume = 'Resume file is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanedName = name.trim();
      const cleanedEmail = email.trim();
      const cleanedPhone = phone.trim();

      const upload = await uploadResume({
        name: cleanedName,
        email: cleanedEmail,
        file: resumeFile!,
      });

      await submitApplicationToBackend({
        jobId,
        name: cleanedName,
        email: cleanedEmail,
        phone: cleanedPhone,
        resumeReference: upload.url,
        resumeUploadId: upload.id,
      });

      // Save to local storage
      const applications = JSON.parse(localStorage.getItem('myApplications') || '[]');
      applications.push({
        jobId,
        jobTitle: jobTitle || "Unknown Job",
        jobShortDescription: jobShortDescription || "No description available",
        name: cleanedName,
        email: cleanedEmail,
        phone: cleanedPhone,
        resumeUrl: upload.url,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('myApplications', JSON.stringify(applications));

      toast.success("Application submitted successfully!");
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.field) {
        // Show the message inline at the right field as well
        setErrors(prev => ({ ...prev, [err.field as keyof FieldErrors]: err.message }));
      }
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
            Application received
          </h3>
          <p className="text-sm text-muted-foreground">
            We typically respond within 48 hours.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-5 rounded-lg border border-border bg-card p-6"
        >
          <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
            Apply for this position
          </h3>

          {submitError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {submitError}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className={errors.name ? 'border-destructive ring-destructive' : ''}
            />
            {errors.name && (
              <motion.span initial={{ x: -4 }} animate={{ x: 0 }} className="text-xs text-destructive animate-shake">
                {errors.name}
              </motion.span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={errors.email ? 'border-destructive ring-destructive' : ''}
            />
            {errors.email && (
              <motion.span initial={{ x: -4 }} animate={{ x: 0 }} className="text-xs text-destructive animate-shake">
                {errors.email}
              </motion.span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit phone number"
              className={errors.phone ? 'border-destructive ring-destructive' : ''}
            />
            {errors.phone && (
              <motion.span initial={{ x: -4 }} animate={{ x: 0 }} className="text-xs text-destructive animate-shake">
                {errors.phone}
              </motion.span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resume">Resume</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-sm transition-colors hover:border-primary/50 ${
                errors.resume ? 'border-destructive' : 'border-border'
              } ${resumeFile ? 'bg-muted' : 'bg-card'}`}
            >
              <input
                ref={fileInputRef}
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setResumeFile(file);
                    setErrors(prev => ({ ...prev, resume: undefined }));
                  }
                }}
              />
              <span className="text-muted-foreground">
                {resumeFile ? resumeFile.name : 'Click to upload PDF, DOC, or DOCX'}
              </span>
            </div>
            {errors.resume && (
              <motion.span initial={{ x: -4 }} animate={{ x: 0 }} className="text-xs text-destructive animate-shake">
                {errors.resume}
              </motion.span>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
