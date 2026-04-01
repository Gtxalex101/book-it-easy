import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  capacity: number;
}

const BookRoomPage = () => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const monthlyLimit = profile?.monthly_limit ?? 600;
  const remaining = monthlyLimit - usedMinutes;

  useEffect(() => {
    fetchRooms();
    if (user) fetchUsage();
  }, [user]);

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("id, name, capacity").order("name");
    setRooms((data as Room[]) ?? []);
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
      total += (new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()) / 60000;
    });
    setUsedMinutes(Math.round(total));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !startDate || !endDate) {
      toast.error("Please fill all fields.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < new Date()) {
      toast.error("Cannot book in the past.");
      return;
    }
    if (end <= start) {
      toast.error("End time must be after start time.");
      return;
    }

    const duration = (end.getTime() - start.getTime()) / 60000;
    if (usedMinutes + duration > monthlyLimit) {
      toast.error("Monthly booking limit exceeded.");
      return;
    }

    setSubmitting(true);

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", selectedRoom)
      .lt("start_datetime", end.toISOString())
      .gt("end_datetime", start.toISOString());

    if (conflicts && conflicts.length > 0) {
      toast.error("This room is already booked for the selected time.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      user_id: user!.id,
      room_id: selectedRoom,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking confirmed!");
      setStartDate("");
      setEndDate("");
      setSelectedRoom("");
      fetchUsage();
    }
    setSubmitting(false);
  };

  return (
    <div className="appl-main">
      <h1>Book a Room</h1>

      <div className="appl-stat-grid">
        <div className="appl-stat-box">
          <div className="appl-stat-label">Used This Month</div>
          <div className="appl-stat-value">{usedMinutes}m</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Remaining</div>
          <div className="appl-stat-value">{remaining}m</div>
        </div>
      </div>

      <div className="appl-card">
        <h2>New Booking</h2>
        <form onSubmit={handleBook}>
          <label className="appl-label">Room</label>
          <select
            className="appl-input"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            required
          >
            <option value="">Select a room...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (capacity: {r.capacity})
              </option>
            ))}
          </select>

          <label className="appl-label">Start Time</label>
          <input
            type="datetime-local"
            className="appl-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <label className="appl-label">End Time</label>
          <input
            type="datetime-local"
            className="appl-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />

          <button type="submit" className="appl-btn mt-4 w-full" disabled={submitting}>
            {submitting ? "Booking..." : "Book Room"}
          </button>
        </form>
      </div>

      {/* Available Rooms */}
      <h2>Available Rooms</h2>
      <table className="appl-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Capacity</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.capacity} people</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookRoomPage;
