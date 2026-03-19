
CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE room_id = NEW.room_id
      AND id IS DISTINCT FROM NEW.id
      AND NEW.start_datetime < end_datetime
      AND NEW.end_datetime > start_datetime
  ) THEN
    RAISE EXCEPTION 'This room is already booked for the selected time';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER check_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_overlapping_bookings();
