"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/profile");
  }, [loading, user, router]);

  async function loginGoogle() {
    setErr(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/profile");
    } catch (e: any) {
      setErr(e?.message ?? "Google Login fehlgeschlagen");
    }
  }

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      router.push("/profile");
    } catch (e: any) {
      setErr(e?.message ?? "E-Mail Login fehlgeschlagen");
    }
  }

  async function signupEmail() {
    setErr(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      router.push("/profile");
    } catch (e: any) {
      setErr(e?.message ?? "Signup fehlgeschlagen");
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>

      <button
        onClick={loginGoogle}
        className="w-full rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-80"
      >
        Mit Google anmelden
      </button>

      <div className="rounded-xl border p-4">
        <form onSubmit={loginEmail} className="space-y-3">
          <div>
            <label className="text-sm font-semibold">E-Mail</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Passwort</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
              required
            />
          </div>

          <button className="w-full rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-80">
            Einloggen
          </button>

          <button
            type="button"
            onClick={signupEmail}
            className="w-full rounded-xl border px-4 py-2 text-sm hover:opacity-80"
          >
            Konto erstellen
          </button>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </form>
      </div>
    </div>
  );
}

