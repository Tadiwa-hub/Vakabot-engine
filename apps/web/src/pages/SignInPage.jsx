import { SignIn } from "@clerk/clerk-react";
import styles from "./Auth.module.css";

const SignInPage = () => {
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.brandHeader}>
          <div className={styles.logoPill}>V</div>
          <h1 className={styles.brandName}>Velo AI</h1>
        </div>
        
        <div className={styles.pitchText}>
          <h2>Welcome Back</h2>
          <p>Sign in to your AI command center.</p>
        </div>

        <SignIn 
          appearance={{
            layout: {
              socialButtonsVariant: "blockButton",
              socialButtonsPlacement: "bottom",
              logoPlacement: "none",
            },
            variables: {
              colorPrimary: "#000000",
              colorBackground: "#ffffff",
              colorText: "#000000",
              colorTextSecondary: "#6b7280",
              colorInputBackground: "#f9fafb",
              colorInputText: "#000000",
              colorBorder: "#e5e7eb",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif"
            },
            elements: {
              rootBox: {
                width: "100%",
                display: "flex",
                justifyContent: "center",
              },
              card: {
                border: "none !important",
                boxShadow: "none !important",
                background: "transparent !important",
                width: "100% !important",
                maxWidth: "320px", /* More conservative for narrow phones */
                padding: "0 !important",
                margin: "0 auto",
              },
              header: { display: "none" },
              main: {
                width: "100%",
                paddingTop: "2.5rem !important", /* Extra room above the first label */
              },
              form: {
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem", /* Increased from 1.25rem */
              },
              formFieldInput: {
                borderRadius: "14px !important",
                width: "100% !important",
                padding: "0.75rem 1rem !important",
                border: "1px solid #e5e7eb !important",
                backgroundColor: "#f9fafb !important",
                transition: "all 0.2s ease",
                "&:focus": {
                  borderColor: "#000000 !important",
                  backgroundColor: "#ffffff !important",
                }
              },
              socialButtonsBlockButton: {
                border: "1px solid #e5e7eb !important",
                background: "#ffffff !important",
                borderRadius: "14px !important",
                width: "100% !important",
                height: "3rem !important",
              },
              formButtonPrimary: {
                background: "#000000 !important",
                borderRadius: "14px !important",
                width: "100% !important",
                height: "3rem !important",
                textTransform: "none !important",
                fontWeight: "700 !important",
                fontSize: "1rem !important",
              },
              footerActionLink: {
                color: "#000000 !important",
                fontWeight: "700 !important",
              },
              formFieldLabel: {
                fontWeight: "600 !important",
                fontSize: "0.85rem !important",
                marginBottom: "0.5rem !important", /* Increased from 0.25rem */
                display: "block !important",
                textAlign: "left !important",
              }
            }
          }}
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
};

export default SignInPage;
