import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { Job } from "./models/Job.js";
import { Application } from "./models/Application.js";
import { ResumeUpload } from "./models/ResumeUpload.js";
import authRoutes from "./routes/auth.js";
import { authenticateToken, isAdmin } from "./middleware/auth.js";
import { sendEmail } from "./utils/mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { User } from "./models/User.js";
import bcrypt from "bcryptjs";

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/career_compass";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://carrer-compass-m82y.vercel.app";
const corsAllowList = CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .map((s) => s.replace(/\/$/, "")) // Remove trailing slashes
  .filter(Boolean);

const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}_${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    cb(ok ? null : new Error("Only PDF, DOC, DOCX allowed"), ok);
  }
});

// Triggering fresh build for SMTP fix: 2026-03-19 14:15
const app = express();
app.use(morgan("dev"));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server / curl / same-origin requests
      if (!origin) return cb(null, true);

      // allow any localhost port during development (Vite may switch ports)
      const isLocalhost =
        /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
      if (isLocalhost) return cb(null, true);

      // allow explicit list from env (comma-separated)
      if (corsAllowList.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

// Make files accessible
app.use("/resumes", express.static(uploadsDir));

app.use("/auth", authRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Admin: Get all jobs (including drafts)
app.get("/admin/jobs", authenticateToken, isAdmin, async (_req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).lean();
  res.json(jobs);
});

// Admin: Add new job
app.post("/admin/jobs", authenticateToken, isAdmin, async (req, res) => {
  const { title, teamOrDepartment, location, shortDescription, fullDescription, status } = req.body;

  if (!title || !teamOrDepartment || !location || !shortDescription || !fullDescription) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Generate a simple ID if not provided (keeping with the existing pattern)
  const id = Math.random().toString(36).substring(2, 9);

  const job = await Job.create({
    id,
    title,
    teamOrDepartment,
    location,
    shortDescription,
    fullDescription,
    status: status || "public"
  });

  res.status(201).json(job);
});

// Admin: Update job
app.put("/admin/jobs/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const job = await Job.findOneAndUpdate({ id }, updates, { new: true });
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json(job);
});

// Admin: Delete job
app.delete("/admin/jobs/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const job = await Job.findOneAndDelete({ id });
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json({ message: "Job deleted successfully" });
});

// Admin: Get all applications
app.get("/admin/applications", authenticateToken, isAdmin, async (_req, res) => {
  const applications = await Application.find().sort({ createdAt: -1 }).lean();
  res.json(applications);
});

// User: Get my applications
app.get("/my-applications", authenticateToken, async (req, res) => {
  const email = req.user.email;
  const applications = await Application.find({ applicantEmail: email }).sort({ createdAt: -1 }).lean();
  
  // Enhance applications with job details
  const enhancedApplications = await Promise.all(
    applications.map(async (app) => {
      const job = await Job.findOne({ id: app.jobId }).lean();
      return {
        ...app,
        jobTitle: job ? job.title : "Unknown Job",
        jobShortDescription: job ? job.shortDescription : "N/A"
      };
    })
  );
  
  res.json(enhancedApplications);
});

// Jobs (minimal)
app.get("/jobs", async (_req, res) => {
  const jobs = await Job.find({ status: "public" }).sort({ createdAt: -1 }).lean();
  res.json(
    jobs.map((j) => ({
      id: j.id,
      title: j.title,
      team: j.teamOrDepartment, // Ensure team field is present for frontend
      teamOrDepartment: j.teamOrDepartment,
      location: j.location,
      shortDescription: j.shortDescription,
      fullDescription: j.fullDescription,
      status: j.status,
      postedAt: j.createdAt
    }))
  );
});

// Get single job (public)
app.get("/jobs/:id", async (req, res) => {
  const { id } = req.params;
  const job = await Job.findOne({ id, status: "public" }).lean();
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({
    id: job.id,
    title: job.title,
    team: job.teamOrDepartment,
    teamOrDepartment: job.teamOrDepartment,
    location: job.location,
    shortDescription: job.shortDescription,
    fullDescription: job.fullDescription,
    status: job.status,
    postedAt: job.createdAt
  });
});

