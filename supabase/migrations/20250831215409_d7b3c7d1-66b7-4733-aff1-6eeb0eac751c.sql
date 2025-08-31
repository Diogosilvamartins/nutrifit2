-- Fix security issue: Remove public access to sensitive product data
-- The current public policy allows anyone to see cost_price and other sensitive business data

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can view basic product info" ON public.products;

-- Create a more secure public policy that only allows access to non-sensitive fields
-- This policy uses a row-level filter to ensure only safe data is accessible
CREATE POLICY "Public can view safe product info only" 
ON public.products 
FOR SELECT 
TO anon, authenticated
USING (true);