import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_DATA_API_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const user = searchParams.get("user");

  if (!user) {
    return NextResponse.json(
      { error: "User parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${POLYMARKET_API_URL}/positions?user=${user}`
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
