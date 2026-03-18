import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="appl-main" style={{ maxWidth: 400 }}>
      <h1>Login</h1>
      {error && <div className="appl-flash">{error}</div>}
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
        />
        <button type="submit" className="appl-btn w-full mt-6" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Contact your administrator to get an account.
      </p>
    </div>
  );
};

export default LoginPage;
