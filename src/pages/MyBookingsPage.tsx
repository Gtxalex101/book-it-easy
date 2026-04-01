import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Booking {
  id: string;
  start_datetime: string;
  end_datetime: string;
  rooms: { name: string } | null;
}

const MyBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, start_datetime, end_datetime, rooms(name)")
      .eq("user_id", user!.id)
      .order("start_datetime", { ascending: false });
    setBookings((data as unknown as Booking[]) ?? []);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking cancelled. Hours restored.");
      fetchBookings();
    }
  };

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (filter === "upcoming") return new Date(b.start_datetime) > now;
    if (filter === "past") return new Date(b.start_datetime) <= now;
    return true;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const getDuration = (start: string, end: string) => {
    const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    return `${Math.round(mins)}m`;
  };

  const isFuture = (d: string) => new Date(d) > now;

  return (
    <div className="appl-main">
      <h1>My Bookings</h1>

      <div className="flex gap-2 mb-6">
        {(["all", "upcoming", "past"] as const).map((f) => (
          <button
            key={f}
            className={filter === f ? "appl-btn" : "appl-btn-outline"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No bookings found.</p>
      ) : (
        <table className="appl-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td>{b.rooms?.name ?? "—"}</td>
                <td>{formatDate(b.start_datetime)}</td>
                <td>{formatDate(b.end_datetime)}</td>
                <td>{getDuration(b.start_datetime, b.end_datetime)}</td>
                <td>
                  {isFuture(b.start_datetime) ? (
                    <button
                      className="text-sm text-destructive hover:underline cursor-pointer"
                      onClick={() => handleCancel(b.id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Past</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyBookingsPage;
