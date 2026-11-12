import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await TokenVaultService.getVaultOverview(user.id);
  const encryptionKeyConfigured = Boolean(
    process.env.TOKEN_VAULT_ENCRYPTION_KEY &&
      process.env.TOKEN_VAULT_ENCRYPTION_KEY.length >= 32
  );

  return NextResponse.json({
    vaultStatus: {
      isConfigured: true,
      encryptionAlgorithm: "AES-256-GCM",
      encryptionVersion: "aes-256-gcm-v1",
      encryptionKeyConfigured,
      zeroPlaintextGuarantee: true,
      credentials: overview,
    },
  });
}
