// ---------------------------------------------------------------------------
// Supabase Database type definitions — generated-style types for full
// type safety with supabase-js. Update this file whenever migrations change.
// ---------------------------------------------------------------------------

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type Element = 'FIRE' | 'WATER' | 'EARTH' | 'AIR' | 'LIGHTNING' | 'SHADOW';
export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED';
export type BattleStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED';
export type MoveType = 'ATTACK' | 'SWITCH' | 'FORFEIT';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          username: string | null;
          avatar_url: string | null;
          xp: number;
          level: number;
          energy: number;
          win_streak: number;
          total_wins: number;
          total_losses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          username?: string | null;
          avatar_url?: string | null;
          xp?: number;
          level?: number;
          energy?: number;
          win_streak?: number;
          total_wins?: number;
          total_losses?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          username?: string | null;
          avatar_url?: string | null;
          xp?: number;
          level?: number;
          energy?: number;
          win_streak?: number;
          total_wins?: number;
          total_losses?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      nonces: {
        Row: {
          id: string;
          wallet_address: string;
          nonce: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          nonce: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          nonce?: string;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      card_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          rarity: Rarity;
          element: Element;
          base_attack: number;
          base_defense: number;
          base_hp: number;
          image_url: string | null;
          spawn_weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          rarity: Rarity;
          element: Element;
          base_attack: number;
          base_defense: number;
          base_hp: number;
          image_url?: string | null;
          spawn_weight?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          rarity?: Rarity;
          element?: Element;
          base_attack?: number;
          base_defense?: number;
          base_hp?: number;
          image_url?: string | null;
          spawn_weight?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      cards: {
        Row: {
          id: string;
          mint_address: string | null;
          template_id: string;
          owner_id: string;
          serial_number: number;
          metadata_uri: string | null;
          level: number;
          xp: number;
          attack: number;
          defense: number;
          hp: number;
          tx_signature: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mint_address?: string | null;
          template_id: string;
          owner_id: string;
          serial_number: number;
          metadata_uri?: string | null;
          level?: number;
          xp?: number;
          attack: number;
          defense: number;
          hp: number;
          tx_signature?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mint_address?: string | null;
          template_id?: string;
          owner_id?: string;
          serial_number?: number;
          metadata_uri?: string | null;
          level?: number;
          xp?: number;
          attack?: number;
          defense?: number;
          hp?: number;
          tx_signature?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cards_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'card_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cards_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      listings: {
        Row: {
          id: string;
          card_id: string;
          seller_id: string;
          buyer_id: string | null;
          price_sol: string;
          status: ListingStatus;
          tx_signature: string | null;
          listed_at: string;
          sold_at: string | null;
        };
        Insert: {
          id?: string;
          card_id: string;
          seller_id: string;
          buyer_id?: string | null;
          price_sol: string | number;
          status?: ListingStatus;
          tx_signature?: string | null;
          listed_at?: string;
          sold_at?: string | null;
        };
        Update: {
          id?: string;
          card_id?: string;
          seller_id?: string;
          buyer_id?: string | null;
          price_sol?: string | number;
          status?: ListingStatus;
          tx_signature?: string | null;
          listed_at?: string;
          sold_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'listings_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listings_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listings_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      battles: {
        Row: {
          id: string;
          challenger_id: string;
          opponent_id: string | null;
          challenger_deck: string[];
          opponent_deck: string[] | null;
          challenger_hp: Record<string, number>;
          opponent_hp: Record<string, number> | null;
          active_challenger_card: number;
          active_opponent_card: number | null;
          winner_id: string | null;
          status: BattleStatus;
          xp_reward: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          challenger_id: string;
          opponent_id?: string | null;
          challenger_deck: string[];
          opponent_deck?: string[] | null;
          challenger_hp: Record<string, number>;
          opponent_hp?: Record<string, number> | null;
          active_challenger_card?: number;
          active_opponent_card?: number | null;
          winner_id?: string | null;
          status?: BattleStatus;
          xp_reward?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          challenger_id?: string;
          opponent_id?: string | null;
          challenger_deck?: string[];
          opponent_deck?: string[] | null;
          challenger_hp?: Record<string, number>;
          opponent_hp?: Record<string, number> | null;
          active_challenger_card?: number;
          active_opponent_card?: number | null;
          winner_id?: string | null;
          status?: BattleStatus;
          xp_reward?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'battles_challenger_id_fkey';
            columns: ['challenger_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'battles_opponent_id_fkey';
            columns: ['opponent_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'battles_winner_id_fkey';
            columns: ['winner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      battle_moves: {
        Row: {
          id: string;
          battle_id: string;
          player_id: string;
          turn_number: number;
          move_type: MoveType;
          card_used: string | null;
          target_card: string | null;
          damage_dealt: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          player_id: string;
          turn_number: number;
          move_type: MoveType;
          card_used?: string | null;
          target_card?: string | null;
          damage_dealt?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          battle_id?: string;
          player_id?: string;
          turn_number?: number;
          move_type?: MoveType;
          card_used?: string | null;
          target_card?: string | null;
          damage_dealt?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'battle_moves_battle_id_fkey';
            columns: ['battle_id'];
            isOneToOne: false;
            referencedRelation: 'battles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'battle_moves_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'battle_moves_card_used_fkey';
            columns: ['card_used'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'battle_moves_target_card_fkey';
            columns: ['target_card'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      rarity: Rarity;
      element: Element;
      listing_status: ListingStatus;
      battle_status: BattleStatus;
      move_type: MoveType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Convenience aliases for Row types
// ---------------------------------------------------------------------------
export type User = Database['public']['Tables']['users']['Row'];
export type Nonce = Database['public']['Tables']['nonces']['Row'];
export type CardTemplate = Database['public']['Tables']['card_templates']['Row'];
export type Card = Database['public']['Tables']['cards']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type Battle = Database['public']['Tables']['battles']['Row'];
export type BattleMove = Database['public']['Tables']['battle_moves']['Row'];

/** Card joined with its template — common query result shape. */
export type CardWithTemplate = Card & {
  card_templates: CardTemplate;
};
