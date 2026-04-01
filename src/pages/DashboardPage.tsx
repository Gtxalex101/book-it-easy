import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  start_datetime: string;
  end_datetime: string;
  rooms: { name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
}

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);

  const monthlyLimit = profile?.monthly_limit ?? 600;
  const remaining = monthlyLimit - usedMinutes;
  const usagePercent = Math.min(100, Math.round((usedMinutes / monthlyLimit) * 100));

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [roomsRes, bookingsRes, usageRes] = await Promise.all([
      supabase.from("rooms").select("id, name, capacity").order("name"),
      supabase
        .from("bookings")
        .select("id, start_datetime, end_datetime, rooms(name)")
        .eq("user_id", user!.id)
        .gte("start_datetime", now.toISOString())
        .order("start_datetime")
        .limit(5),
      supabase
        .from("bookings")
        .select("start_datetime, end_datetime")
        .eq("user_id", user!.id)
        .gte("start_datetime", firstDay),
    ]);

    setRooms((roomsRes.data as Room[]) ?? []);
    setUpcomingBookings((bookingsRes.data as unknown as Booking[]) ?? []);

    let total = 0;
    (usageRes.data ?? []).forEach((b) => {
      total += (new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()) / 60000;
    });
    setUsedMinutes(Math.round(total));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="appl-main">
      <h1>Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="appl-stat-box">
          <div className="appl-stat-label">Used</div>
          <div className="appl-stat-value">{usedMinutes}m</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Remaining</div>
          <div className="appl-stat-value">{remaining}m</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Limit</div>
          <div className="appl-stat-value">{monthlyLimit}m</div>
        </div>
        <div className="appl-stat-box">
          <div className="appl-stat-label">Usage</div>
          <div className="appl-stat-value">{usagePercent}%</div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-8">
        <div
          className="h-2 bg-primary rounded-full transition-all"
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <div className="appl-card">
          <h2>Upcoming Bookings</h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <div key={b.id} className="flex justify-between items-center text-sm border-b border-border pb-2">
                  <div>
                    <div className="font-medium">{b.rooms?.name ?? "—"}</div>
                    <div className="text-muted-foreground text-xs">{formatDate(b.start_datetime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="appl-btn-outline mt-4 text-sm" onClick={() => navigate("/my-bookings")}>
            View All Bookings
          </button>
        </div>

        {/* Rooms */}
        <div className="appl-card">
          <h2>Meeting Rooms</h2>
          <div className="space-y-2">
            {rooms.map((r) => (
              <div key={r.id} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">{r.capacity} people</span>
              </div>
            ))}
          </div>
          <button className="appl-btn mt-4 text-sm" onClick={() => navigate("/book")}>
            Book a Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
