"use client";
import { useState, FormEvent } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Auth.module.css";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"oauth_google" | "oauth_tiktok" | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const socialSignIn = (strategy: "oauth_google" | "oauth_tiktok") => {
    if (!isLoaded) return;
    setSocialLoading(strategy);
    signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard",
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>V</div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your VakaBot account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : "Sign In"}
          </button>
        </form>

        <div className={styles.divider}>
          <div className={styles.line} />
          <span className={styles.dividerText}>or</span>
          <div className={styles.line} />
        </div>

        <div className={styles.socialGrid}>
          <button 
            onClick={() => socialSignIn("oauth_google")} 
            className={styles.socialBtn}
            disabled={socialLoading !== null}
          >
            {socialLoading === "oauth_google" ? (
              <span className={styles.spinner} style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white", width: "16px", height: "16px" }} />
            ) : (
              <>
                <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" width="20" />
                Google
              </>
            )}
          </button>
          <button 
            onClick={() => socialSignIn("oauth_tiktok")} 
            className={styles.socialBtn}
            disabled={socialLoading !== null}
          >
            {socialLoading === "oauth_tiktok" ? (
              <span className={styles.spinner} style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white", width: "16px", height: "16px" }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a6.447 6.447 0 0 1-1.88-1.57c-.01 2.63-.01 5.27-.02 7.91 0 1.69-.4 3.42-1.39 4.8-1.07 1.57-2.82 2.72-4.69 3.12-1.89.43-3.95.16-5.63-.82-1.78-1.01-3.08-2.84-3.52-4.83-.54-2.29-.01-4.81 1.43-6.67 1.05-1.39 2.59-2.38 4.31-2.74v4.13c-1.42.36-2.61 1.53-2.91 2.96-.34 1.42.13 3 1.25 3.95.95.83 2.3 1.15 3.52.82 1.22-.32 2.21-1.31 2.58-2.51.19-.62.24-1.28.24-1.93l-.01-14.15Z"/>
                </svg>
                TikTok
              </>
            )}
          </button>
        </div>

        <p className={styles.toggle}>
          Don't have an account?{" "}
          <Link to="/sign-up" className={styles.link}>Sign up</Link>
        </p>
        <div id="clerk-captcha"></div>
      </div>
    </div>
  );
}
