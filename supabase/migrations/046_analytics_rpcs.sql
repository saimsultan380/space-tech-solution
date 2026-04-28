-- Migration: 046_analytics_rpcs.sql
-- Description: Move heavy analytics aggregations to PostgreSQL RPCs.

-- 1. Sales per Agent
CREATE OR REPLACE FUNCTION get_sales_per_agent_stats(target_month text)
RETURNS TABLE (agent_id uuid, name text, total bigint, approved bigint, revenue numeric) AS $$
BEGIN
  IF target_month IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      s.agent_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint as approved,
      SUM(CASE WHEN s.status != 'rejected' THEN s.charged_amount ELSE 0 END) as revenue
    FROM sales s
    LEFT JOIN users u ON s.agent_id = u.id
    WHERE s.deleted_at IS NULL
      AND s.created_at >= (target_month || '-01')::timestamp
      AND s.created_at < ((target_month || '-01')::timestamp + interval '1 month')
    GROUP BY s.agent_id, u.full_name;
  ELSE
    RETURN QUERY
    SELECT 
      s.agent_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint as approved,
      SUM(CASE WHEN s.status != 'rejected' THEN s.charged_amount ELSE 0 END) as revenue
    FROM sales s
    LEFT JOIN users u ON s.agent_id = u.id
    WHERE s.deleted_at IS NULL
    GROUP BY s.agent_id, u.full_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Sales per Processor
CREATE OR REPLACE FUNCTION get_sales_per_processor_stats(target_month text)
RETURNS TABLE (processor_id uuid, name text, total bigint, approved bigint, rejected bigint) AS $$
BEGIN
  IF target_month IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      s.processor_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint as approved,
      COUNT(*) FILTER (WHERE s.status = 'rejected')::bigint as rejected
    FROM sales s
    LEFT JOIN users u ON s.processor_id = u.id
    WHERE s.processor_id IS NOT NULL 
      AND s.deleted_at IS NULL
      AND s.created_at >= (target_month || '-01')::timestamp
      AND s.created_at < ((target_month || '-01')::timestamp + interval '1 month')
    GROUP BY s.processor_id, u.full_name;
  ELSE
    RETURN QUERY
    SELECT 
      s.processor_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as total,
      COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint as approved,
      COUNT(*) FILTER (WHERE s.status = 'rejected')::bigint as rejected
    FROM sales s
    LEFT JOIN users u ON s.processor_id = u.id
    WHERE s.processor_id IS NOT NULL 
      AND s.deleted_at IS NULL
    GROUP BY s.processor_id, u.full_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Chargebacks per Employee
CREATE OR REPLACE FUNCTION get_chargebacks_per_employee_stats(target_month text)
RETURNS TABLE (agent_id uuid, name text, count bigint) AS $$
BEGIN
  IF target_month IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      s.agent_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as count
    FROM chargebacks c
    JOIN sales s ON c.sale_id = s.id
    LEFT JOIN users u ON s.agent_id = u.id
    WHERE c.created_at >= (target_month || '-01')::timestamp
      AND c.created_at < ((target_month || '-01')::timestamp + interval '1 month')
    GROUP BY s.agent_id, u.full_name;
  ELSE
    RETURN QUERY
    SELECT 
      s.agent_id, 
      COALESCE(u.full_name, 'Unknown') as name,
      COUNT(*)::bigint as count
    FROM chargebacks c
    JOIN sales s ON c.sale_id = s.id
    LEFT JOIN users u ON s.agent_id = u.id
    GROUP BY s.agent_id, u.full_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
