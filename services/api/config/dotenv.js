import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monorepo structure: services/api/config/ -> root .env files
// Navigate up to monorepo root: ../../../
const MONOREPO_ROOT = resolve(__dirname, "../../..");

const environment = process.env.NODE_ENV ?? "production";
const envFile = environment === "development" ? ".env.development" : ".env";
const envPath = resolve(MONOREPO_ROOT, envFile);

// Load environment file
dotenv.config({ path: envPath });

// Optional: Development logging
if (environment === "development") {
  //   console.log("🔧 Environment loaded:", envFile);
  //   console.log("📁 From:", envPath);
}

export default dotenv;
