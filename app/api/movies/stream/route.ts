import { NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MOVIE_ID = "avengers-doomsday";
const MOVIE_OBJECT_KEY = "movies/avengers-doomsday.mp4";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 environment variables are missing.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function GET() {
  try {
    // ---------------------------------------------------------
    // 1. Verify signed-in user
    // ---------------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Verify paid movie purchase
    // ---------------------------------------------------------

    const adminSupabase = createAdminClient();

    const { data: purchase, error: purchaseError } =
      await adminSupabase
        .from("movie_purchases")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("movie_id", MOVIE_ID)
        .eq("status", "paid")
        .limit(1)
        .maybeSingle();

    if (purchaseError) {
      console.error("Movie purchase lookup error:", purchaseError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify movie access.",
        },
        { status: 500 }
      );
    }

    if (!purchase) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie purchase required.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 3. Validate R2 configuration
    // ---------------------------------------------------------

    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      console.error("Missing R2_BUCKET_NAME.");

      return NextResponse.json(
        {
          success: false,
          error: "Movie storage is not configured.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 4. Create R2 client
    // ---------------------------------------------------------

    const r2 = getR2Client();

    // ---------------------------------------------------------
    // 5. Create a temporary signed URL
    //
    // IMPORTANT:
    // We DO NOT download the movie here.
    // The browser will download/stream it directly from R2.
    // ---------------------------------------------------------

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: MOVIE_OBJECT_KEY,
      ResponseContentType: "video/mp4",
      ResponseContentDisposition:
        'inline; filename="avengers-doomsday.mp4"',
    });

    const signedUrl = await getSignedUrl(r2, command, {
      expiresIn: 60 * 60,
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      expiresIn: 60 * 60,
    });
  } catch (error) {
    console.error("Movie stream URL error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create movie playback URL.",
      },
      { status: 500 }
    );
  }
}
