import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
  capacity: number;
}

const AdminPage = () => {
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState(10);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState(10);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [creatingUser, setCreatingUser] = useState(false);

  // Filters
  const [filterRoom, setFilterRoom] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Calendar view toggle
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

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
      supabase.from("rooms").select("id, name, capacity").order("name"),
    ]);
    setUsers(usersRes.data ?? []);
    setBookings((bookingsRes.data as unknown as BookingRow[]) ?? []);
    setRooms((roomsRes.data as Room[]) ?? []);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    const { error } = await supabase.from("rooms").insert({ name: newRoom.trim(), capacity: newCapacity });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Room "${newRoom.trim()}" added.`);
      setNewRoom("");
      setNewCapacity(10);
      fetchAll();
    }
  };

  const handleRenameRoom = async (roomId: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("rooms").update({ name: editName.trim(), capacity: editCapacity }).eq("id", roomId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Room updated.");
      setEditingRoom(null);
      fetchAll();
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", room.id)
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      toast.error("Cannot delete room with existing bookings.");
      return;
    }

    if (!confirm(`Delete "${room.name}"?`)) return;
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Room "${room.name}" deleted.`);
      fetchAll();
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking deleted.");
      fetchAll();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail, password: newPassword, role: newRole },
      });

      if (res.error) {
        toast.error(res.error.message);
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`User "${newEmail}" created as ${newRole}.`);
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        fetchAll();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreatingUser(false);
  };

  const exportToExcel = () => {
    const data = filteredBookings.map((b) => ({
      User: b.profiles?.email ?? "—",
      Room: b.rooms?.name ?? "—",
      Start: new Date(b.start_datetime).toLocaleString(),
      End: new Date(b.end_datetime).toLocaleString(),
      "Duration (min)": Math.round(
        (new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()) / 60000
      ),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "bookings_export.xlsx");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (filterRoom && b.rooms?.name !== filterRoom) return false;
    if (filterUser && b.profiles?.email !== filterUser) return false;
    if (filterDate) {
      const bookingDate = new Date(b.start_datetime).toISOString().split("T")[0];
      if (bookingDate !== filterDate) return false;
    }
    return true;
  });

  // Analytics
  const totalBookings = bookings.length;
  const totalMinutes = bookings.reduce((sum, b) => {
    return sum + (new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()) / 60000;
  }, 0);
  const totalHours = Math.round(totalMinutes / 60);

  // Calendar view data
  const getCalendarDays = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const days: Date[] = [];
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => {
      const bDate = new Date(b.start_datetime).toDateString();
      return bDate === day.toDateString();
    });
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="appl-main" style={{ maxWidth: 1100 }}>
      <h1>Admin Dashboard</h1>

      {/* Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="appl-stat-box">
          <div className="appl-stat-label">Total Bookings</div>
          <div className="appl-stat-value">{totalBookings}</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Total Hours</div>
          <div className="appl-stat-value">{totalHours}h</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Rooms</div>
          <div className="appl-stat-value">{rooms.length}</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Users</div>
          <div className="appl-stat-value">{users.length}</div>
        </div>
      </div>

      {/* Create User */}
      <div className="appl-card">
        <h2>Create User</h2>
        <form onSubmit={handleCreateUser}>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-3 sm:gap-4">
            <div>
              <label className="appl-label">Email</label>
              <input type="email" className="appl-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div>
              <label className="appl-label">Password</label>
              <input type="password" className="appl-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <label className="appl-label">Role</label>
              <select className="appl-input" value={newRole} onChange={(e) => setNewRole(e.target.value as "user" | "admin")}>
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
        <form onSubmit={handleAddRoom} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="appl-label">Room Name</label>
            <input type="text" className="appl-input" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} required />
          </div>
          <div className="w-32">
            <label className="appl-label">Capacity</label>
            <input type="number" className="appl-input" value={newCapacity} onChange={(e) => setNewCapacity(Number(e.target.value))} min={1} required />
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
            <th>Capacity</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>
                {editingRoom === r.id ? (
                  <input type="text" className="appl-input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ marginBottom: 0 }} />
                ) : (
                  r.name
                )}
              </td>
              <td>
                {editingRoom === r.id ? (
                  <input type="number" className="appl-input" value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} min={1} style={{ marginBottom: 0, width: 80 }} />
                ) : (
                  r.capacity
                )}
              </td>
              <td className="text-right">
                {editingRoom === r.id ? (
                  <div className="flex gap-2 justify-end">
                    <button className="appl-btn" onClick={() => handleRenameRoom(r.id)}>Save</button>
                    <button className="appl-btn-outline" onClick={() => setEditingRoom(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <button className="appl-btn-outline" onClick={() => { setEditingRoom(r.id); setEditName(r.name); setEditCapacity(r.capacity); }}>Edit</button>
                    <button className="appl-btn-outline" onClick={() => handleDeleteRoom(r)} style={{ color: "hsl(var(--destructive))" }}>Delete</button>
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
      <div className="flex items-center justify-between mt-8 mb-4 flex-wrap gap-2">
        <h2 className="mb-0">All Bookings ({filteredBookings.length})</h2>
        <div className="flex gap-2">
          <button className={viewMode === "table" ? "appl-btn" : "appl-btn-outline"} onClick={() => setViewMode("table")}>Table</button>
          <button className={viewMode === "calendar" ? "appl-btn" : "appl-btn-outline"} onClick={() => setViewMode("calendar")}>Calendar</button>
          <button className="appl-btn-outline" onClick={exportToExcel}>Export Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="appl-input" style={{ width: "auto" }} value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
          <option value="">All Rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <select className="appl-input" style={{ width: "auto" }} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.email}>{u.email}</option>
          ))}
        </select>
        <input type="date" className="appl-input" style={{ width: "auto" }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {(filterRoom || filterUser || filterDate) && (
          <button className="appl-btn-outline" onClick={() => { setFilterRoom(""); setFilterUser(""); setFilterDate(""); }}>
            Clear
          </button>
        )}
      </div>

      {viewMode === "table" ? (
        <table className="appl-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Room</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.id}>
                <td>{b.profiles?.email ?? "—"}</td>
                <td>{b.rooms?.name ?? "—"}</td>
                <td>{formatDate(b.start_datetime)}</td>
                <td>{formatDate(b.end_datetime)}</td>
                <td>{Math.round((new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()) / 60000)}m</td>
                <td>
                  <button className="text-sm text-destructive hover:underline cursor-pointer" onClick={() => handleDeleteBooking(b.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        /* Calendar View */
        <div className="appl-card">
          <h3 className="font-semibold mb-4">
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs text-center text-muted-foreground font-medium py-1">{d}</div>
            ))}
            {/* padding for first day */}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {getCalendarDays().map((day) => {
              const dayBookings = getBookingsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className={`border border-border p-1 min-h-[60px] text-xs ${isToday ? "bg-accent" : ""}`}
                >
                  <div className={`font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {day.getDate()}
                  </div>
                  {dayBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="bg-primary text-primary-foreground px-1 rounded text-[10px] mb-0.5 truncate">
                      {b.rooms?.name} {new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-muted-foreground text-[10px]">+{dayBookings.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
