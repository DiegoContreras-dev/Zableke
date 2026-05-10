import { AuthError } from "@/backend/common/errors/auth.error";
import { SignJWT, importPKCS8 } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FORMS_URL = "https://forms.googleapis.com/v1/forms";
const SCOPE = "https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleFormCreateResult {
  formId: string;
  formUrl: string;
  formEditUrl: string;
}

export interface GoogleFormsClient {
  createForm(title: string): Promise<GoogleFormCreateResult>;
  batchUpdateForm(formId: string, requests: unknown[]): Promise<Record<string, unknown>>;
  getResponses(formId: string): Promise<Record<string, unknown>[]>;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new AuthError(`${name} is required for Google Forms integration`, "INVALID_STATE", 500);
  }
  return value;
}

export class ServiceAccountFormsClient implements GoogleFormsClient {
  private accessToken: string | null = null;
  private expiresAt = 0;

  async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) return this.accessToken;

    const email = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
    const key = await importPKCS8(privateKey, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(email)
      .setSubject(email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new AuthError("Google authentication failed", "GOOGLE_VERIFY_ERROR", 502);
    }

    const token = (await response.json()) as TokenResponse;
    this.accessToken = token.access_token;
    this.expiresAt = Date.now() + Math.max(token.expires_in - 60, 60) * 1000;
    return this.accessToken;
  }

  async createForm(title: string): Promise<GoogleFormCreateResult> {
    const json = await this.request<Record<string, unknown>>(FORMS_URL, {
      method: "POST",
      body: JSON.stringify({ info: { title } }),
    });
    const formId = typeof json.formId === "string" ? json.formId : "";
    if (!formId) throw new AuthError("Google did not return a formId", "GOOGLE_VERIFY_ERROR", 502);
    return {
      formId,
      formUrl: `https://docs.google.com/forms/d/${formId}/viewform`,
      formEditUrl: `https://docs.google.com/forms/d/${formId}/edit`,
    };
  }

  async batchUpdateForm(formId: string, requests: unknown[]): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`${FORMS_URL}/${formId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }

  async getResponses(formId: string): Promise<Record<string, unknown>[]> {
    const json = await this.request<Record<string, unknown>>(`${FORMS_URL}/${formId}/responses`, {
      method: "GET",
    });
    return Array.isArray(json.responses) ? (json.responses as Record<string, unknown>[]) : [];
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const token = await this.authenticate();
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new AuthError(`Google Forms request failed (${response.status})`, "GOOGLE_VERIFY_ERROR", 502);
    }
    return (await response.json()) as T;
  }
}
