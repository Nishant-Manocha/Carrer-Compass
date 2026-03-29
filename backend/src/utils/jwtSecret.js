/**
 * JWT signing secret must come from the environment in production.
 * In NODE_ENV=test, a fixed value is used so Jest can run without a .env file.
 */
export function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "test") {
    return "test-only-jwt-secret-not-for-production";
  }
  throw new Error(
    "JWT_SECRET is not set. Copy backend/.env.example to backend/.env and set JWT_SECRET."
  );
}
