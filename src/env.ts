// Must be the first import of the entry point so config and Prisma see `.env` values.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}
