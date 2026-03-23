import { z } from "zod";

const serverEnvSchema = z.object({
  API_BASE_URL: z.url()
});

export const serverEnv = serverEnvSchema.parse(process.env);