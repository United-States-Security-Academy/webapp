import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_STREAM_API_TOKEN: z.string().min(1),
  CLOUDFLARE_STREAM_SIGNING_KEY_ID: z.string().min(1),
  CLOUDFLARE_STREAM_SIGNING_KEY_PEM: z.string().min(1),
  CLOUDFLARE_STREAM_WEBHOOK_SECRET: z.string().min(1),

  // Optional: paid checkout isn't built yet (nothing in the codebase reads these), so requiring
  // them would fail the whole app's boot in any environment that hasn't set them.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  NEXT_PUBLIC_APP_URL: z.string().url(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables — see errors above.');
  }
  return parsed.data;
}

export const env = loadEnv();
