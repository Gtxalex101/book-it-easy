import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AppHeader = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const navClass = (path: string) =>
    location.pathname === path ? "appl-nav-link-active" : "appl-nav-link";

  return (
    <header className="appl-header">
      <Link to="/" className="appl-logo">APPL</Link>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <Link to="/" className={navClass("/")}>Dashboard</Link>
            <Link to="/my-bookings" className={navClass("/my-bookings")}>My Bookings</Link>
            {isAdmin && (
              <Link to="/admin" className={navClass("/admin")}>Admin</Link>
            )}
            <span className="text-sm text-muted-foreground">{profile?.email}</span>
            <button onClick={signOut} className="appl-nav-link cursor-pointer">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="appl-nav-link">Login</Link>
        )}
      </nav>
    </header>
  );
};

export default AppHeader;
