import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// AES-256-GCM encryption helper
function encryptMockToken(plaintext, keyHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  let enc = cipher.update(plaintext, "utf8", "base64");
  enc += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return {
    encrypted: enc,
    iv: iv.toString("base64"),
    authTag,
  };
}

async function main() {
  console.log("Seeding VETO AGENT database...");

  const keyHex =
    process.env.TOKEN_VAULT_ENCRYPTION_KEY ||
    "d0d509b2abb793af966bbd458baee1a3925a197be298e41e338fd7dbc80a2d68";

  // 1. Create or update Demo User
  const email = "alex.builder@vetoagent.local";
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Alex Builder (Demo User)",
      passwordHash,
    },
    create: {
      name: "Alex Builder (Demo User)",
      email,
      passwordHash,
      role: "admin",
      authProviderId: "demo",
    },
  });

  console.log(`User created: ${user.name} (${user.email})`);

  // 2. Create Google Calendar Connected Account in Token Vault
  const encAccess = encryptMockToken("demo_live_calendar_access_token_mock_seed", keyHex);
  const encRefresh = encryptMockToken("demo_live_calendar_refresh_token_mock_seed", keyHex);

  const account = await prisma.connectedAccount.upsert({
    where: {
      userId_provider: {
        userId: user.id,
        provider: "google_calendar",
      },
    },
    update: {
      connectionStatus: "CONNECTED",
      isDemo: true,
      scopes: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      accountEmail: "alex.builder@company-workspace.internal",
      lastSyncAt: new Date(),
    },
    create: {
      userId: user.id,
      provider: "google_calendar",
      providerAccountId: `google_${user.id}`,
      accountEmail: "alex.builder@company-workspace.internal",
      scopes: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      connectionStatus: "CONNECTED",
      isDemo: true,
      lastSyncAt: new Date(),
    },
  });

  await prisma.vaultCredential.upsert({
    where: { connectedAccountId: account.id },
    update: {
      encryptedAccessToken: encAccess.encrypted,
      encryptedRefreshToken: `${encRefresh.encrypted}:${encRefresh.iv}:${encRefresh.authTag}`,
      iv: encAccess.iv,
      authTag: encAccess.authTag,
      expiresAt: new Date(Date.now() + 3600 * 24 * 14 * 1000), // 14 days
      encryptionVersion: "aes-256-gcm-v1",
      lastRefreshedAt: new Date(),
    },
    create: {
      connectedAccountId: account.id,
      encryptedAccessToken: encAccess.encrypted,
      encryptedRefreshToken: `${encRefresh.encrypted}:${encRefresh.iv}:${encRefresh.authTag}`,
      iv: encAccess.iv,
      authTag: encAccess.authTag,
      expiresAt: new Date(Date.now() + 3600 * 24 * 14 * 1000),
      encryptionVersion: "aes-256-gcm-v1",
      lastRefreshedAt: new Date(),
    },
  });

  console.log("Token Vault credential created & encrypted with AES-256-GCM.");

  // 3. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "VAULT_TOKEN_STORED",
      provider: "google_calendar",
      resourceType: "TOKEN_VAULT",
      outcome: "SUCCESS",
      metadata: JSON.stringify({
        provider: "google_calendar",
        mode: "demo_seed",
        scopes: account.scopes,
      }),
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

