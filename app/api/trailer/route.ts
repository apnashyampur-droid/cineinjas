import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: "trailers/trailer-full.mp4",
    });

    const url = await getSignedUrl(r2, command, {
      expiresIn: 60 * 60,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Trailer R2 error:", error);

    return NextResponse.json(
      { error: "Unable to load trailer." },
      { status: 500 }
    );
  }
}