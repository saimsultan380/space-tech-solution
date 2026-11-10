-- Replace "scan public.users to read the current role" checks with the
-- existing security-definer get_user_role() lookup.
-- Access rules stay the same. No table data is inserted, updated, or deleted.

-- banks
DROP POLICY IF EXISTS "Super admins can insert banks" ON public.banks;
CREATE POLICY "Super admins can insert banks"
  ON public.banks
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

-- biometric sync log
DROP POLICY IF EXISTS "Super admins can view sync logs" ON public.biometric_sync_log;
CREATE POLICY "Super admins can view sync logs"
  ON public.biometric_sync_log
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin');

-- biometric user mapping
DROP POLICY IF EXISTS "Super admins can delete biometric mappings" ON public.biometric_user_mapping;
CREATE POLICY "Super admins can delete biometric mappings"
  ON public.biometric_user_mapping
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Super admins can insert biometric mappings" ON public.biometric_user_mapping;
CREATE POLICY "Super admins can insert biometric mappings"
  ON public.biometric_user_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update biometric mappings" ON public.biometric_user_mapping;
CREATE POLICY "Super admins can update biometric mappings"
  ON public.biometric_user_mapping
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Super admins can view biometric mappings" ON public.biometric_user_mapping;
CREATE POLICY "Super admins can view biometric mappings"
  ON public.biometric_user_mapping
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin');

-- chat memberships (public role, same as before)
DROP POLICY IF EXISTS "Admins can add members" ON public.chat_channel_members;
CREATE POLICY "Admins can add members"
  ON public.chat_channel_members
  FOR INSERT
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Admins can remove members" ON public.chat_channel_members;
CREATE POLICY "Admins can remove members"
  ON public.chat_channel_members
  FOR DELETE
  USING ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Admins can view all memberships" ON public.chat_channel_members;
CREATE POLICY "Admins can view all memberships"
  ON public.chat_channel_members
  FOR SELECT
  USING ((SELECT public.get_user_role()) = 'super_admin');

-- chat channels
DROP POLICY IF EXISTS "Admins can create channels" ON public.chat_channels;
CREATE POLICY "Admins can create channels"
  ON public.chat_channels
  FOR INSERT
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Admins can update channels" ON public.chat_channels;
CREATE POLICY "Admins can update channels"
  ON public.chat_channels
  FOR UPDATE
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Admins can view all channels" ON public.chat_channels;
CREATE POLICY "Admins can view all channels"
  ON public.chat_channels
  FOR SELECT
  USING ((SELECT public.get_user_role()) = 'super_admin');

-- chat messages
DROP POLICY IF EXISTS "Admins can delete any message" ON public.chat_messages;
CREATE POLICY "Admins can delete any message"
  ON public.chat_messages
  FOR DELETE
  USING ((SELECT public.get_user_role()) = 'super_admin');

-- marketing entries
DROP POLICY IF EXISTS "Processors can create marketing_entries" ON public.marketing_entries;
CREATE POLICY "Processors can create marketing_entries"
  ON public.marketing_entries
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = 'processor');

DROP POLICY IF EXISTS "Processors can delete own marketing_entries" ON public.marketing_entries;
CREATE POLICY "Processors can delete own marketing_entries"
  ON public.marketing_entries
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = 'processor'
  );

DROP POLICY IF EXISTS "Processors can update own marketing_entries" ON public.marketing_entries;
CREATE POLICY "Processors can update own marketing_entries"
  ON public.marketing_entries
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = 'processor'
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = 'processor'
  );

DROP POLICY IF EXISTS "Processors can view marketing_entries" ON public.marketing_entries;
CREATE POLICY "Processors can view marketing_entries"
  ON public.marketing_entries
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'processor');

DROP POLICY IF EXISTS "Super admins full access on marketing_entries" ON public.marketing_entries;
CREATE POLICY "Super admins full access on marketing_entries"
  ON public.marketing_entries
  FOR ALL
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

-- processing accounts
DROP POLICY IF EXISTS "Sales agents and processors can create processing_accounts" ON public.processing_accounts;
CREATE POLICY "Sales agents and processors can create processing_accounts"
  ON public.processing_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) = ANY (ARRAY['sales_agent', 'processor']));

DROP POLICY IF EXISTS "Sales agents and processors can delete own processing_accounts" ON public.processing_accounts;
CREATE POLICY "Sales agents and processors can delete own processing_accounts"
  ON public.processing_accounts
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = ANY (ARRAY['sales_agent', 'processor'])
  );

DROP POLICY IF EXISTS "Sales agents and processors can update own processing_accounts" ON public.processing_accounts;
CREATE POLICY "Sales agents and processors can update own processing_accounts"
  ON public.processing_accounts
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = ANY (ARRAY['sales_agent', 'processor'])
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = ANY (ARRAY['sales_agent', 'processor'])
  );

DROP POLICY IF EXISTS "Sales agents and processors can view processing_accounts" ON public.processing_accounts;
CREATE POLICY "Sales agents and processors can view processing_accounts"
  ON public.processing_accounts
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) = ANY (ARRAY['sales_agent', 'processor']));

DROP POLICY IF EXISTS "Super admins full access on processing_accounts" ON public.processing_accounts;
CREATE POLICY "Super admins full access on processing_accounts"
  ON public.processing_accounts
  FOR ALL
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');
