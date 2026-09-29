import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const MOVIE_ID = "avengers-doomsday";
const MOVIE_PRICE = 19;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.movieId !== MOVIE_ID) {
      return NextResponse.json(
        {
          error: "Invalid movie.",
        },
        {
          status: 400,
        }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay environment variables.");

      return NextResponse.json(
        {
          error: "Razorpay is not configured on the server.",
        },
        {
          status: 500,
        }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: MOVIE_PRICE * 100,
      currency: "INR",
      receipt: `cineinjas-${Date.now()}`,
      notes: {
        movieId: MOVIE_ID,
      },
    });

    return NextResponse.json({
      success: true,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Create movie order error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create payment order.",
      },
      {
        status: 500,
      }
    );
  }
}