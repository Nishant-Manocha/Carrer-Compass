import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, index: true, trim: true },
    applicantEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    resumeReference: { type: String, required: true, trim: true },
    resumeUploadId: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeUpload" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

ApplicationSchema.index({ jobId: 1, applicantEmail: 1 }, { unique: true });

export const Application = mongoose.model("Application", ApplicationSchema);

