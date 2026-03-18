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

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
    }
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

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlash(null);
    if (!newRoom.trim()) return;

    const { error } = await supabase.from("rooms").insert({ name: newRoom.trim() });
    if (error) {
      setFlash({ type: "error", message: error.message });
    } else {
      setFlash({ type: "success", message: `Room "${newRoom.trim()}" added.` });
      setNewRoom("");
      fetchAll();
    }
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
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
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
