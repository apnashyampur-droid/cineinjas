"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(error);
        setLoading(false);
        setError("Unable to continue with Google. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Unable to continue with Google. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] text-white">

      {/* HEADER */}
      <header className="border-b border-white/[0.06] bg-[#070707]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-10">

          {/* LOGO */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <Image
              src="/CINEINJAS.png"
              alt="CINEINJAS"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-full object-cover"
            />

            <div className="leading-none text-left">
              <div className="text-[18px] font-black tracking-[-0.06em]">
                CINE<span className="text-white/40">INJAS</span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[7.5px] font-bold tracking-[0.14em] text-white/40">
                <span>MOVIES</span>
                <span className="text-white/30">•</span>
                <span>STREAM</span>
                <span className="text-white/30">•</span>
                <span>WATCH</span>
              </div>
            </div>
          </button>

          {/* BACK */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-[10px] font-bold text-white/60 transition hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white sm:text-[11px]"
          >
            Back
          </button>

        </div>
      </header>

      {/* MAIN */}
      <section className="flex min-h-[calc(100vh-70px)] items-center justify-center px-5 py-10 sm:px-8">

        <div className="w-full max-w-[430px]">

          {/* CARD */}
          <div className="rounded-[30px] border border-white/[0.08] bg-[#111111] p-6 shadow-[0_25px_80px_rgba(0,0,0,.45)] sm:p-9">

            {/* BRAND */}
            <div className="flex items-center gap-3">

              <Image
                src="/CINEINJAS.png"
                alt="CINEINJAS"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />

              <div className="leading-none">

                <div className="text-[14px] font-black tracking-[-0.05em]">
                  CINE<span className="text-white/40">INJAS</span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[6.5px] font-bold tracking-[0.12em] text-white/35">
                  <span>MOVIES</span>
                  <span className="text-white/25">•</span>
                  <span>STREAM</span>
                  <span className="text-white/25">•</span>
                  <span>WATCH</span>
                </div>

              </div>

            </div>

            {/* SIGN IN */}
            <div className="mt-9">

              <h1 className="text-[30px] font-black leading-[1] tracking-[-0.05em] sm:text-[34px]">
                Welcome back
              </h1>

              <p className="mt-3 max-w-[340px] text-[12px] leading-5 text-white/45">
                Sign in to continue watching movies and unlock your premium content.
              </p>

              {/* GOOGLE BUTTON */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="mt-8 flex h-[54px] w-full items-center justify-center gap-3 rounded-[15px] border border-white/[0.10] bg-white text-[12px] font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <span className="flex items-center gap-2">

                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-black" />

                    Connecting...

                  </span>
                ) : (
                  <>
                    {/* GOOGLE ICON */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"
                      />

                      <path
                        fill="#34A853"
                        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.71-5.46-4.01H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z"
                      />

                      <path
                        fill="#FBBC05"
                        d="M6.54 13.85A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.85V7.62H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.38l3.24-2.53Z"
                      />

                      <path
                        fill="#EA4335"
                        d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.18 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.37l3.24 2.53 3.24 2.53C7.31 7.85 9.46 6.14 12 6.14Z"
                      />
                    </svg>

                    Continue with Google
                  </>
                )}

              </button>

              {/* ERROR */}
              {error && (
                <p className="mt-3 text-center text-[10px] font-semibold text-red-400">
                  {error}
                </p>
              )}

              {/* INFO */}
              <p className="mt-5 text-center text-[9px] font-medium leading-4 text-white/30">
                Continue securely with your Google account.
              </p>

            </div>

          </div>

          {/* FOOTER */}
          <div className="mt-6 text-center">

            <p className="text-[9px] font-semibold text-white/25">
              © 2026{" "}
              <span className="text-white">CINE</span>
              <span className="text-white/40">INJAS</span>
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}