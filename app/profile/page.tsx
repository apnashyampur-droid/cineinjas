"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Mail, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type UserData = {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !currentUser) {
        setUser(null);
        setLoading(false);
        router.replace("/sign-in");
        return;
      }

      const metadata = currentUser.user_metadata ?? {};

      setUser({
        id: currentUser.id,
        email: currentUser.email ?? "",
        name:
          metadata.full_name ??
          metadata.name ??
          currentUser.email?.split("@")[0] ??
          "User",
        avatar: metadata.avatar_url ?? metadata.picture ?? "",
      });

      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setLoading(false);

        router.replace("/");
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        setLoggingOut(false);
        return;
      }

      // Immediately clear the current profile state.
      setUser(null);

      // Make the Home page re-check the latest auth state.
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      {/* Header */}
      <header className="h-[72px] border-b border-white/[0.07] flex items-center">
        <div className="w-full max-w-[1100px] mx-auto px-5 sm:px-7 flex items-center justify-between">
          {/* Back */}
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to home"
            className="w-[38px] h-[38px] rounded-full border border-white/[0.08] bg-white/[0.035] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.07] transition-all"
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </button>

          {/* Logo */}
          <div className="text-[18px] font-black tracking-[-0.06em]">
            CINE<span className="text-white/40">INJAS</span>
          </div>

          {/* Right spacer keeps logo perfectly centered */}
          <div className="w-[38px]" />
        </div>
      </header>

      {/* Content */}
      <section className="min-h-[calc(100vh-72px)] flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[430px]">
          {/* Title */}
          <div className="mb-7">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-2">
              Account
            </p>

            <h1 className="text-[30px] sm:text-[34px] font-black tracking-[-0.05em]">
              Your Profile
            </h1>

            <p className="mt-2 text-[12px] leading-5 text-white/40">
              Manage your CINEINJAS account.
            </p>
          </div>

          {/* Profile Card */}
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-6">
            {/* User */}
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name ?? "Profile"}
                  className="w-[64px] h-[64px] rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-[64px] h-[64px] rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                  <UserRound size={27} className="text-white/60" />
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-[17px] font-bold truncate">
                  {user.name}
                </h2>

                <p className="mt-1 text-[11px] text-white/40 truncate">
                  Google account
                </p>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-7 space-y-3">
              {/* Email */}
              <div className="rounded-[16px] border border-white/[0.07] bg-black/20 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Mail
                    size={16}
                    strokeWidth={2}
                    className="text-white/35 shrink-0"
                  />

                  <div className="min-w-0">
                    <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-white/25">
                      Email
                    </p>

                    <p className="mt-1 text-[12px] text-white/75 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="rounded-[16px] border border-white/[0.07] bg-black/20 px-4 py-4">
                <div className="flex items-center gap-3">
                  <UserRound
                    size={16}
                    strokeWidth={2}
                    className="text-white/35 shrink-0"
                  />

                  <div className="min-w-0">
                    <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-white/25">
                      Name
                    </p>

                    <p className="mt-1 text-[12px] text-white/75 truncate">
                      {user.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-7 w-full h-[48px] rounded-[14px] border border-white/[0.1] bg-white text-black text-[11px] font-black tracking-[0.08em] uppercase flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} strokeWidth={2.2} />

              {loggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
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