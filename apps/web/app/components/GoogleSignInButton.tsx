"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

/** "Continue with Google" — only rendered when the Google OAuth
 *  provider is configured (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET). */
export default function GoogleSignInButton() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    getProviders().then((providers) => {
      if (active) setEnabled(Boolean(providers?.google));
    });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/properties" })}
      className="btn-ghost w-full !py-2.5"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l3.99-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.76c1.76 0 3.35.61 4.6 1.8l3.43-3.44A11.99 11.99 0 0 0 1.28 6.61l3.99 3.1c.95-2.84 3.6-4.95 6.73-4.95Z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
