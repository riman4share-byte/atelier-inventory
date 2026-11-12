import type { Database } from './database.generated';

export type { Database, Json } from './database.generated';

/**
 * Generated from the local Supabase schema with
 * `npm run types:gen` (supabase gen types typescript --local).
 * Do not edit database.generated.ts by hand.
 */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type UserRole = Database['public']['Enums']['user_role'];
export type LanguageCode = Database['public']['Enums']['language_code'];
export type DressStatus = Database['public']['Enums']['dress_status'];
export type ListingType = Database['public']['Enums']['listing_type'];
export type DressCategory = Database['public']['Enums']['dress_category'];
export type PhotoAngle = Database['public']['Enums']['photo_angle'];
export type MaterialCategory = Database['public']['Enums']['material_category'];
export type MaterialUnit = Database['public']['Enums']['material_unit'];
export type StockReason = Database['public']['Enums']['stock_reason'];
export type IntegrationKind = Database['public']['Enums']['integration_kind'];
export type TestStatus = Database['public']['Enums']['test_status'];
export type ErpSyncStatus = Database['public']['Enums']['erp_sync_status'];
