import mongoose from "mongoose";

const ResumeUploadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true }
  },
  { timestamps: true }
);

export const ResumeUpload = mongoose.model("ResumeUpload", ResumeUploadSchema);

