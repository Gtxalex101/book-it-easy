import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  email: string;
  monthly_limit: number;
}

interface UserRole {
  user_id: string;
  role: string;
}

const AdminUsersPage = () => {
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState(600);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, email, monthly_limit"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsers(usersRes.data ?? []);
    setRoles(rolesRes.data ?? []);
  };

  const getUserRole = (userId: string) => {
    return roles.find((r) => r.user_id === userId)?.role ?? "user";
  };

  const handleUpdateLimit = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ monthly_limit: newLimit })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Monthly limit updated.");
      setEditingLimit(null);
      fetchUsers();
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="appl-main">
      <h1>User Management</h1>

      <table className="appl-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Monthly Limit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.email}</td>
              <td>
                <span className={`text-xs px-2 py-1 rounded ${getUserRole(u.user_id) === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {getUserRole(u.user_id)}
                </span>
              </td>
              <td>
                {editingLimit === u.user_id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      className="appl-input"
                      value={newLimit}
                      onChange={(e) => setNewLimit(Number(e.target.value))}
                      min={0}
                      style={{ marginBottom: 0, width: 100 }}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                ) : (
                  <span>{u.monthly_limit}m</span>
                )}
              </td>
              <td>
                {editingLimit === u.user_id ? (
                  <div className="flex gap-2">
                    <button className="appl-btn" onClick={() => handleUpdateLimit(u.user_id)}>Save</button>
                    <button className="appl-btn-outline" onClick={() => setEditingLimit(null)}>Cancel</button>
                  </div>
                ) : (
                  <button
                    className="appl-btn-outline"
                    onClick={() => { setEditingLimit(u.user_id); setNewLimit(u.monthly_limit); }}
                  >
                    Edit Limit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsersPage;
