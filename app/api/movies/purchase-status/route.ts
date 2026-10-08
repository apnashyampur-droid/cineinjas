import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MOVIE_ID = "avengers-doomsday";

export async function GET(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Get movie ID from request
    // ---------------------------------------------------------

    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");

    if (!movieId || movieId !== MOVIE_ID) {
      return NextResponse.json(
        {
          unlocked: false,
          error: "Invalid movie.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Verify currently signed-in user
    // ---------------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        unlocked: false,
      });
    }

    // ---------------------------------------------------------
    // 3. Use server-side admin client for purchase lookup
    // ---------------------------------------------------------

    const adminSupabase = createAdminClient();

    const {
      data: purchase,
      error: purchaseError,
    } = await adminSupabase
      .from("movie_purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (purchaseError) {
      console.error(
        "Purchase status error:",
        purchaseError
      );

      return NextResponse.json(
        {
          unlocked: false,
          error: "Unable to check purchase status.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 4. Return unlock status
    // ---------------------------------------------------------

    return NextResponse.json({
      unlocked: !!purchase,
    });
  } catch (error) {
    console.error(
      "Purchase status route error:",
      error
    );

    return NextResponse.json(
      {
        unlocked: false,
        error: "Unable to check purchase status.",
      },
      { status: 500 }
    );
  }
}