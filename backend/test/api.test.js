import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/index.js";
import { User } from "../src/models/User.js";
import { Job } from "../src/models/Job.js";
import { Application } from "../src/models/Application.js";
import { jest } from "@jest/globals";

// Mock the mailer
jest.unstable_mockModule("../src/utils/mailer.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
  sendOTPEmail: jest.fn().mockResolvedValue({ messageId: "test-otp-id" }),
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await User.deleteMany({});
  await Job.deleteMany({});
  await Application.deleteMany({});
});

describe("Backend Comprehensive Tests", () => {
  
  describe("Core API Tests", () => {
    test("GET /jobs list returns data", async () => {
      await Job.create({
        id: "test-job",
        title: "Test Job",
        teamOrDepartment: "Engineering",
        location: "Remote",
        shortDescription: "Short",
        fullDescription: "Full",
        status: "public"
      });
      const res = await request(app).get("/jobs");
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe("test-job");
    });

    test("GET /jobs/:id returns correct job", async () => {
      await Job.create({
        id: "job-123",
        title: "Specific Job",
        teamOrDepartment: "Design",
        location: "Remote",
        shortDescription: "Short",
        fullDescription: "Full",
        status: "public"
      });
      const res = await request(app).get("/jobs/job-123");
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("Specific Job");
    });

    test("GET /jobs/:id handles invalid ID", async () => {
      const res = await request(app).get("/jobs/non-existent");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Validation & Application Tests", () => {
    let testJob;
    beforeEach(async () => {
      testJob = await Job.create({
        id: "valid-job",
        title: "Valid Job",
        teamOrDepartment: "Sales",
        location: "Remote",
        shortDescription: "Short",
        fullDescription: "Full",
        status: "public"
      });
    });

    test("Reject application with missing required fields", async () => {
      const res = await request(app)
        .post("/applications")
        .send({ jobId: "valid-job" }); // Missing name, email, etc.
      expect(res.statusCode).toBe(400);
    });

    test("Allow valid application submission and save successfully", async () => {
      const res = await request(app)
        .post("/applications")
        .send({
          jobId: "valid-job",
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          resumeReference: "/resumes/test.pdf"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.applicantEmail).toBe("john@example.com");
      
      const saved = await Application.findOne({ applicantEmail: "john@example.com" });
      expect(saved).toBeDefined();
    }, 30000);

    test("Prevent duplicate application (same email + job)", async () => {
      const applicationData = {
        jobId: "valid-job",
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        resumeReference: "/resumes/test.pdf"
      };
      await request(app).post("/applications").send(applicationData);
      const res = await request(app).post("/applications").send(applicationData);
      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe("DUPLICATE_APPLICATION");
    }, 30000);

    test("Reject application for non-existing job", async () => {
      const res = await request(app)
        .post("/applications")
        .send({
          jobId: "invalid-job",
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          resumeReference: "/resumes/test.pdf"
        });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Authentication Flow Tests", () => {
    const userData = {
      name: "Auth Tester",
      email: "auth@example.com",
      password: "password123"
    };

    test("Complete Auth Flow: Signup -> Verify OTP -> Login", async () => {
      // 1. Signup
      const signupRes = await request(app).post("/auth/signup").send(userData);
      expect(signupRes.statusCode).toBe(200);
      expect(signupRes.body.message).toContain("OTP sent");

      // Get OTP from DB (since mailer is mocked)
      const user = await User.findOne({ email: userData.email });
      const otp = user.otp;

      // 2. Verify OTP
      const verifyRes = await request(app)
        .post("/auth/verify-otp")
        .send({ email: userData.email, otp });
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.token).toBeDefined();

      // 3. Login
      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: userData.email, password: userData.password });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    }, 30000); // Increase timeout to 30s

    test("Reject login for unverified user", async () => {
      await request(app).post("/auth/signup").send(userData);
      const res = await request(app)
        .post("/auth/login")
        .send({ email: userData.email, password: userData.password });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain("not verified");
    }, 30000);
  });

  describe("Edge Case & Security Tests", () => {
    test("Reject extremely large payload", async () => {
      const largeData = "a".repeat(1024 * 1024); // 1MB string
      const res = await request(app)
        .post("/auth/signup")
        .send({ name: largeData, email: "large@test.com", password: "123" });
      // Express default limit is usually 100kb, should return 413 or handled error
      expect([413, 400, 500]).toContain(res.statusCode);
    });

    test("Handle NoSQL Injection attempt in login", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: { "$gt": "" }, password: "any" });
      // Should be rejected by validation (400) or fail to find user (401)
      expect([400, 401]).toContain(res.statusCode);
    });

    test("Reject application with malformed email", async () => {
      const res = await request(app)
        .post("/applications")
        .send({
          jobId: "some-job",
          name: "Test",
          email: "not-an-email",
          phone: "123"
        });
      expect(res.statusCode).toBe(400);
    });

    test("Ensure 404 for completely random API routes", async () => {
      const res = await request(app).get("/api/v1/unknown/resource");
      expect(res.statusCode).toBe(404);
    });
  });
});
