
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.warn(
      `[API CATCH-ALL] Received an unexpected POST request to the root ('/api') endpoint. This may indicate a misconfigured webhook. Body:`,
      body
    );
  } catch (error) {
    console.warn(
      `[API CATCH-ALL] Received an unexpected POST request to the root ('/api') endpoint with a non-text body.`
    );
  }

  return NextResponse.json(
    {
      error:
        "Method Not Allowed. This endpoint does not accept POST requests. If you are setting up a webhook, please use the specific API endpoint provided (e.g., /api/stripe-webhook).",
    },
    { status: 405 }
  );
}