// User uploads resume
// POST /upload  (multipart/form-data) fields: name, email, file
app.post("/upload", upload.single("file"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const file = req.file;

  if (!name) return res.status(400).json({ error: "Name is required", field: "name" });
  if (!email) return res.status(400).json({ error: "Email is required", field: "email" });
  if (!file) return res.status(400).json({ error: "Resume file is required", field: "resume" });

  const doc = await ResumeUpload.create({
    name,
    email,
    fileName: file.filename,
    filePath: file.path
  });

  res.status(201).json({
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    fileName: doc.fileName,
    url: `/resumes/${doc.fileName}`
  });
});

// Recruiter fetches resumes
// GET /resumes -> return all user data from MongoDB
app.get("/resumes", async (_req, res) => {
  const rows = await ResumeUpload.find().sort({ createdAt: -1 }).lean();
  res.json(
    rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      email: r.email,
      fileName: r.fileName,
      url: `/resumes/${r.fileName}`,
      createdAt: r.createdAt
    }))
  );
});

// Save application on submit + validate duplicates
// POST /applications
app.post("/applications", async (req, res) => {
  const {
    jobId,
    name,
    email,
    phone,
    resumeReference,
    resumeUploadId
  } = req.body || {};

  const cleanedName = String(name || "").trim();
  const cleanedEmail = String(email || "").trim().toLowerCase();
  const cleanedPhone = String(phone || "").trim().replace(/\D/g, '');
  const cleanedResumeRef = String(resumeReference || "").trim();

  if (!jobId) return res.status(400).json({ error: "Job ID is required", field: "jobId" });
  if (!cleanedName) return res.status(400).json({ error: "Name is required", field: "name" });
  if (cleanedName.length < 2) return res.status(400).json({ error: "Name must be at least 2 characters long", field: "name" });
  if (!cleanedEmail) return res.status(400).json({ error: "Email is required", field: "email" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) return res.status(400).json({ error: "Invalid email format", field: "email" });
  if (!cleanedPhone) return res.status(400).json({ error: "Phone is required", field: "phone" });
  if (cleanedPhone.length !== 10) return res.status(400).json({ error: "Phone number must be exactly 10 digits", field: "phone" });
  if (!cleanedResumeRef) return res.status(400).json({ error: "Resume is required", field: "resume" });

  const job = await Job.findOne({ id: String(jobId), status: "public" }).lean();
  if (!job) return res.status(404).json({ error: "Job not found" });

  try {
    const created = await Application.create({
      jobId: String(jobId),
      applicantEmail: cleanedEmail,
      name: cleanedName,
      email: cleanedEmail,
      phone: cleanedPhone,
      resumeReference: cleanedResumeRef,
      resumeUploadId: resumeUploadId || undefined
    });

    // Send application confirmation email
    await sendEmail(
      cleanedEmail,
      "Job Application Received - Career-Compass",
      `Hi ${cleanedName},\n\nThank you for applying for the position (ID: ${jobId}). We've received your application and will review it shortly.\n\nBest regards,\nCareer-Compass Team`
    );

    res.status(201).json({
      id: String(created._id),
      jobId: created.jobId,
      applicantEmail: created.applicantEmail,
      name: created.name,
      email: created.email,
      phone: created.phone,
      resumeReference: created.resumeReference,
      createdAt: created.createdAt
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: "Email already applied for this position.",
        field: "email",
        code: "DUPLICATE_APPLICATION"
      });
    }
    throw err;
  }
});

app.use((err, _req, res, _next) => {
  // Multer errors: file too large, invalid mimetype, etc.
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Resume must be under 10MB.", field: "resume", code: "FILE_TOO_LARGE" });
    }
    return res.status(400).json({ error: "File upload failed.", field: "resume", code: "UPLOAD_FAILED" });
  }

  const msg = err?.message || "Internal server error";
  if (msg.includes("Only PDF")) {
    return res.status(400).json({ error: "Only PDF, DOC, or DOCX files are allowed.", field: "resume", code: "INVALID_FILE_TYPE" });
  }

  res.status(500).json({ error: msg });
});

async function ensureSeedAdmins() {
  const adminEmails = ["admin@gmail.com"];
  for (const email of adminEmails) {
    const existingAdmin = await User.findOne({ email });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "System Admin",
        email,
        password: hashedPassword,
        role: "admin",
        isVerified: true
      });
      // eslint-disable-next-line no-console
      console.log(`Seed: Created admin account for ${email}`);
    }
  }
}

