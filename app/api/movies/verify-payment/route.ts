import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MOVIE_ID = "avengers-doomsday";
const MOVIE_PRICE = 19;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      movieId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    // ---------------------------------------------------------
    // 1. Validate request
    // ---------------------------------------------------------

    if (
      !movieId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing payment verification details.",
        },
        { status: 400 }
      );
    }

    if (movieId !== MOVIE_ID) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid movie.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Razorpay credentials
    // ---------------------------------------------------------

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay environment variables.");

      return NextResponse.json(
        {
          success: false,
          error: "Payment gateway is not configured.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 3. Make sure user is signed in
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
          error: "You must be signed in to complete this purchase.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 4. Verify Razorpay signature
    // ---------------------------------------------------------

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const receivedBuffer = Buffer.from(
      razorpaySignature,
      "utf8"
    );

    const generatedBuffer = Buffer.from(
      generatedSignature,
      "utf8"
    );

    if (
      receivedBuffer.length !== generatedBuffer.length ||
      !crypto.timingSafeEqual(
        generatedBuffer,
        receivedBuffer
      )
    ) {
      console.error("Invalid Razorpay signature.");

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 5. Verify actual Razorpay order/payment
    // ---------------------------------------------------------

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.fetch(
      razorpayOrderId
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay order not found.",
        },
        { status: 400 }
      );
    }

    // ₹5 = 500 paise
    if (
      Number(order.amount) !== MOVIE_PRICE * 100 ||
      order.currency !== "INR"
    ) {
      console.error("Unexpected Razorpay order:", {
        orderId: razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment amount could not be verified.",
        },
        { status: 400 }
      );
    }

    const payment = await razorpay.payments.fetch(
      razorpayPaymentId
    );

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment not found.",
        },
        { status: 400 }
      );
    }

    // Make sure payment belongs to this order.
    if (payment.order_id !== razorpayOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment and order do not match.",
        },
        { status: 400 }
      );
    }

    // Only unlock after captured payment.
    if (payment.status !== "captured") {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `Payment is not captured. Current status: ${payment.status}`,
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 6. Create server-side Supabase admin client
    // ---------------------------------------------------------

    const adminSupabase = createAdminClient();

    // ---------------------------------------------------------
    // 7. Check whether this payment was already processed
    // ---------------------------------------------------------

    const {
      data: existingPurchase,
      error: existingError,
    } = await adminSupabase
      .from("movie_purchases")
      .select("id, status")
      .eq(
        "razorpay_payment_id",
        razorpayPaymentId
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing purchase lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check existing purchase.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 8. Don't insert duplicate payment
    // ---------------------------------------------------------

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        verified: true,
        unlocked: existingPurchase.status === "paid",
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        alreadyProcessed: true,
      });
    }

    // ---------------------------------------------------------
    // 9. Save verified purchase
    // ---------------------------------------------------------

    const { error: insertError } = await adminSupabase
      .from("movie_purchases")
      .insert({
        user_id: user.id,
        movie_id: movieId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount: Number(payment.amount),
        currency: payment.currency || "INR",
        status: "paid",
      });

    if (insertError) {
      console.error(
        "Purchase insert error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was verified, but purchase could not be saved.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 10. Everything succeeded
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      verified: true,
      unlocked: true,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      alreadyProcessed: false,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        verified: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}