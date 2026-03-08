import { createClient } from "@supabase/supabase-js";
import { Address, getAddress } from "viem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

export class SupabaseUsersService {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUser(address: Address) {
    console.log('[SupabaseUsersService] getUser called with address:', address);
    const { data, error } = await this.supabase
      .from("users")
      .select("user_address, safe_address")
      .eq("user_address", getAddress(address))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        console.log('[SupabaseUsersService] getUser: User not found for address:', address);
        return null;
      }
      console.error('[SupabaseUsersService] getUser error:', error);
      throw error;
    }

    console.log('[SupabaseUsersService] getUser: Found user:', data);
    return {
      address: data.user_address,
      safeAddress: data.safe_address,
    };
  }

  async upsertUser(address: Address, safeAddress: string) {
    console.log('[SupabaseUsersService] upsertUser called with address:', address, 'safeAddress:', safeAddress);
    const { error } = await this.supabase.from("users").upsert({
      user_address: getAddress(address),
      safe_address: safeAddress,
    });

    if (error) {
      console.error('[SupabaseUsersService] upsertUser error:', error);
      throw error;
    }
    console.log('[SupabaseUsersService] upsertUser: Successfully upserted user');
  }
}

export const supabaseUsersService = new SupabaseUsersService();
