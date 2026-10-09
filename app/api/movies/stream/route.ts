
import { NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Verify that the visitor is signed in.
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in to watch the movie.",
        },
        { status: 401 }
      );
    }

    // The movie is free. No purchase or Razorpay check is required.
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

    const r2 = getR2Client();

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

    return NextResponse.json(
      {
        success: true,
        url: signedUrl,
        expiresIn: 60 * 60,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Movie stream URL error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to open the movie. Please try again.",
      },
      { status: 500 }
    );
  }
}
