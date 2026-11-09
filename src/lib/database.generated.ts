export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          atelier_name: string;
          code_prefix: string;
          created_at: string;
          default_language: Database['public']['Enums']['language_code'];
          id: number;
          logo_path: string | null;
          next_code_number: number;
          public_qr_page: boolean;
          updated_at: string;
          western_digits: boolean;
        };
        Insert: {
          atelier_name?: string;
          code_prefix?: string;
          created_at?: string;
          default_language?: Database['public']['Enums']['language_code'];
          id?: number;
          logo_path?: string | null;
          next_code_number?: number;
          public_qr_page?: boolean;
          updated_at?: string;
          western_digits?: boolean;
        };
        Update: {
          atelier_name?: string;
          code_prefix?: string;
          created_at?: string;
          default_language?: Database['public']['Enums']['language_code'];
          id?: number;
          logo_path?: string | null;
          next_code_number?: number;
          public_qr_page?: boolean;
          updated_at?: string;
          western_digits?: boolean;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      dress_materials: {
        Row: {
          dress_id: string;
          material_id: string;
          note: string | null;
          quantity: number;
        };
        Insert: {
          dress_id: string;
          material_id: string;
          note?: string | null;
          quantity?: number;
        };
        Update: {
          dress_id?: string;
          material_id?: string;
          note?: string | null;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'dress_materials_dress_id_fkey';
            columns: ['dress_id'];
            isOneToOne: false;
            referencedRelation: 'dresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dress_materials_material_id_fkey';
            columns: ['material_id'];
            isOneToOne: false;
            referencedRelation: 'materials';
            referencedColumns: ['id'];
          },
        ];
      };
      dress_photos: {
        Row: {
          angle: Database['public']['Enums']['photo_angle'];
          background_style: Json | null;
          clean_path: string | null;
          created_at: string;
          dress_id: string;
          height: number | null;
          id: string;
          original_path: string;
          sort_order: number;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          angle?: Database['public']['Enums']['photo_angle'];
          background_style?: Json | null;
          clean_path?: string | null;
          created_at?: string;
          dress_id: string;
          height?: number | null;
          id?: string;
          original_path: string;
          sort_order?: number;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          angle?: Database['public']['Enums']['photo_angle'];
          background_style?: Json | null;
          clean_path?: string | null;
          created_at?: string;
          dress_id?: string;
          height?: number | null;
          id?: string;
          original_path?: string;
          sort_order?: number;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dress_photos_dress_id_fkey';
            columns: ['dress_id'];
            isOneToOne: false;
            referencedRelation: 'dresses';
            referencedColumns: ['id'];
          },
        ];
      };
      dresses: {
        Row: {
          ai_model: string | null;
          ai_raw: Json | null;
          code: string;
          color: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description_ar: string | null;
          description_en: string | null;
          erp_error: string | null;
          erp_item_code: string | null;
          erp_sync_status: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at: string | null;
          fabrics: string[];
          id: string;
          listing_type: Database['public']['Enums']['listing_type'];
          name_ar: string;
          name_en: string;
          neckline: string | null;
          notes: string | null;
          rent_price: number | null;
          sale_price: number | null;
          silhouette: string | null;
          size_label: string | null;
          sleeves: string | null;
          status: Database['public']['Enums']['dress_status'];
          updated_at: string;
        };
        Insert: {
          ai_model?: string | null;
          ai_raw?: Json | null;
          code: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          erp_error?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at?: string | null;
          fabrics?: string[];
          id?: string;
          listing_type?: Database['public']['Enums']['listing_type'];
          name_ar?: string;
          name_en?: string;
          neckline?: string | null;
          notes?: string | null;
          rent_price?: number | null;
          sale_price?: number | null;
          silhouette?: string | null;
          size_label?: string | null;
          sleeves?: string | null;
          status?: Database['public']['Enums']['dress_status'];
          updated_at?: string;
        };
        Update: {
          ai_model?: string | null;
          ai_raw?: Json | null;
          code?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          erp_error?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at?: string | null;
          fabrics?: string[];
          id?: string;
          listing_type?: Database['public']['Enums']['listing_type'];
          name_ar?: string;
          name_en?: string;
          neckline?: string | null;
          notes?: string | null;
          rent_price?: number | null;
          sale_price?: number | null;
          silhouette?: string | null;
          size_label?: string | null;
          sleeves?: string | null;
          status?: Database['public']['Enums']['dress_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dresses_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      erp_sync_log: {
        Row: {
          action: Database['public']['Enums']['erp_action'];
          created_at: string;
          entity: Database['public']['Enums']['erp_entity'];
          entity_id: string;
          http_status: number | null;
          id: string;
          message: string | null;
        };
        Insert: {
          action: Database['public']['Enums']['erp_action'];
          created_at?: string;
          entity: Database['public']['Enums']['erp_entity'];
          entity_id: string;
          http_status?: number | null;
          id?: string;
          message?: string | null;
        };
        Update: {
          action?: Database['public']['Enums']['erp_action'];
          created_at?: string;
          entity?: Database['public']['Enums']['erp_entity'];
          entity_id?: string;
          http_status?: number | null;
          id?: string;
          message?: string | null;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          config: Json;
          created_at: string;
          enabled: boolean;
          endpoint: string | null;
          id: string;
          kind: Database['public']['Enums']['integration_kind'];
          label: string;
          last_test_at: string | null;
          last_test_message: string | null;
          last_test_status: Database['public']['Enums']['test_status'];
          model: string | null;
          provider: string;
          updated_at: string;
          vault_secret_id: string | null;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          enabled?: boolean;
          endpoint?: string | null;
          id?: string;
          kind: Database['public']['Enums']['integration_kind'];
          label?: string;
          last_test_at?: string | null;
          last_test_message?: string | null;
          last_test_status?: Database['public']['Enums']['test_status'];
          model?: string | null;
          provider: string;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Update: {
          config?: Json;
          created_at?: string;
          enabled?: boolean;
          endpoint?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['integration_kind'];
          label?: string;
          last_test_at?: string | null;
          last_test_message?: string | null;
          last_test_status?: Database['public']['Enums']['test_status'];
          model?: string | null;
          provider?: string;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          category: Database['public']['Enums']['material_category'];
          color: string | null;
          created_at: string;
          deleted_at: string | null;
          erp_error: string | null;
          erp_item_code: string | null;
          erp_sync_status: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at: string | null;
          id: string;
          low_stock_threshold: number;
          name_ar: string;
          name_en: string;
          notes: string | null;
          photo_path: string | null;
          size: string | null;
          stock_qty: number;
          supplier: string | null;
          unit: Database['public']['Enums']['material_unit'];
          unit_cost: number | null;
          updated_at: string;
        };
        Insert: {
          category?: Database['public']['Enums']['material_category'];
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          erp_error?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at?: string | null;
          id?: string;
          low_stock_threshold?: number;
          name_ar?: string;
          name_en?: string;
          notes?: string | null;
          photo_path?: string | null;
          size?: string | null;
          stock_qty?: number;
          supplier?: string | null;
          unit?: Database['public']['Enums']['material_unit'];
          unit_cost?: number | null;
          updated_at?: string;
        };
        Update: {
          category?: Database['public']['Enums']['material_category'];
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          erp_error?: string | null;
          erp_item_code?: string | null;
          erp_sync_status?: Database['public']['Enums']['erp_sync_status'];
          erp_synced_at?: string | null;
          id?: string;
          low_stock_threshold?: number;
          name_ar?: string;
          name_en?: string;
          notes?: string | null;
          photo_path?: string | null;
          size?: string | null;
          stock_qty?: number;
          supplier?: string | null;
          unit?: Database['public']['Enums']['material_unit'];
          unit_cost?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          language: Database['public']['Enums']['language_code'];
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          language?: Database['public']['Enums']['language_code'];
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          language?: Database['public']['Enums']['language_code'];
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [];
      };
      share_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          dress_ids: string[];
          expires_at: string | null;
          id: string;
          revoked: boolean;
          show_prices: boolean;
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          dress_ids?: string[];
          expires_at?: string | null;
          id?: string;
          revoked?: boolean;
          show_prices?: boolean;
          token: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          dress_ids?: string[];
          expires_at?: string | null;
          id?: string;
          revoked?: boolean;
          show_prices?: boolean;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_links_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          delta: number;
          dress_id: string | null;
          id: string;
          material_id: string;
          reason: Database['public']['Enums']['stock_reason'];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          delta: number;
          dress_id?: string | null;
          id?: string;
          material_id: string;
          reason?: Database['public']['Enums']['stock_reason'];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          delta?: number;
          dress_id?: string | null;
          id?: string;
          material_id?: string;
          reason?: Database['public']['Enums']['stock_reason'];
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_dress_id_fkey';
            columns: ['dress_id'];
            isOneToOne: false;
            referencedRelation: 'dresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_material_id_fkey';
            columns: ['material_id'];
            isOneToOne: false;
            referencedRelation: 'materials';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      app_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      dress_status: 'available' | 'reserved' | 'rented' | 'sold';
      erp_action: 'create' | 'update' | 'skip' | 'error';
      erp_entity: 'dress' | 'material';
      erp_sync_status: 'not_synced' | 'pending' | 'synced' | 'error' | 'stale';
      integration_kind: 'vision' | 'background_removal' | 'translation' | 'storage' | 'erp' | 'custom';
      language_code: 'en' | 'ar';
      listing_type: 'sale' | 'rent' | 'both';
      material_category:
        'crystal' | 'bead' | 'pearl' | 'fabric' | 'lace' | 'trim' | 'button' | 'zipper' | 'other';
      material_unit: 'piece' | 'gram' | 'kg' | 'meter';
      photo_angle: 'front' | 'back' | 'side' | 'neckline' | 'detail' | 'other';
      stock_reason: 'purchase' | 'used' | 'adjustment' | 'return';
      test_status: 'ok' | 'failed' | 'untested';
      user_role: 'admin' | 'staff';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dress_status: ['available', 'reserved', 'rented', 'sold'],
      erp_action: ['create', 'update', 'skip', 'error'],
      erp_entity: ['dress', 'material'],
      erp_sync_status: ['not_synced', 'pending', 'synced', 'error', 'stale'],
      integration_kind: ['vision', 'background_removal', 'translation', 'storage', 'erp', 'custom'],
      language_code: ['en', 'ar'],
      listing_type: ['sale', 'rent', 'both'],
      material_category: ['crystal', 'bead', 'pearl', 'fabric', 'lace', 'trim', 'button', 'zipper', 'other'],
      material_unit: ['piece', 'gram', 'kg', 'meter'],
      photo_angle: ['front', 'back', 'side', 'neckline', 'detail', 'other'],
      stock_reason: ['purchase', 'used', 'adjustment', 'return'],
      test_status: ['ok', 'failed', 'untested'],
      user_role: ['admin', 'staff'],
    },
  },
} as const;
