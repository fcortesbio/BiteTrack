import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment-specific .env file based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
const envFile = environment === 'development' ? '.env.development' : '.env';

dotenv.config({ path: resolve(__dirname, '..', envFile) });

export default dotenv;
