import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";

export interface StoreTokenParams {
  userId: string;
  provider: string; // e.g. "google_calendar"
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scopes: string[] | string;
  accountEmail?: string;
  providerAccountId: string;
  isDemo?: boolean;
}

export interface DecryptedCredential {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes: string[];
  accountEmail?: string | null;
  providerAccountId: string;
  isDemo: boolean;
}

export interface ConnectionStatusResult {
  connected: boolean;
  provider: string;
  accountEmail?: string | null;
  scopes: string[];
  isDemo: boolean;
  isExpired: boolean;
  expiresAt?: Date | null;
  lastSyncAt?: Date | null;
  credentialId?: string;
}

export class TokenVaultService {
  /**
   * Encrypts and stores an OAuth token in the secure Token Vault.
   * Plaintext tokens are encrypted with AES-256-GCM before writing to the database.
   */
  static async storeToken(params: StoreTokenParams): Promise<string> {
    const {
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresInSeconds,
      scopes,
      accountEmail,
      providerAccountId,
      isDemo = false,
    } = params;

    // Encrypt access token
    const encryptedAccess = encryptToken(accessToken);

    // Encrypt refresh token if present
    let encryptedRefreshStr: string | null = null;
    if (refreshToken) {
      // In this format, we store ciphertext:iv:authTag
      const enc = encryptToken(refreshToken);
      encryptedRefreshStr = `${enc.encrypted}:${enc.iv}:${enc.authTag}`;
    }

    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : new Date(Date.now() + 3600 * 1000); // default 1 hour

    const scopeStr = Array.isArray(scopes) ? scopes.join(" ") : scopes;

    // Upsert ConnectedAccount
    const connectedAccount = await prisma.connectedAccount.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      update: {
        providerAccountId,
        accountEmail: accountEmail || null,
        scopes: scopeStr,
        connectionStatus: "CONNECTED",
        isDemo,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        provider,
        providerAccountId,
        accountEmail: accountEmail || null,
        scopes: scopeStr,
        connectionStatus: "CONNECTED",
        isDemo,
        lastSyncAt: new Date(),
      },
    });

    // Upsert VaultCredential
    const vaultCredential = await prisma.vaultCredential.upsert({
      where: {
        connectedAccountId: connectedAccount.id,
      },
      update: {
        encryptedAccessToken: encryptedAccess.encrypted,
        encryptedRefreshToken: encryptedRefreshStr,
        iv: encryptedAccess.iv,
        authTag: encryptedAccess.authTag,
        expiresAt,
        encryptionVersion: encryptedAccess.version,
        lastRefreshedAt: new Date(),
      },
      create: {
        connectedAccountId: connectedAccount.id,
        encryptedAccessToken: encryptedAccess.encrypted,
        encryptedRefreshToken: encryptedRefreshStr,
        iv: encryptedAccess.iv,
        authTag: encryptedAccess.authTag,
        expiresAt,
        encryptionVersion: encryptedAccess.version,
        lastRefreshedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId,
      action: "VAULT_TOKEN_STORED",
      provider,
      resourceType: "TOKEN_VAULT",
      resourceId: vaultCredential.id,
      outcome: "SUCCESS",
      metadata: {
        scopes: scopeStr,
        isDemo,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return vaultCredential.id;
  }

  /**
   * Securely retrieves and decrypts the OAuth credential for internal backend usage.
   * This is never returned to the frontend or exposed to the AI model.
   */
  static async getToken(
    userId: string,
    provider: string
  ): Promise<DecryptedCredential | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      include: {
        vaultCredential: true,
      },
    });

    if (!account || !account.vaultCredential) {
      return null;
    }

    if (account.connectionStatus !== "CONNECTED") {
      return null;
    }

    const { vaultCredential } = account;

    // Decrypt access token
    const accessToken = decryptToken({
      encrypted: vaultCredential.encryptedAccessToken,
      iv: vaultCredential.iv,
      authTag: vaultCredential.authTag,
    });

    // Decrypt refresh token if present
    let refreshToken: string | null = null;
    if (vaultCredential.encryptedRefreshToken) {
      const parts = vaultCredential.encryptedRefreshToken.split(":");
      if (parts.length === 3) {
        refreshToken = decryptToken({
          encrypted: parts[0],
          iv: parts[1],
          authTag: parts[2],
        });
      }
    }

    await logAuditEvent({
      userId,
      action: "VAULT_TOKEN_RETRIEVED",
      provider,
      resourceType: "TOKEN_VAULT",
      resourceId: vaultCredential.id,
      outcome: "SUCCESS",
      metadata: {
        providerAccountId: account.providerAccountId,
        isDemo: account.isDemo,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: vaultCredential.expiresAt,
      scopes: account.scopes.split(" ").filter(Boolean),
      accountEmail: account.accountEmail,
      providerAccountId: account.providerAccountId,
      isDemo: account.isDemo,
    };
  }

  /**
   * Refreshes an expired token using its encrypted refresh token.
   */
  static async refreshToken(
    userId: string,
    provider: string
  ): Promise<DecryptedCredential | null> {
    const credential = await this.getToken(userId, provider);
    if (!credential) return null;

    if (credential.isDemo) {
      // In demo mode, simulate successful token rotation
      const newMockAccessToken = `demo_access_token_${Date.now()}`;
      await this.storeToken({
        userId,
        provider,
        accessToken: newMockAccessToken,
        refreshToken: credential.refreshToken || undefined,
        expiresInSeconds: 3600,
        scopes: credential.scopes,
        accountEmail: credential.accountEmail || undefined,
        providerAccountId: credential.providerAccountId,
        isDemo: true,
      });

      await logAuditEvent({
        userId,
        action: "VAULT_TOKEN_REFRESHED",
        provider,
        resourceType: "TOKEN_VAULT",
        outcome: "SUCCESS",
        metadata: { isDemo: true },
      });

      return this.getToken(userId, provider);
    }

    // For real Google OAuth:
    if (provider === "google_calendar" && credential.refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Missing Google OAuth credentials for refresh");
      }

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: credential.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        await logAuditEvent({
          userId,
          action: "VAULT_TOKEN_REFRESHED",
          provider,
          resourceType: "TOKEN_VAULT",
          outcome: "FAILURE",
          metadata: { error: errorText },
        });
        throw new Error(`Failed to refresh Google token: ${errorText}`);
      }

      const data = await res.json();
      await this.storeToken({
        userId,
        provider,
        accessToken: data.access_token,
        refreshToken: credential.refreshToken, // keep existing refresh token if not returned
        expiresInSeconds: data.expires_in,
        scopes: credential.scopes,
        accountEmail: credential.accountEmail || undefined,
        providerAccountId: credential.providerAccountId,
        isDemo: false,
      });

      await logAuditEvent({
        userId,
        action: "VAULT_TOKEN_REFRESHED",
        provider,
        resourceType: "TOKEN_VAULT",
        outcome: "SUCCESS",
        metadata: { refreshedAt: new Date().toISOString() },
      });

      return this.getToken(userId, provider);
    }

    return null;
  }

  /**
   * Revoke credentials at the remote provider and mark as revoked locally.
   */
  static async revokeToken(userId: string, provider: string): Promise<boolean> {
    const cred = await this.getToken(userId, provider);

    if (cred && !cred.isDemo && provider === "google_calendar") {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${cred.accessToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch (e) {
        console.warn("Could not revoke token with remote provider:", e);
      }
    }

    await prisma.connectedAccount.updateMany({
      where: { userId, provider },
      data: { connectionStatus: "DISCONNECTED" },
    });

    await logAuditEvent({
      userId,
      action: "VAULT_TOKEN_REVOKED",
      provider,
      resourceType: "TOKEN_VAULT",
      outcome: "SUCCESS",
    });

    return true;
  }

  /**
   * Delete token and connected account permanently.
   */
  static async deleteToken(userId: string, provider: string): Promise<boolean> {
    const account = await prisma.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider } },
    });

    if (!account) return false;

    await prisma.connectedAccount.delete({
      where: { id: account.id },
    });

    await logAuditEvent({
      userId,
      action: "OAUTH_DISCONNECTED",
      provider,
      resourceType: "TOKEN_VAULT",
      outcome: "SUCCESS",
    });

    return true;
  }

  /**
   * Returns safe connection status for UI display (Zero tokens exposed).
   */
  static async getConnectionStatus(
    userId: string,
    provider: string
  ): Promise<ConnectionStatusResult> {
    const account = await prisma.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider } },
      include: { vaultCredential: true },
    });

    if (!account || !account.vaultCredential) {
      return {
        connected: false,
        provider,
        scopes: [],
        isDemo: false,
        isExpired: false,
      };
    }

    const isExpired = account.vaultCredential.expiresAt
      ? account.vaultCredential.expiresAt.getTime() < Date.now()
      : false;

    return {
      connected: account.connectionStatus === "CONNECTED",
      provider: account.provider,
      accountEmail: account.accountEmail,
      scopes: account.scopes.split(" ").filter(Boolean),
      isDemo: account.isDemo,
      isExpired,
      expiresAt: account.vaultCredential.expiresAt,
      lastSyncAt: account.lastSyncAt,
      credentialId: account.vaultCredential.id,
    };
  }

  /**
   * Get overall Token Vault status for the user
   */
  static async getVaultOverview(userId: string) {
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      include: {
        vaultCredential: {
          select: {
            id: true,
            expiresAt: true,
            encryptionVersion: true,
            lastRefreshedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return accounts.map((acc) => ({
      provider: acc.provider,
      accountEmail: acc.accountEmail,
      connectionStatus: acc.connectionStatus,
      isDemo: acc.isDemo,
      scopes: acc.scopes.split(" ").filter(Boolean),
      lastSyncAt: acc.lastSyncAt,
      vaultInfo: acc.vaultCredential
        ? {
            id: acc.vaultCredential.id,
            expiresAt: acc.vaultCredential.expiresAt,
            encryptionVersion: acc.vaultCredential.encryptionVersion,
            lastRefreshedAt: acc.vaultCredential.lastRefreshedAt,
            isExpired: acc.vaultCredential.expiresAt
              ? acc.vaultCredential.expiresAt.getTime() < Date.now()
              : false,
          }
        : null,
    }));
  }
}
