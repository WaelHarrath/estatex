"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      redirect: false,
      email: String(form.get("email")),
      password: String(form.get("password"))
    });

    if (result?.error) {
      setError("Invalid email or password");
      setPending(false);
      return;
    }
    router.push("/properties");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <div className="glass keyline corner rounded-xl p-8 sm:p-10">
        <p className="eyebrow">EstateX member</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-porcelain">Sign in</h1>
        <p className="mt-2 text-sm text-porcelain-soft">Welcome back. The floor is open.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-porcelain-soft">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-md border border-hairline bg-abyss-deep px-3 py-2.5 text-porcelain placeholder:text-porcelain-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-porcelain-soft">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-md border border-hairline bg-abyss-deep px-3 py-2.5 text-porcelain placeholder:text-porcelain-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>
          {error && <p className="text-sm text-ember">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-hairline" />
          <span className="figure text-[0.6rem] uppercase tracking-[0.24em] text-porcelain-faint">
            or continue with
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-sm text-porcelain-faint">
          New to EstateX?{" "}
          <Link href="/register" className="text-gold transition hover:text-gold-bright">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
