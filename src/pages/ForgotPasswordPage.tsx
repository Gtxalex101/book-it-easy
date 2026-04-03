import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="appl-main" style={{ maxWidth: 400 }}>
      <h1>Forgot Password</h1>
      {error && <div className="appl-flash">{error}</div>}
      {sent ? (
        <div className="appl-flash-success">
          Password reset link sent! Check your email inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="appl-label">Email</label>
          <input
            type="email"
            className="appl-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
          <button type="submit" className="appl-btn w-full mt-6" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        <Link to="/login" className="appl-link">Back to Login</Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
