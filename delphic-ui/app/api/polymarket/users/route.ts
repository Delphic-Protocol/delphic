import { NextRequest, NextResponse } from "next/server";
import { supabaseUsersService } from "@/lib/supabase/SupabaseUsersService";
import { Address } from "viem";

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
    const userData = await supabaseUsersService.getUser(address as Address);

    if (!userData) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        address: userData.address,
        proxyWallet: userData.safeAddress
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}