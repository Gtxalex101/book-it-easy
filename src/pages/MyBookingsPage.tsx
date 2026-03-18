import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Booking {
  id: string;
  start_datetime: string;
  end_datetime: string;
  rooms: { name: string } | null;
}

const MyBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

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

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getDuration = (start: string, end: string) => {
    const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    return `${Math.round(mins)}m`;
  };

  return (
    <div className="appl-main">
      <h1>My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground text-sm">No bookings yet.</p>
      ) : (
        <table className="appl-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.rooms?.name ?? "—"}</td>
                <td>{formatDate(b.start_datetime)}</td>
                <td>{formatDate(b.end_datetime)}</td>
                <td>{getDuration(b.start_datetime, b.end_datetime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyBookingsPage;