async function ensureSeedJobs() {
  const seedJobs = [
    {
      id: "1",
      title: "Senior Frontend Engineer",
      teamOrDepartment: "Engineering",
      location: "San Francisco, CA",
      shortDescription: "Build beautiful, performant interfaces for our core product.",
      fullDescription:
        "We're looking for a Senior Frontend Engineer to join our Engineering team. You'll work closely with design and product to build pixel-perfect, accessible interfaces that delight our users.\n\n**Responsibilities:**\n- Architect and implement complex UI features using React and TypeScript\n- Collaborate with designers to translate Figma specs into production code\n- Mentor junior engineers and conduct code reviews\n- Drive frontend best practices across the organization\n\n**Requirements:**\n- 5+ years of experience with React and TypeScript\n- Strong understanding of web performance optimization\n- Experience with design systems and component libraries\n- Excellent communication skills",
      status: "public"
    },
    {
      id: "2",
      title: "Product Designer",
      teamOrDepartment: "Design",
      location: "Remote (US)",
      shortDescription: "Shape the future of our product experience.",
      fullDescription:
        "Join our Design team to create intuitive, beautiful experiences that make complex workflows feel simple.\n\n**Responsibilities:**\n- Own the end-to-end design process from research to final implementation\n- Create wireframes, prototypes, and high-fidelity designs in Figma\n- Conduct user research and usability testing\n- Maintain and evolve our design system\n\n**Requirements:**\n- 4+ years of product design experience\n- Strong portfolio demonstrating UX problem-solving\n- Proficiency with Figma and prototyping tools\n- Experience working in agile, cross-functional teams",
      status: "public"
    },
    {
      id: "3",
      title: "Backend Engineer",
      teamOrDepartment: "Engineering",
      location: "New York, NY",
      shortDescription: "Design and build scalable APIs and data infrastructure.",
      fullDescription:
        "We need a Backend Engineer to help scale our infrastructure and build reliable, performant APIs.\n\n**Responsibilities:**\n- Design and implement RESTful and GraphQL APIs\n- Optimize database queries and data models\n- Build monitoring and alerting systems\n- Participate in on-call rotations\n\n**Requirements:**\n- 3+ years of backend development experience\n- Proficiency with Node.js and TypeScript\n- Experience with PostgreSQL or similar relational databases\n- Understanding of distributed systems concepts",
      status: "public"
    },
    {
      id: "4",
      title: "Internal Tools Developer",
      teamOrDepartment: "Engineering",
      location: "San Francisco, CA",
      shortDescription: "Build internal tooling to improve team productivity.",
      fullDescription: "This is a draft job posting that should not appear publicly.",
      status: "draft"
    },
    {
      id: "5",
      title: "Head of Marketing",
      teamOrDepartment: "Marketing",
      location: "Remote (Global)",
      shortDescription: "Lead our marketing strategy and brand positioning.",
      fullDescription:
        "We're hiring a Head of Marketing to drive our go-to-market strategy and build a world-class marketing team.\n\n**Responsibilities:**\n- Define and execute the overall marketing strategy\n- Build and manage a high-performing marketing team\n- Drive brand awareness and lead generation\n- Measure and optimize marketing ROI\n\n**Requirements:**\n- 8+ years in B2B SaaS marketing\n- Proven track record of scaling marketing teams\n- Strong analytical and strategic thinking skills\n- Excellent written and verbal communication",
      status: "public"
    }
  ];

  await Job.bulkWrite(
    seedJobs.map((j) => ({
      updateOne: {
        filter: { id: j.id },
        update: { $set: j },
        upsert: true
      }
    }))
  );
}

export { app };

async function main() {
  if (process.env.NODE_ENV === "test") return;
  
  try {
    await mongoose.connect(MONGO_URI);
    // eslint-disable-next-line no-console
    console.log(`Connected to MongoDB: ${MONGO_URI.split('@').pop()}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MongoDB Connection Error Details:");
    // eslint-disable-next-line no-console
    if (err.code === 'ENOTFOUND') {
      console.error("\nTIP: This is a DNS error. Please check internet/VPN/DNS settings.");
    }
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on :${PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

