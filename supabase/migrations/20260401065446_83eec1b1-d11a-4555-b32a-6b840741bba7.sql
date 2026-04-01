
-- Add capacity column to rooms
ALTER TABLE public.rooms ADD COLUMN capacity integer NOT NULL DEFAULT 10;

-- Allow users to delete their own future bookings (cancel)
CREATE POLICY "Users can delete own future bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = user_id AND start_datetime > now());

-- Allow admins to delete any booking
CREATE POLICY "Admins can delete any booking"
ON public.bookings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
