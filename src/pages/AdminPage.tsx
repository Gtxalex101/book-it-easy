import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface UserProfile {
  user_id: string;
  email: string;
  monthly_limit: number;
}

interface BookingRow {
  id: string;
  start_datetime: string;
  end_datetime: string;
  profiles: { email: string } | null;
  rooms: { name: string } | null;
}

interface Room {
  id: string;
  name: string;
}

const AdminPage = () => {
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [flash, setFlash] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const [usersRes, bookingsRes, roomsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, email, monthly_limit"),
      supabase
        .from("bookings")
        .select("id, start_datetime, end_datetime, profiles!bookings_user_id_fkey(email), rooms(name)")
        .order("start_datetime", { ascending: false }),
      supabase.from("rooms").select("id, name").order("name"),
    ]);
    setUsers(usersRes.data ?? []);
    setBookings((bookingsRes.data as unknown as BookingRow[]) ?? []);
    setRooms(roomsRes.data ?? []);
  };

  const showFlash = (type: "error" | "success", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    const { error } = await supabase.from("rooms").insert({ name: newRoom.trim() });
    if (error) {
      showFlash("error", error.message);
    } else {
      showFlash("success", `Room "${newRoom.trim()}" added.`);
      setNewRoom("");
      fetchAll();
    }
  };

  const handleRenameRoom = async (roomId: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("rooms").update({ name: editName.trim() }).eq("id", roomId);
    if (error) {
      showFlash("error", error.message);
    } else {
      showFlash("success", "Room renamed.");
      setEditingRoom(null);
      setEditName("");
      fetchAll();
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Delete "${room.name}"? All bookings for this room will also be deleted.`)) return;
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      showFlash("error", error.message);
    } else {
      showFlash("success", `Room "${room.name}" deleted.`);
      fetchAll();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email==: newEmail, password: newPassword, role: newRole },
      });

      if (res.error) {
        showFlash("error", res.error.message);
      } else if (res.data?.error) {
        showFlash("error", res.data.error);
      } else {
        showFlash("success", `User "${newEmail}" created as  ${newRole}.`);
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        fetchAll();
      }
    } catch (err: any) {
      showFlash("error", err.message);
    }
    setCreatingUser(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="appl-main">
      <h1>Admin Dashboard</h1>

      {flash && (
        <div className={flash.type === "error" ? "appl-flash" : "appl-flash-success"}>
          {flash.message}
        </div>
      )}

      {/* Create User */}
      <div className="appl-card">
        <h2>Create User</h2>
        <form onSubmit={handleCreateUser}>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-3 sm:gap-4">
            <div>
              <label className="appl-label">Email</label>
              <input
                type="email"
                className="appl-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="appl-label">Password</label>
              <input
                type="password"
                className="appl-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="appl-label">Role</label>
              <select
                className="appl-input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="appl-btn mt-4" disabled={creatingUser}>
            {creatingUser ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      {/* Add Room */}
      <div className="appl-card">
        <h2>Add Room</h2>
        <form onSubmit={handleAddRoom} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="appl-label">Room Name</label>
            <input
              type="text"
              className="appl-input"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="e.g. Room D"
              required
            />
          </div>
          <button type="submit" className="appl-btn">Add</button>
        </form>
      </div>

      {/* Rooms */}
      <h2>Rooms ({rooms.length})</h2>
      <table className="appl-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>
                {editingRoom === r.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="appl-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <button className="appl-btn" onClick={() => handleRenameRoom(r.id)}>Save</button>
                    <button className="appl-btn-outline" onClick={() => setEditingRoom(null)}>Cancel</button>
                  </div>
                ) : (
                  r.name
                )}
              </td>
              <td className="text-right">
                {editingRoom !== r.id && (
                  <div className="flex gap-2 justify-end">
                    <button
                      className="appl-btn-outline"
                      onClick={() => { setEditingRoom(r.id); setEditName(r.name); }}
                    >
                      Rename
                    </button>
                    <button
                      className="appl-btn-outline"
                      onClick={() => handleDeleteRoom(r)}
                      style={{ color: "hsl(var(--destructive))" }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Users */}
      <h2 className="mt-8">Users ({users.length})</h2>
      <table className="appl-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Monthly Limit</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.email}</td>
              <td>{u.monthly_limit}m</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bookings */}
      <h2 className="mt-8">All Bookings ({bookings.length})</h2>
      <table className="appl-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Room</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.profiles?.email ?? "—"}</td>
              <td>{b.rooms?.name ?? "—"}</td>
              <td>{formatDate(b.start_datetime)}</td>
              <td>{formatDate(b.end_datetime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;
