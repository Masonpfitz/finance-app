import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";
import { plaidEnvName, plaidConfigured } from "./env";

/** Built fresh from the environment each call, so keys saved on the setup screen work immediately. */
export function plaidClient(overrides?: { clientId: string; secret: string; env: "sandbox" | "production" }): PlaidApi {
  const clientId = overrides?.clientId ?? process.env.PLAID_CLIENT_ID ?? "";
  const secret = overrides?.secret ?? process.env.PLAID_SECRET ?? "";
  const env = overrides?.env ?? plaidEnvName();
  // Developer hook for automated tests: with PLAID_ENV=sandbox, PLAID_BASE_URL may point at a Plaid
  // look-alike running on this computer. Anything else is ignored, so real keys can't be redirected.
  const testBase = process.env.PLAID_BASE_URL;
  const basePath = env === "sandbox" && testBase && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(testBase) ? testBase : PlaidEnvironments[env];
  return new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: { headers: { "PLAID-CLIENT-ID": clientId, "PLAID-SECRET": secret } },
    }),
  );
}

export function requirePlaid(): PlaidApi {
  if (!plaidConfigured()) throw new Error("Plaid keys are not set yet. Open the setup page and paste your client ID and secret.");
  return plaidClient();
}

/**
 * Read-only by design: the only product requested is Transactions. Balances come with any
 * connected account. No payment, transfer or identity products are ever requested, so this
 * app cannot move money.
 */
export async function createLinkToken(overrides?: Parameters<typeof plaidClient>[0]): Promise<string> {
  const client = overrides ? plaidClient(overrides) : requirePlaid();
  const res = await client.linkTokenCreate({
    user: { client_user_id: "local-user" },
    client_name: "Finance App",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    transactions: { days_requested: 730 },
  });
  return res.data.link_token;
}

export function plaidErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error_code?: string; error_message?: string } }; message?: string };
  const d = e?.response?.data;
  if (d?.error_code === "INVALID_API_KEYS" || d?.error_code === "INVALID_CLIENT_ID" || d?.error_code === "INVALID_SECRET")
    return "Plaid did not accept those keys. Check that the client ID and the secret match the environment you picked (Sandbox or Production), then try again.";
  return d?.error_message ?? d?.error_code ?? e?.message ?? String(err);
}
