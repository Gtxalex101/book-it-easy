
-- Allow admins to update rooms
CREATE POLICY "Admins can update rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete rooms
CREATE POLICY "Admins can delete rooms" ON public.rooms
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
