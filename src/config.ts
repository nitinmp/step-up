/**
 * App configuration — edit values here.
 * This project keeps secrets in config on purpose (small private app).
 */
export const appConfig = {
  databaseUrl:
    "postgresql://neondb_owner:npg_PAo38eDRKfcg@ep-wandering-butterfly-aikw0j34.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
  authSecret: "nv2EtQsB8Aw_-xHQBxVLvBFPnGZJmxV3H709_Y9cKz4",
  admin: {
    name: "Challenge Admin",
    mobile: "9392909888",
    password: "shriganesh007",
  },
  timezone: "Asia/Kolkata",
  // Vercel Blob → Store → read-write token
  blobReadWriteToken: "",
} as const;
