"use client";
import { SignUp } from "@clerk/clerk-react";
import styles from "./Auth.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "clerk-root",
              card: styles.clerkCard,
              headerTitle: styles.title,
              headerSubtitle: styles.subtitle,
              formButtonPrimary: styles.btn,
              footerActionLink: styles.link,
              identityPreviewText: { color: 'white' },
              formFieldLabel: styles.label,
              formFieldInput: styles.input,
              dividerLine: styles.line,
              dividerText: styles.dividerText,
              socialButtonsBlockButton: styles.socialBtn,
              socialButtonsBlockButtonText: { color: 'white' }
            }
          }}
          signInUrl="/"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}
