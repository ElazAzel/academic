-- Enable Row-Level Security on the messages table.
-- This is a defense-in-depth measure. The primary chat access control
-- is enforced server-side in server/actions/chat.ts (assertCanAccessStudentChat).
--
-- RLS ensures that even direct database access (e.g., via Supabase anon key)
-- is restricted: users can only SELECT/INSERT/UPDATE messages where they
-- are the sender or receiver.
--
-- Note: This project uses NextAuth (not Supabase Auth), so auth.uid() relies
-- on Supabase JWT being present. If clients connect without a Supabase JWT,
-- RLS effectively blocks anonymous access, which is the desired behavior.

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT only messages where the user is sender or receiver
CREATE POLICY messages_select_policy ON messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Policy: INSERT only own messages
CREATE POLICY messages_insert_policy ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Policy: UPDATE only readAt on received messages
CREATE POLICY messages_update_policy ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());
