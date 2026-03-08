import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_API_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";

  try {
    const response = await fetch(
      `${POLYMARKET_API_URL}/events?limit=${limit}&offset=${offset}&closed=false&featured=true`
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();

    // Ensure we return an array
    const events = Array.isArray(data) ? data : [];

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}