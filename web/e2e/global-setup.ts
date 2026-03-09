import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_E2E_EMAIL = "e2e.admin@crm-food-trading.local";
const DEFAULT_E2E_PASSWORD = "E2E-StrongPass!123";
const E2E_FULL_NAME = "E2E Admin";

function loadEnvFromFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;

    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function findUserIdByEmail(
  supabase: any,
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  // Paginate through users to avoid relying on a single page.
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    const users = (data.users ?? []) as Array<{ id: string; email: string | null }>;
    const match = users.find((user) => (user.email ?? "").toLowerCase() === normalized);
    if (match) return match.id;

    if (users.length < perPage) return null;
    page += 1;
  }
}

export default async function globalSetup() {
  loadEnvFromFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local.",
    );
  }

  const e2eEmail = process.env.E2E_USER_EMAIL ?? DEFAULT_E2E_EMAIL;
  const e2ePassword = process.env.E2E_USER_PASSWORD ?? DEFAULT_E2E_PASSWORD;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId = await findUserIdByEmail(supabase, e2eEmail);

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: e2ePassword,
      email_confirm: true,
      user_metadata: { full_name: E2E_FULL_NAME },
    });
    if (error) {
      throw new Error(`Failed to update E2E user: ${error.message}`);
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: e2eEmail,
      password: e2ePassword,
      email_confirm: true,
      user_metadata: { full_name: E2E_FULL_NAME },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create E2E user: ${error?.message ?? "unknown error"}`);
    }
    userId = data.user.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: E2E_FULL_NAME,
    role: "admin",
  });
  if (profileError) {
    throw new Error(`Failed to upsert E2E profile: ${profileError.message}`);
  }

  execSync("npm run seed:demo", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}
