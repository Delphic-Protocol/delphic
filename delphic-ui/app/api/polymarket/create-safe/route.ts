import { NextRequest, NextResponse } from "next/server";
import { polymarketService } from "@/lib/polymarket/PolymarketService";
import { supabaseUsersService } from "@/lib/supabase/SupabaseUsersService";
import { Address } from "viem";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Derive the Safe address from the user's wallet
    const safeAddress = polymarketService.deriveSafe(address as Address);

    // Check if Safe is already deployed
    const isDeployed = await polymarketService.isSafeDeployed(safeAddress);
    if (isDeployed) {
      return NextResponse.json({
        success: true,
        safeAddress,
        alreadyDeployed: true,
        message: "Safe already deployed",
      });
    }

    // Create the Safe via the relayer
    const result = await polymarketService.createSafe(address as Address, signature);

    // Store user and safe address in Supabase
    await supabaseUsersService.upsertUser(address as Address, result.safeAddress);

    return NextResponse.json({
      success: true,
      safeAddress: result.safeAddress,
      transactionID: result.transactionID,
      transactionHash: result.transactionHash,
      alreadyDeployed: false,
    });
  } catch (error) {
    console.error("Error creating safe:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create safe" },
      { status: 500 }
    );
  }
}
