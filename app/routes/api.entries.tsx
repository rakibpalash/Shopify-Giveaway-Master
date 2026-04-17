import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createEntry } from "../models/entry.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loader = async (_: LoaderFunctionArgs) => {
  return new Response(null, { status: 405, headers: CORS_HEADERS });
};

// Handle CORS preflight
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { giveawayId, customerEmail, customerName, entryMethod } = body as Record<string, string>;

  if (!giveawayId || !customerEmail || !customerName) {
    return json(
      { error: "Missing required fields: giveawayId, customerEmail, customerName" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!EMAIL_RE.test(customerEmail)) {
    return json(
      { error: "Invalid email address" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (customerName.trim().length < 2) {
    return json(
      { error: "Name must be at least 2 characters" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    undefined;

  try {
    const entry = await createEntry({
      giveawayId,
      customerEmail: customerEmail.trim(),
      customerName: customerName.trim(),
      entryMethod: entryMethod ?? "widget",
      ipAddress: ip,
    });

    return json(
      { success: true, entryId: entry.id },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (err: any) {
    return json(
      { error: err.message },
      { status: 400, headers: CORS_HEADERS },
    );
  }
};
