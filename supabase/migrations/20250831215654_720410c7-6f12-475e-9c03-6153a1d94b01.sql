-- Fix the security issue properly by removing all public SELECT access
-- The products table should not be directly readable by anonymous users at all

-- Drop the policy that still allows public access to all columns
DROP POLICY IF EXISTS "Public can view safe product info only" ON public.products;

-- Remove any remaining public access policies
DROP POLICY IF EXISTS "Public can view basic product info" ON public.products;

-- The public should use the get_public_products() function instead,
-- which already exists and safely returns only: id, name, description, price, image_url, created_at, updated_at
-- This function excludes sensitive fields like: cost_price, stock_quantity, supplier_id, min_stock_alert

-- Authenticated users still have full access via the existing policy:
-- "Authenticated users can view all product data"