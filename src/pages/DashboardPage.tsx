import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Room {
  id: string;
  name: string;
}

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [flash, setFlash] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [bookingState, setBookingState] = useState<Record<string, { start: string; end: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const monthlyLimit = profile?.monthly_limit ?? 600;
  const remaining = monthlyLimit - usedMinutes;

  useEffect(() => {
    fetchRooms();
    if (user) fetchUsage();
  }, [user]);

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("id, name").order("name");
    setRooms(data ?? []);
  };

  const fetchUsage = async () => {
    if (!user) return;
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data } = await supabase
      .from("bookings")
      .select("start_datetime, end_datetime")
      .eq("user_id", user.id)
      .gte("start_datetime", firstDay);

    let total = 0;
    (data ?? []).forEach((b) => {
      const diff = new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime();
      total += diff / 60000;
    });
    setUsedMinutes(Math.round(total));
  };

  const handleBook = async (roomId: string) => {
    setFlash(null);
    const state = bookingState[roomId];
    if (!state?.start || !state?.end) {
      setFlash({ type: "error", message: "Please select start and end time." });
      return;
    }

    const start = new Date(state.start);
    const end = new Date(state.end);

    if (end <= start) {
      setFlash({ type: "error", message: "End time must be after start time." });
      return;
    }

    const duration = (end.getTime() - start.getTime()) / 60000;
    if (usedMinutes + duration > monthlyLimit) {
      setFlash({ type: "error", message: "Monthly booking limit exceeded." });
      return;
    }

    setSubmitting(true);

    // Check overlap via query
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .lt("start_datetime", end.toISOString())
      .gt("end_datetime", start.toISOString());

    if (conflicts && conflicts.length > 0) {
      setFlash({ type: "error", message: "Room is already booked for this time." });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      user_id: user!.id,
      room_id: roomId,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
    });

    if (error) {
      setFlash({ type: "error", message: error.message });
    } else {
      setFlash({ type: "success", message: "Booking confirmed." });
      setBookingState((prev) => ({ ...prev, [roomId]: { start: "", end: "" } }));
      fetchUsage();
    }
    setSubmitting(false);
  };

  const updateBooking = (roomId: string, field: "start" | "end", value: string) => {
    setBookingState((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], [field]: value },
    }));
  };

  return (
    <div className="appl-main">
      <h1>Dashboard</h1>

      <div className="appl-stat-grid">
        <div className="appl-stat-box">
          <div className="appl-stat-label">Used Minutes</div>
          <div className="appl-stat-value">{usedMinutes}m</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Remaining</div>
          <div className="appl-stat-value">{remaining}m</div>
        </div>
      </div>

      {flash && (
        <div className={flash.type === "error" ? "appl-flash" : "appl-flash-success"}>
          {flash.message}
        </div>
      )}

      <h2>Available Rooms</h2>

      {rooms.map((room) => (
        <div key={room.id} className="appl-card">
          <h3 className="font-semibold text-lg">{room.name}</h3>
          <div className="mt-4">
            <label className="appl-label">Start Time</label>
            <input
              type="datetime-local"
              className="appl-input"
              value={bookingState[room.id]?.start ?? ""}
              onChange={(e) => updateBooking(room.id, "start", e.target.value)}
            />
            <label className="appl-label">End Time</label>
            <input
              type="datetime-local"
              className="appl-input"
              value={bookingState[room.id]?.end ?? ""}
              onChange={(e) => updateBooking(room.id, "end", e.target.value)}
            />
            <button
              className="appl-btn mt-4"
              onClick={() => handleBook(room.id)}
              disabled={submitting}
            >
              {submitting ? "Booking..." : "Book Room"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardPage;
