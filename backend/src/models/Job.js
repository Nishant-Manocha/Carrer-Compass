import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    teamOrDepartment: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ["draft", "public", "closed"], default: "public" }
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", JobSchema);

