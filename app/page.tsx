"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Play,
  Search,
  User,
  Menu,
  X,
  Star,
  ChevronDown,
  ShieldCheck,
  MonitorPlay,
  Sparkles,
  ArrowRight,
  Users,
  Languages,
  BadgeCheck,
  Volume2,
  Maximize,
} from "lucide-react";

const MOVIE_ID = "avengers-doomsday";
const MOVIE_TITLE = "Avengers: Doomsday";
const MOVIE_PRICE = 19;

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Home() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [trailerOpen, setTrailerOpen] = useState(false);

  const [movieUnlocked, setMovieUnlocked] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [movieOpen, setMovieOpen] = useState(false);

  const [movieUrl, setMovieUrl] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [movieLoading, setMovieLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const trailerVideoRef = useRef<HTMLVideoElement>(null);

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(user);
      setAuthLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const nextUser = session?.user ?? null;

        setUser(nextUser);
        setAuthLoading(false);

        /*
          IMPORTANT:
          Every auth change re-checks movie ownership.

          This means:
          - Login  -> purchase status checked
          - Logout -> purchase state cleared
          - Session refresh -> purchase status checked again
        */

        if (!nextUser) {
          setMovieUnlocked(false);
          setCheckingPurchase(false);
          return;
        }

        await checkMoviePurchase();
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const isDoomsdaySearch =
    normalizedQuery.length > 0 &&
    ("avengers: doomsday".includes(normalizedQuery) ||
      "avengers doomsday".includes(normalizedQuery) ||
      "doomsday".includes(normalizedQuery) ||
      "avengers".includes(normalizedQuery) ||
      "marvel".includes(normalizedQuery));

  const hasSearch = normalizedQuery.length > 0;

  /* =========================================================
     CHECK MOVIE PURCHASE
  ========================================================= */

  const checkMoviePurchase = async () => {
    try {
      setCheckingPurchase(true);

      /*
        If there is no authenticated user, there is
        no reason to ask the purchase endpoint.
      */

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setMovieUnlocked(false);
        return;
      }

      const response = await fetch(
        `/api/movies/purchase-status?movieId=${encodeURIComponent(
          MOVIE_ID
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setMovieUnlocked(false);
        return;
      }

      const data = await response.json();

      setMovieUnlocked(Boolean(data.unlocked));
    } catch (error) {
      console.error("Purchase status error:", error);
      setMovieUnlocked(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  /*
    Initial purchase check.

    This runs after the page knows whether a user exists.
  */

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMovieUnlocked(false);
      setCheckingPurchase(false);
      return;
    }

    checkMoviePurchase();
  }, [authLoading, user]);

  /* =========================================================
     LOAD TRAILER
  ========================================================= */

  useEffect(() => {
    const loadTrailer = async () => {
      try {
        const response = await fetch("/api/trailer", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(
            data?.error || "Unable to load trailer."
          );
        }

        setTrailerUrl(data.url);
      } catch (error) {
        console.error("Trailer loading error:", error);
        setTrailerUrl(null);
      }
    };

    loadTrailer();
  }, []);

  /* =========================================================
     SEARCH AUTO FOCUS
  ========================================================= */

  useEffect(() => {
    if (!searchOpen) return;

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [searchOpen]);

  /* =========================================================
     KEYBOARD SHORTCUTS
  ========================================================= */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        event.key === "/" &&
        !searchOpen &&
        !trailerOpen &&
        !movieOpen &&
        target?.tagName !== "INPUT" &&
        target?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();

        setSearchOpen(true);
        setMenuOpen(false);
      }

      if (event.key === "Escape") {
        if (movieOpen) {
          closeMovie();
          return;
        }

        if (trailerOpen) {
          closeTrailer();
          return;
        }

        if (searchOpen) {
          closeSearch();
        }

        if (menuOpen) {
          setMenuOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    searchOpen,
    trailerOpen,
    menuOpen,
    movieOpen,
  ]);

  /* =========================================================
     BODY SCROLL LOCK
  ========================================================= */

  useEffect(() => {
    if (trailerOpen || movieOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [trailerOpen, movieOpen]);

  /* =========================================================
     SEARCH FUNCTIONS
  ========================================================= */

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;

    setSearchOpen(false);
    setMenuOpen(false);

    setTimeout(() => {
      document
        .getElementById("search-results-anchor")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 120);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openMobileSearch = () => {
    setMenuOpen(false);

    setTimeout(() => {
      setSearchOpen(true);
    }, 80);
  };

  /* =========================================================
     REQUIRE SIGN IN
  ========================================================= */

  const requireSignIn = () => {
    if (authLoading) return false;

    if (!user) {
      setMenuOpen(false);
      setSearchOpen(false);

      router.push("/sign-in");

      return false;
    }

    return true;
  };

  /* =========================================================
     TRAILER
  ========================================================= */

  const openTrailer = () => {
    /*
      NEW FLOW:
      Trailer always requires authentication.
    */

    if (!requireSignIn()) return;

    setMenuOpen(false);
    setSearchOpen(false);

    setTrailerOpen(true);

    setTimeout(() => {
      const video = trailerVideoRef.current;

      if (!video) return;

      video.currentTime = 0;

      video.play().catch(() => {});
    }, 120);
  };

  const closeTrailer = () => {
    const video = trailerVideoRef.current;

    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setTrailerOpen(false);

    setTimeout(() => {
      heroVideoRef.current?.play().catch(() => {});
    }, 100);
  };

  /* =========================================================
     OPEN UNLOCKED MOVIE
  ========================================================= */

  const openMovie = async () => {
    /*
      Authentication check first.
    */

    if (!requireSignIn()) return;

    /*
      Always re-check purchase before opening
      the actual movie stream.
    */

    setMovieLoading(true);

    try {
      const purchaseResponse = await fetch(
        `/api/movies/purchase-status?movieId=${encodeURIComponent(
          MOVIE_ID
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const purchaseData =
        await purchaseResponse.json();

      if (
        !purchaseResponse.ok ||
        !purchaseData.unlocked
      ) {
        setMovieUnlocked(false);

        /*
          User is logged in but has not purchased.
          Return to payment flow.
        */

        setMovieLoading(false);
        return;
      }

      setMovieUnlocked(true);

      setMenuOpen(false);
      setSearchOpen(false);
      setTrailerOpen(false);

      const response = await fetch(
        "/api/movies/stream",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(
          data?.error ||
            "Unable to start secure movie playback."
        );
      }

      setMovieUrl(data.url);
      setMovieOpen(true);

      setTimeout(() => {
        const video = document.getElementById(
          "full-movie-video"
        ) as HTMLVideoElement | null;

        video?.play().catch(() => {});
      }, 200);
    } catch (error) {
      console.error("Movie playback error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to open the movie."
      );
    } finally {
      setMovieLoading(false);
    }
  };

  const closeMovie = () => {
    const video = document.getElementById(
      "full-movie-video"
    ) as HTMLVideoElement | null;

    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setMovieOpen(false);
    setMovieUrl(null);

    setTimeout(() => {
      heroVideoRef.current?.play().catch(() => {});
    }, 100);
  };

  /* =========================================================
     RAZORPAY
  ========================================================= */

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  /* =========================================================
     FULL MOVIE CLICK
  ========================================================= */

  const handleFullMovieClick = async () => {
    /*
      NEW FLOW:
      Full movie also requires authentication.
    */

    if (!requireSignIn()) return;

    if (checkingPurchase || paymentLoading) return;

    /*
      Already purchased -> open movie.
    */

    if (movieUnlocked) {
      await openMovie();
      return;
    }

    /*
      Logged in but not purchased -> payment.
    */

    setPaymentLoading(true);

    try {
      const razorpayLoaded = await loadRazorpay();

      if (!razorpayLoaded) {
        alert(
          "Unable to load secure payment checkout. Please check your internet connection and try again."
        );

        return;
      }

      const orderResponse = await fetch(
        "/api/movies/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            movieId: MOVIE_ID,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData?.error ||
            "Unable to create payment order."
        );
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CINEINJAS",
        description: `${MOVIE_TITLE} — Full Movie`,
        order_id: orderData.orderId,

        theme: {
          color: "#111111",
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },

        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyResponse = await fetch(
              "/api/movies/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  movieId: MOVIE_ID,
                  razorpayPaymentId:
                    response.razorpay_payment_id,
                  razorpayOrderId:
                    response.razorpay_order_id,
                  razorpaySignature:
                    response.razorpay_signature,
                }),
              }
            );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              throw new Error(
                verifyData?.error ||
                  "Payment verification failed."
              );
            }

            /*
              Payment verified on server.
            */

            setMovieUnlocked(true);

            /*
              Re-check server-side purchase status
              before opening the movie.
            */

            await checkMoviePurchase();

            alert(
              "Payment successful! This movie is now unlocked for your account."
            );

            await openMovie();
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            alert(
              "Payment was received, but verification is still pending. Please refresh and check your movie access."
            );

            await checkMoviePurchase();
          } finally {
            setPaymentLoading(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        (response: any) => {
          console.error(
            "Razorpay payment failed:",
            response
          );

          alert(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setPaymentLoading(false);
        }
      );

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while opening payment."
      );

      setPaymentLoading(false);
    }
  };

  /* =========================================================
     BUTTON LABEL
  ========================================================= */

  const fullMovieButtonLabel = authLoading
    ? "Checking account..."
    : checkingPurchase
    ? "Checking access..."
    : paymentLoading
    ? "Opening secure payment..."
    : movieLoading
    ? "Opening secure movie..."
    : movieUnlocked
    ? "Watch Full Movie"
    : "Watch Full Movie · ₹19";

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#080808] text-white">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] min-h-[64px] max-w-[1400px] items-center px-4 sm:h-[72px] sm:px-8 lg:px-10 md:justify-between">

          {/* MOBILE MENU */}

          <button
            type="button"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setSearchOpen(false);
            }}
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 md:hidden"
          >
            {menuOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>

          {/* LOGO */}

          <a
            href="#home"
            onClick={() => {
              setMenuOpen(false);
              closeSearch();
            }}
            className="ml-2 flex shrink-0 items-center gap-2 md:ml-0"
          >
            <img
              src="/CINEINJAS.png"
              alt="CINEINJAS"
              className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
            />

            <span className="text-lg font-bold tracking-tight sm:text-xl">
              CINE
              <span className="text-white/40">
                INJAS
              </span>
            </span>
          </a>

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a
              href="#home"
              className="text-white transition hover:text-white"
            >
              Home
            </a>

            <a
              href="#movie"
              className="transition hover:text-white"
            >
              Movie
            </a>

            <a
              href="#details"
              className="transition hover:text-white"
            >
              Details
            </a>

            <a
              href="#faq"
              className="transition hover:text-white"
            >
              FAQ
            </a>
          </nav>

          {/* DESKTOP ACTIONS */}

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              aria-label={
                searchOpen
                  ? "Close movie search"
                  : "Search movies"
              }
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setMenuOpen(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                searchOpen
                  ? "border-white/25 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {searchOpen ? (
                <X size={18} />
              ) : (
                <Search size={18} />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  user ? "/profile" : "/sign-in"
                )
              }
              disabled={authLoading}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 disabled:opacity-60"
            >
              <User size={16} />

              {authLoading
                ? "..."
                : user
                ? "Profile"
                : "Sign In"}
            </button>
          </div>

          {/* MOBILE SEARCH */}

          <button
            type="button"
            aria-label={
              searchOpen
                ? "Close movie search"
                : "Search movies"
            }
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition md:hidden ${
              searchOpen
                ? "border-white/25 bg-white/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            {searchOpen ? (
              <X size={18} />
            ) : (
              <Search size={18} />
            )}
          </button>
        </div>

        {/* SEARCH */}

        {searchOpen && (
          <div className="border-t border-white/10 bg-black/95 px-4 py-4 backdrop-blur-2xl sm:px-8 sm:py-5 lg:px-10">
            <div className="mx-auto max-w-[1400px]">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                />

                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearchSubmit();
                    }
                  }}
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="Search movies..."
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-12 pr-12 text-base text-white outline-none placeholder:text-white/30 focus:border-white/20 sm:text-sm"
                />

                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchQuery("");

                      setTimeout(() => {
                        searchInputRef.current?.focus();
                      }, 50);
                    }}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {hasSearch && (
                <div className="mt-4">
                  {isDoomsdaySearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeSearch();

                        setTimeout(() => {
                          document
                            .getElementById("movie")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }, 120);
                      }}
                      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/5">
                          <Play
                            size={20}
                            fill="currentColor"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            Avengers: Doomsday
                          </p>

                          <p className="mt-1 truncate text-xs text-white/40">
                            Marvel Studios · Action · Adventure · Sci-Fi
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35">
                            <span className="flex items-center gap-1">
                              <Star
                                size={12}
                                fill="currentColor"
                              />
                              4.3
                            </span>

                            <span>
                              28K+ views
                            </span>
                          </div>
                        </div>
                      </div>

                      <ArrowRight
                        size={18}
                        className="shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-white"
                      />
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                          <Search
                            size={17}
                            className="text-white/35"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/75">
                            Currently unavailable
                          </p>

                          <p className="mt-1 text-xs leading-5 text-white/35">
                            No movie matching “
                            {searchQuery}” is currently
                            available on CINEINJAS.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!hasSearch && (
                <div className="pt-4 text-xs text-white/30">
                  Search for a movie, title, or keyword.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOBILE NAV */}

        {menuOpen && (
          <div className="border-t border-white/10 bg-black px-4 py-5 md:hidden">
            <nav className="flex flex-col gap-2 text-sm text-white/70">
              <a
                href="#home"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-white"
              >
                Home
              </a>

              <a
                href="#movie"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3"
              >
                Movie
              </a>

              <a
                href="#details"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3"
              >
                Details
              </a>

              <a
                href="#faq"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3"
              >
                FAQ
              </a>

              <div className="my-2 h-px bg-white/10" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(
                    user ? "/profile" : "/sign-in"
                  );
                }}
                disabled={authLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black disabled:opacity-60"
              >
                <User size={17} />

                {authLoading
                  ? "..."
                  : user
                  ? "Profile"
                  : "Sign In"}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        id="home"
        className="relative flex min-h-[650px] items-end overflow-hidden pt-[64px] sm:min-h-[790px] sm:pt-[72px]"
      >
        <div className="absolute inset-0 bg-black">
          <video
            ref={heroVideoRef}
            className="absolute inset-0 h-full w-full object-cover object-[center_25%] sm:object-center"
            src="/trailer.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,#080808_0%,rgba(8,8,8,0.88)_30%,rgba(8,8,8,0.48)_62%,rgba(8,8,8,0.25)_100%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(0deg,#080808_0%,rgba(8,8,8,0.78)_16%,rgba(8,8,8,0.12)_58%,rgba(8,8,8,0.38)_100%)]" />

          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute right-[4%] top-[12%] h-[560px] w-[560px] rounded-full bg-orange-500/[0.045] blur-3xl" />

          <div className="absolute right-[12%] top-[25%] h-[280px] w-[280px] rounded-full bg-red-500/[0.04] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-8 sm:pb-20 lg:px-10 lg:pb-28">
          <div className="max-w-[900px]">
            <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/55 sm:gap-3 sm:text-xs sm:tracking-[0.22em]">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                Marvel Studios
              </span>

              <span>2026</span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/45">
                Featured Movie
              </span>
            </div>

            <h1 className="text-[2.9rem] font-semibold leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
              AVENGERS:
              <br />
              <span className="text-white/45">
                DOOMSDAY
              </span>
            </h1>

            <p className="mt-6 max-w-[700px] text-[15px] leading-7 text-white/60 sm:mt-7 sm:text-lg">
              Beloved heroes from three distinct
              universes are set on a deadly collision
              course as they face an existential threat
              unlike anything they have ever
              encountered.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-xs text-white/60 sm:mt-7 sm:gap-x-5 sm:text-sm">
              <span className="flex items-center gap-2">
                <Star
                  size={15}
                  fill="currentColor"
                  className="text-white"
                />

                <strong className="font-semibold text-white">
                  4.3
                </strong>

                <span>/ 5</span>
              </span>

              <span className="flex items-center gap-2">
                <Users size={15} />
                28K+ views
              </span>

              <span>
                Action · Adventure
              </span>

              <span>
                Feature Film
              </span>
            </div>

            <div className="mt-8 grid max-w-[650px] gap-3 sm:mt-9 sm:grid-cols-2">

              {/* TRAILER */}

              <button
                type="button"
                onClick={openTrailer}
                className="group flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.07] px-5 font-semibold backdrop-blur transition hover:border-white/25 hover:bg-white/[0.12] active:bg-white/[0.16] sm:px-7"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition group-hover:scale-105">
                  <Play
                    size={15}
                    fill="currentColor"
                  />
                </span>

                Watch Trailer
              </button>

              {/* FULL MOVIE */}

              <button
                type="button"
                disabled={
                  authLoading ||
                  checkingPurchase ||
                  paymentLoading ||
                  movieLoading
                }
                onClick={handleFullMovieClick}
                className="group relative flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-5 font-semibold text-black transition hover:bg-white/90 active:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 sm:px-7"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />

                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                  <MonitorPlay size={15} />
                </span>

                <span className="relative">
                  {fullMovieButtonLabel}
                </span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-white/35 sm:gap-4 sm:text-xs">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} />
                Secure playback
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span>
                HD / 4K Quality
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span>
                Premium viewing
              </span>
            </div>
          </div>
        </div>
      </section>

      <div
        id="search-results-anchor"
        className="scroll-mt-24"
      />

      {/* =====================================================
          MOVIE INFO
      ===================================================== */}

      <section
        id="movie"
        className="scroll-mt-16 border-t border-white/10 bg-[#0b0b0b] sm:scroll-mt-20"
      >
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-14">

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-xs">
                About the movie
              </p>

              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                The Multiverse collides.
              </h2>

              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-white/55 sm:mt-6 sm:text-base sm:leading-8">
                Avengers: Doomsday brings together heroes
                from three distinct universes and places
                them on a collision course with an
                existential threat. The film is directed by
                Anthony Russo and Joe Russo and written by
                Stephen McFeely.
              </p>

              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-white/55 sm:text-base sm:leading-8">
                Robert Downey Jr. returns to the Marvel
                universe in a new role as Victor von Doom,
                while a huge ensemble of returning
                Avengers, Fantastic Four and X-Men
                characters joins the conflict.
              </p>

              <div className="mt-9 grid max-w-[800px] grid-cols-2 gap-x-6 gap-y-7 sm:mt-10 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-8">

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Rating
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <Star
                      size={15}
                      fill="currentColor"
                    />
                    4.3 / 5
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Audience
                  </p>

                  <p className="mt-2 text-sm text-white/75">
                    28K+ views
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Genre
                  </p>

                  <p className="mt-2 text-sm text-white/75">
                    Action · Adventure
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Style
                  </p>

                  <p className="mt-2 text-sm text-white/75">
                    Sci-Fi · Superhero
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Language
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                    <Languages size={15} />
                    English
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                    Experience
                  </p>

                  <p className="mt-2 text-sm text-white/75">
                    Feature Film
                  </p>
                </div>
              </div>
            </div>

            {/* WATCH CARD */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/45">
                  CINEINJAS Premiere
                </p>

                <Sparkles
                  size={18}
                  className="text-white/35"
                />
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Watch the movie.
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Your movie experience, built for a clean
                cinematic watch from start to finish.
              </p>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold">
                      4.3
                      <span className="text-sm font-normal text-white/35">
                        {" "}
                        / 5
                      </span>
                    </p>

                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <Star
                            key={star}
                            size={13}
                            fill={
                              star <= 4
                                ? "currentColor"
                                : "none"
                            }
                            className="text-white"
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-white/75">
                      28K+
                    </p>

                    <p className="text-xs text-white/35">
                      views
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className="space-y-3 text-sm text-white/55">
                <p className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Secure playback
                </p>

                <p className="flex items-center gap-2">
                  <MonitorPlay size={16} />
                  HD / 4K Quality
                </p>

                <p className="flex items-center gap-2">
                  <BadgeCheck size={16} />
                  Premium viewing
                </p>

                <p className="flex items-center gap-2">
                  <Play size={16} />
                  Full-length movie experience
                </p>
              </div>

              <button
                type="button"
                disabled={
                  authLoading ||
                  checkingPurchase ||
                  paymentLoading ||
                  movieLoading
                }
                onClick={handleFullMovieClick}
                className="mt-7 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-black transition hover:bg-white/90 active:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MonitorPlay size={18} />

                {fullMovieButtonLabel}
              </button>

              <button
                type="button"
                onClick={openTrailer}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
              >
                <Play size={16} />

                Watch Trailer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CAST
      ===================================================== */}

      <section
        id="details"
        className="scroll-mt-16 border-t border-white/10 bg-[#080808] sm:scroll-mt-20"
      >
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-20 lg:px-10">

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-xs">
            Cast & Credits
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Behind the movie
          </h2>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Directors",
                "Anthony Russo · Joe Russo",
              ],
              [
                "Written by",
                "Stephen McFeely",
              ],
              [
                "Produced by",
                "Kevin Feige · Louis D’Esposito",
              ],
              [
                "Studio",
                "Marvel Studios",
              ],
            ].map(([title, value]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
                  {title}
                </p>

                <p className="mt-3 text-sm leading-6 text-white/75">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 sm:mt-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 sm:text-xs">
              Featured Cast
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
              {[
                "Robert Downey Jr.",
                "Chris Evans",
                "Chris Hemsworth",
                "Pedro Pascal",
                "Anthony Mackie",
                "Paul Rudd",
                "Florence Pugh",
                "Vanessa Kirby",
                "Ebon Moss-Bachrach",
                "Simu Liu",
                "Tom Hiddleston",
                "Ian McKellen",
                "Patrick Stewart",
                "Channing Tatum",
                "Sebastian Stan",
                "Letitia Wright",
                "Joseph Quinn",
                "James Marsden",
                "David Harbour",
                "Winston Duke",
              ].map((actor) => (
                <span
                  key={actor}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs text-white/65 sm:px-4 sm:text-sm"
                >
                  {actor}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FAQ
      ===================================================== */}

      <section
        id="faq"
        className="scroll-mt-16 border-t border-white/10 bg-[#0b0b0b] sm:scroll-mt-20"
      >
        <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-8 sm:py-20">

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-xs">
              Questions
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Frequently asked
            </h2>
          </div>

          <div className="mt-8 divide-y divide-white/10 border-y border-white/10 sm:mt-10">
            {[
              "What is Avengers: Doomsday about?",
              "Where can I watch the trailer?",
              "Who is playing Doctor Doom?",
              "Who directed Avengers: Doomsday?",
              "Who is in the cast?",
            ].map((question) => (
              <button
                key={question}
                type="button"
                className="flex min-h-[68px] w-full items-center justify-between gap-5 py-5 text-left text-sm text-white/75 transition hover:text-white"
              >
                <span>{question}</span>

                <ChevronDown
                  size={18}
                  className="shrink-0 text-white/35"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-8 text-sm text-white/35 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">

          <div>
            © 2026 CINEINJAS. All rights reserved.
          </div>

          <div className="flex gap-6">
            <a
              href="#"
              className="transition hover:text-white"
            >
              Privacy
            </a>

            <a
              href="#"
              className="transition hover:text-white"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>

      {/* =====================================================
          TRAILER MODAL
      ===================================================== */}

      {trailerOpen && user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Avengers Doomsday trailer"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeTrailer();
            }
          }}
        >
          <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent px-4 pb-8 pt-4 sm:px-6 sm:pt-5">

            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 sm:text-[10px]">
                Official Trailer
              </p>

              <p className="mt-1 truncate text-sm font-medium text-white/90 sm:text-base">
                Avengers: Doomsday
              </p>
            </div>

            <button
              type="button"
              onClick={closeTrailer}
              aria-label="Close trailer"
              className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-xl transition hover:bg-white/15 sm:h-11 sm:w-11"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex max-h-[100svh] w-full items-center justify-center">
            <div className="relative w-full max-w-[1280px] overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-white/10">
              <video
                ref={trailerVideoRef}
                className="block aspect-video h-auto max-h-[100svh] w-full object-contain"
                src={trailerUrl ?? undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                controlsList="nodownload"
                onContextMenu={(event) =>
                  event.preventDefault()
                }
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-10 left-0 right-0 z-20 flex justify-center px-3 sm:bottom-12">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[9px] text-white/40 backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-2 sm:text-[10px]">

              <span className="flex items-center gap-1.5">
                <Play
                  size={10}
                  fill="currentColor"
                />
                Trailer
              </span>

              <span className="h-3 w-px bg-white/15" />

              <span className="flex items-center gap-1.5">
                <Volume2 size={10} />
                Sound on
              </span>

              <span className="hidden h-3 w-px bg-white/15 sm:block" />

              <span className="hidden items-center gap-1.5 sm:flex">
                <Maximize size={10} />
                Fullscreen
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FULL MOVIE MODAL
      ===================================================== */}

      {movieOpen && movieUnlocked && user && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Avengers Doomsday full movie"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeMovie();
            }
          }}
        >
          <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/60 to-transparent px-4 pb-10 pt-4 sm:px-6 sm:pt-5">

            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 sm:text-[10px]">
                Premium Playback
              </p>

              <p className="mt-1 truncate text-sm font-medium text-white/90 sm:text-base">
                {MOVIE_TITLE}
              </p>
            </div>

            <button
              type="button"
              onClick={closeMovie}
              aria-label="Close movie"
              className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-xl transition hover:bg-white/15 sm:h-11 sm:w-11"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex max-h-[100svh] w-full items-center justify-center">
            <div className="relative w-full max-w-[1400px] overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-white/10">
              <video
                id="full-movie-video"
                className="block aspect-video h-auto max-h-[100svh] w-full bg-black object-contain"
                src={movieUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                controlsList="nodownload"
                onContextMenu={(event) =>
                  event.preventDefault()
                }
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-20 flex justify-center px-3 sm:bottom-7">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[9px] text-white/40 backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-2 sm:text-[10px]">

              <span className="flex items-center gap-1.5">
                <BadgeCheck size={11} />
                Purchased
              </span>

              <span className="h-3 w-px bg-white/15" />

              <span>
                Premium viewing
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
