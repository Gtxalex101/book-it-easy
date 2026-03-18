import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Registration successful! Check your email to confirm, or login now.");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="appl-main" style={{ maxWidth: 400 }}>
      <h1>Register</h1>
      {error && <div className="appl-flash">{error}</div>}
      {success && <div className="appl-flash-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <label className="appl-label">Email</label>
        <input
          type="email"
          className="appl-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="appl-label">Password</label>
        <input
          type="password"
          className="appl-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" className="appl-btn w-full mt-6" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="appl-link">Login</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
