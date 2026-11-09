export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'staff';
export type LanguageCode = 'en' | 'ar';
export type DressStatus = 'available' | 'reserved' | 'rented' | 'sold';
export type ListingType = 'sale' | 'rent' | 'both';
export type PhotoAngle = 'front' | 'back' | 'side' | 'neckline' | 'detail' | 'other';
export type MaterialCategory =
  'crystal' | 'bead' | 'pearl' | 'fabric' | 'lace' | 'trim' | 'button' | 'zipper' | 'other';
export type MaterialUnit = 'piece' | 'gram' | 'kg' | 'meter';
export type StockReason = 'purchase' | 'used' | 'adjustment' | 'return';
export type IntegrationKind = 'vision' | 'background_removal' | 'translation' | 'storage' | 'erp' | 'custom';
export type TestStatus = 'ok' | 'failed' | 'untested';
export type ErpEntity = 'dress' | 'material';
export type ErpAction = 'create' | 'update' | 'skip' | 'error';
export type ErpSyncStatus = 'not_synced' | 'pending' | 'synced' | 'error' | 'stale';

/**
 * Hand-written to match supabase/migrations. Once a project exists, replace
 * this file with `supabase gen types typescript --linked > src/lib/database.types.ts`.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          language: LanguageCode;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: UserRole;
          language?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          language?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          atelier_name: string;
          logo_path: string | null;
          code_prefix: string;
          next_code_number: number;
          default_language: LanguageCode;
          public_qr_page: boolean;
          western_digits: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          atelier_name?: string;
          logo_path?: string | null;
          code_prefix?: string;
          next_code_number?: number;
          default_language?: LanguageCode;
          public_qr_page?: boolean;
          western_digits?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          atelier_name?: string;
          logo_path?: string | null;
          code_prefix?: string;
          next_code_number?: number;
          default_language?: LanguageCode;
          public_qr_page?: boolean;
          western_digits?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dresses: {
        Row: {
          id: string;
          code: string;
          name_en: string;
          name_ar: string;
          description_en: string | null;
          description_ar: string | null;
          silhouette: string | null;
          neckline: string | null;
          sleeves: string | null;
          fabrics: string[];
          color: string | null;
          size_label: string | null;
          status: DressStatus;
          listing_type: ListingType;
          sale_price: number | null;
          rent_price: number | null;
          notes: string | null;
          ai_raw: Json | null;
          ai_model: string | null;
          created_by: string | null;
          erp_item_code: string | null;
          erp_sync_status: ErpSyncStatus;
          erp_synced_at: string | null;
          erp_error: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_en: string;
          name_ar: string;
          description_en?: string | null;
          description_ar?: string | null;
          silhouette?: string | null;
          neckline?: string | null;
          sleeves?: string | null;
          fabrics?: string[];
          color?: string | null;
          size_label?: string | null;
          status?: DressStatus;
          listing_type?: ListingType;
          sale_price?: number | null;
          rent_price?: number | null;
          notes?: string | null;
          ai_raw?: Json | null;
          ai_model?: string | null;
          created_by?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: ErpSyncStatus;
          erp_synced_at?: string | null;
          erp_error?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_en?: string;
          name_ar?: string;
          description_en?: string | null;
          description_ar?: string | null;
          silhouette?: string | null;
          neckline?: string | null;
          sleeves?: string | null;
          fabrics?: string[];
          color?: string | null;
          size_label?: string | null;
          status?: DressStatus;
          listing_type?: ListingType;
          sale_price?: number | null;
          rent_price?: number | null;
          notes?: string | null;
          ai_raw?: Json | null;
          ai_model?: string | null;
          created_by?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: ErpSyncStatus;
          erp_synced_at?: string | null;
          erp_error?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dress_photos: {
        Row: {
          id: string;
          dress_id: string;
          angle: PhotoAngle;
          original_path: string;
          clean_path: string | null;
          background_style: Json | null;
          sort_order: number;
          width: number | null;
          height: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dress_id: string;
          angle?: PhotoAngle;
          original_path: string;
          clean_path?: string | null;
          background_style?: Json | null;
          sort_order?: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dress_id?: string;
          angle?: PhotoAngle;
          original_path?: string;
          clean_path?: string | null;
          background_style?: Json | null;
          sort_order?: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          category: MaterialCategory;
          color: string | null;
          size: string | null;
          supplier: string | null;
          unit: MaterialUnit;
          stock_qty: number;
          low_stock_threshold: number;
          unit_cost: number | null;
          photo_path: string | null;
          notes: string | null;
          erp_item_code: string | null;
          erp_sync_status: ErpSyncStatus;
          erp_synced_at: string | null;
          erp_error: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_en: string;
          name_ar: string;
          category?: MaterialCategory;
          color?: string | null;
          size?: string | null;
          supplier?: string | null;
          unit?: MaterialUnit;
          stock_qty?: number;
          low_stock_threshold?: number;
          unit_cost?: number | null;
          photo_path?: string | null;
          notes?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: ErpSyncStatus;
          erp_synced_at?: string | null;
          erp_error?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_ar?: string;
          category?: MaterialCategory;
          color?: string | null;
          size?: string | null;
          supplier?: string | null;
          unit?: MaterialUnit;
          stock_qty?: number;
          low_stock_threshold?: number;
          unit_cost?: number | null;
          photo_path?: string | null;
          notes?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: ErpSyncStatus;
          erp_synced_at?: string | null;
          erp_error?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dress_materials: {
        Row: {
          dress_id: string;
          material_id: string;
          quantity: number;
          note: string | null;
        };
        Insert: {
          dress_id: string;
          material_id: string;
          quantity?: number;
          note?: string | null;
        };
        Update: {
          dress_id?: string;
          material_id?: string;
          quantity?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          material_id: string;
          delta: number;
          reason: StockReason;
          dress_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          delta: number;
          reason: StockReason;
          dress_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          material_id?: string;
          delta?: number;
          reason?: StockReason;
          dress_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          kind: IntegrationKind;
          provider: string;
          label: string;
          endpoint: string | null;
          model: string | null;
          config: Json;
          vault_secret_id: string | null;
          enabled: boolean;
          last_test_at: string | null;
          last_test_status: TestStatus;
          last_test_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: IntegrationKind;
          provider: string;
          label?: string;
          endpoint?: string | null;
          model?: string | null;
          config?: Json;
          vault_secret_id?: string | null;
          enabled?: boolean;
          last_test_at?: string | null;
          last_test_status?: TestStatus;
          last_test_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: IntegrationKind;
          provider?: string;
          label?: string;
          endpoint?: string | null;
          model?: string | null;
          config?: Json;
          vault_secret_id?: string | null;
          enabled?: boolean;
          last_test_at?: string | null;
          last_test_status?: TestStatus;
          last_test_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          diff: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          diff?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          diff?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      share_links: {
        Row: {
          id: string;
          token: string;
          dress_ids: string[];
          show_prices: boolean;
          expires_at: string | null;
          revoked: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          dress_ids?: string[];
          show_prices?: boolean;
          expires_at?: string | null;
          revoked?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          dress_ids?: string[];
          show_prices?: boolean;
          expires_at?: string | null;
          revoked?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      erp_sync_log: {
        Row: {
          id: string;
          entity: ErpEntity;
          entity_id: string;
          action: ErpAction;
          http_status: number | null;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity: ErpEntity;
          entity_id: string;
          action: ErpAction;
          http_status?: number | null;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity?: ErpEntity;
          entity_id?: string;
          action?: ErpAction;
          http_status?: number | null;
          message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      app_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      language_code: LanguageCode;
      dress_status: DressStatus;
      listing_type: ListingType;
      photo_angle: PhotoAngle;
      material_category: MaterialCategory;
      material_unit: MaterialUnit;
      stock_reason: StockReason;
      integration_kind: IntegrationKind;
      test_status: TestStatus;
      erp_entity: ErpEntity;
      erp_action: ErpAction;
      erp_sync_status: ErpSyncStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
