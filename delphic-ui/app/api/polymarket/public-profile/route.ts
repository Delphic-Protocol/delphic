import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_API_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${POLYMARKET_API_URL}/public-profile?address=${address}`
    );

    // Handle 404 - user not found
    if (response.status === 404) {
      return NextResponse.json({ user: null });
    }

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch public profile" },
      { status: 500 }
    );
  }
}