export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abuse_flags: {
        Row: {
          clawback_amount: number | null
          created_at: string
          details: Json
          flag_type: string
          id: string
          player_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
        }
        Insert: {
          clawback_amount?: number | null
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          player_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
        }
        Update: {
          clawback_amount?: number | null
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          player_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_flags_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_daily_limits: {
        Row: {
          ap_earned: number
          created_at: string
          daily_cap: number
          id: string
          limit_date: string
          player_id: string
          updated_at: string
        }
        Insert: {
          ap_earned?: number
          created_at?: string
          daily_cap?: number
          id?: string
          limit_date: string
          player_id: string
          updated_at?: string
        }
        Update: {
          ap_earned?: number
          created_at?: string
          daily_cap?: number
          id?: string
          limit_date?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_daily_limits_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_earning_rules: {
        Row: {
          ap_amount: number
          code: string
          conditions: Json
          cooldown_seconds: number
          created_at: string
          id: string
          is_active: boolean
          max_per_day: number | null
          max_per_stream: number
          min_watch_percent: number
          min_watch_seconds: number
          name: string
          reason: Database["public"]["Enums"]["ap_reason_type"]
          stream_type: Database["public"]["Enums"]["stream_type_type"] | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          ap_amount: number
          code: string
          conditions?: Json
          cooldown_seconds?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          max_per_stream?: number
          min_watch_percent?: number
          min_watch_seconds?: number
          name: string
          reason?: Database["public"]["Enums"]["ap_reason_type"]
          stream_type?: Database["public"]["Enums"]["stream_type_type"] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          ap_amount?: number
          code?: string
          conditions?: Json
          cooldown_seconds?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          max_per_stream?: number
          min_watch_percent?: number
          min_watch_seconds?: number
          name?: string
          reason?: Database["public"]["Enums"]["ap_reason_type"]
          stream_type?: Database["public"]["Enums"]["stream_type_type"] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      ap_escrow: {
        Row: {
          amount_ap: number
          approval_deadline: string
          auto_released_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          receiver_id: string
          sender_2fa_verified: boolean
          sender_id: string
          status: Database["public"]["Enums"]["escrow_status_type"]
        }
        Insert: {
          amount_ap: number
          approval_deadline?: string
          auto_released_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          receiver_id: string
          sender_2fa_verified?: boolean
          sender_id: string
          status?: Database["public"]["Enums"]["escrow_status_type"]
        }
        Update: {
          amount_ap?: number
          approval_deadline?: string
          auto_released_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          receiver_id?: string
          sender_2fa_verified?: boolean
          sender_id?: string
          status?: Database["public"]["Enums"]["escrow_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ap_escrow_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_escrow_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          idempotency_key: string | null
          player_id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          player_id: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          player_id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_market_bids: {
        Row: {
          bid_amount_ap: number
          bidder_player_id: string
          created_at: string
          destination_team_id: string | null
          id: string
          listing_id: string
          status: Database["public"]["Enums"]["athlete_bid_status"]
        }
        Insert: {
          bid_amount_ap: number
          bidder_player_id: string
          created_at?: string
          destination_team_id?: string | null
          id?: string
          listing_id: string
          status?: Database["public"]["Enums"]["athlete_bid_status"]
        }
        Update: {
          bid_amount_ap?: number
          bidder_player_id?: string
          created_at?: string
          destination_team_id?: string | null
          id?: string
          listing_id?: string
          status?: Database["public"]["Enums"]["athlete_bid_status"]
        }
        Relationships: [
          {
            foreignKeyName: "athlete_market_bids_bidder_player_id_fkey"
            columns: ["bidder_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_market_bids_destination_team_id_fkey"
            columns: ["destination_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_market_bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "athlete_market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_market_listings: {
        Row: {
          buyout_price_ap: number | null
          contract_note: string | null
          created_at: string
          current_highest_bid_ap: number
          expires_at: string
          floor_price_ap: number
          highest_bidder_id: string | null
          id: string
          listing_type: Database["public"]["Enums"]["athlete_listing_type"]
          seller_player_id: string
          seller_team_id: string | null
          status: Database["public"]["Enums"]["athlete_listing_status"]
          target_player_id: string
          updated_at: string
        }
        Insert: {
          buyout_price_ap?: number | null
          contract_note?: string | null
          created_at?: string
          current_highest_bid_ap?: number
          expires_at?: string
          floor_price_ap: number
          highest_bidder_id?: string | null
          id?: string
          listing_type?: Database["public"]["Enums"]["athlete_listing_type"]
          seller_player_id: string
          seller_team_id?: string | null
          status?: Database["public"]["Enums"]["athlete_listing_status"]
          target_player_id: string
          updated_at?: string
        }
        Update: {
          buyout_price_ap?: number | null
          contract_note?: string | null
          created_at?: string
          current_highest_bid_ap?: number
          expires_at?: string
          floor_price_ap?: number
          highest_bidder_id?: string | null
          id?: string
          listing_type?: Database["public"]["Enums"]["athlete_listing_type"]
          seller_player_id?: string
          seller_team_id?: string | null
          status?: Database["public"]["Enums"]["athlete_listing_status"]
          target_player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_market_listings_highest_bidder_id_fkey"
            columns: ["highest_bidder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_market_listings_seller_player_id_fkey"
            columns: ["seller_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_market_listings_seller_team_id_fkey"
            columns: ["seller_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_market_listings_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_transfer_history: {
        Row: {
          completed_at: string
          deal_type: string
          final_price_ap: number
          from_team_id: string | null
          id: string
          listing_id: string | null
          platform_fee_ap: number
          player_id: string
          seller_payout_ap: number
          to_team_id: string
        }
        Insert: {
          completed_at?: string
          deal_type: string
          final_price_ap: number
          from_team_id?: string | null
          id?: string
          listing_id?: string | null
          platform_fee_ap: number
          player_id: string
          seller_payout_ap: number
          to_team_id: string
        }
        Update: {
          completed_at?: string
          deal_type?: string
          final_price_ap?: number
          from_team_id?: string | null
          id?: string
          listing_id?: string | null
          platform_fee_ap?: number
          player_id?: string
          seller_payout_ap?: number
          to_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_transfer_history_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "athlete_market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_history_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action_type"]
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role_type"] | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          impersonated_by: string | null
          ip_address: unknown
          reason: string | null
          request_id: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action_type"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role_type"] | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: number
          impersonated_by?: string | null
          ip_address?: unknown
          reason?: string | null
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action_type"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role_type"] | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: number
          impersonated_by?: string | null
          ip_address?: unknown
          reason?: string | null
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_impersonated_by_fkey"
            columns: ["impersonated_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_nodes: {
        Row: {
          best_of: number
          bracket_type: string
          created_at: string
          id: string
          is_bye: boolean
          label: string | null
          loser_to_node_id: string | null
          loser_to_slot: string | null
          position_in_round: number
          reset_from_node_id: string | null
          round_number: number
          source_a_node_id: string | null
          source_a_outcome: string | null
          source_b_node_id: string | null
          source_b_outcome: string | null
          stage_id: string
          status: Database["public"]["Enums"]["bracket_node_status_type"]
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string
          voided_reason: string | null
          winner_to_node_id: string | null
          winner_to_slot: string | null
        }
        Insert: {
          best_of?: number
          bracket_type?: string
          created_at?: string
          id?: string
          is_bye?: boolean
          label?: string | null
          loser_to_node_id?: string | null
          loser_to_slot?: string | null
          position_in_round: number
          reset_from_node_id?: string | null
          round_number: number
          source_a_node_id?: string | null
          source_a_outcome?: string | null
          source_b_node_id?: string | null
          source_b_outcome?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["bracket_node_status_type"]
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          voided_reason?: string | null
          winner_to_node_id?: string | null
          winner_to_slot?: string | null
        }
        Update: {
          best_of?: number
          bracket_type?: string
          created_at?: string
          id?: string
          is_bye?: boolean
          label?: string | null
          loser_to_node_id?: string | null
          loser_to_slot?: string | null
          position_in_round?: number
          reset_from_node_id?: string | null
          round_number?: number
          source_a_node_id?: string | null
          source_a_outcome?: string | null
          source_b_node_id?: string | null
          source_b_outcome?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["bracket_node_status_type"]
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          voided_reason?: string | null
          winner_to_node_id?: string | null
          winner_to_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_nodes_loser_to_node_id_fkey"
            columns: ["loser_to_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_reset_from_node_id_fkey"
            columns: ["reset_from_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_source_a_node_id_fkey"
            columns: ["source_a_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_source_b_node_id_fkey"
            columns: ["source_b_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_nodes_winner_to_node_id_fkey"
            columns: ["winner_to_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_themes: {
        Row: {
          active_from: string | null
          active_until: string | null
          assets: Json | null
          code: string
          colors: Json
          created_at: string
          created_by: string | null
          custom_css_vars: Json | null
          id: string
          is_active: boolean
          name: string
          priority: number
          scope_id: string | null
          scope_type: string
          typography: Json | null
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          assets?: Json | null
          code: string
          colors?: Json
          created_at?: string
          created_by?: string | null
          custom_css_vars?: Json | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          scope_id?: string | null
          scope_type: string
          typography?: Json | null
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          assets?: Json | null
          code?: string
          colors?: Json
          created_at?: string
          created_by?: string | null
          custom_css_vars?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          scope_id?: string | null
          scope_type?: string
          typography?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_themes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_standings: {
        Row: {
          bonus_zp: number
          circuit_id: string
          counted_zp: number
          fall_zp: number
          finals_seed: number | null
          id: string
          is_finals_qualified: boolean
          last_calculated_at: string
          penalty_zp: number
          qualified_at: string | null
          rank: number | null
          spring_zp: number
          summer_zp: number
          team_id: string
          tiebreaker_applied: Json
          total_zp: number
          winter_zp: number
        }
        Insert: {
          bonus_zp?: number
          circuit_id: string
          counted_zp?: number
          fall_zp?: number
          finals_seed?: number | null
          id?: string
          is_finals_qualified?: boolean
          last_calculated_at?: string
          penalty_zp?: number
          qualified_at?: string | null
          rank?: number | null
          spring_zp?: number
          summer_zp?: number
          team_id: string
          tiebreaker_applied?: Json
          total_zp?: number
          winter_zp?: number
        }
        Update: {
          bonus_zp?: number
          circuit_id?: string
          counted_zp?: number
          fall_zp?: number
          finals_seed?: number | null
          id?: string
          is_finals_qualified?: boolean
          last_calculated_at?: string
          penalty_zp?: number
          qualified_at?: string | null
          rank?: number | null
          spring_zp?: number
          summer_zp?: number
          team_id?: string
          tiebreaker_applied?: Json
          total_zp?: number
          winter_zp?: number
        }
        Relationships: [
          {
            foreignKeyName: "circuit_standings_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      circuits: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          name: string
          season_order: number
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          name: string
          season_order: number
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          name?: string
          season_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "circuits_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_payments: {
        Row: {
          amount_token: number
          block_number: number | null
          confirmations: number
          created_at: string
          id: string
          is_confirmed: boolean
          is_reverted: boolean
          payment_intent_id: string
          rate_locked_at: string
          rate_to_thb: number
          required_confirms: number
          to_address: string
          token_symbol: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount_token: number
          block_number?: number | null
          confirmations?: number
          created_at?: string
          id?: string
          is_confirmed?: boolean
          is_reverted?: boolean
          payment_intent_id: string
          rate_locked_at: string
          rate_to_thb: number
          required_confirms?: number
          to_address: string
          token_symbol: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount_token?: number
          block_number?: number | null
          confirmations?: number
          created_at?: string
          id?: string
          is_confirmed?: boolean
          is_reverted?: boolean
          payment_intent_id?: string
          rate_locked_at?: string
          rate_to_thb?: number
          required_confirms?: number
          to_address?: string
          token_symbol?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: true
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          category: string
          created_at: string
          deadline_at: string | null
          dispute_number: string | null
          evidence_urls: string[] | null
          filed_by: string
          id: string
          match_id: string
          priority: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          deadline_at?: string | null
          dispute_number?: string | null
          evidence_urls?: string[] | null
          filed_by: string
          id?: string
          match_id: string
          priority?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deadline_at?: string | null
          dispute_number?: string | null
          evidence_urls?: string[] | null
          filed_by?: string
          id?: string
          match_id?: string
          priority?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_accounts: {
        Row: {
          created_at: string
          deleted_at: string | null
          evidence_url: string | null
          external_id: string
          game_id: string | null
          game_name: string | null
          id: string
          is_primary: boolean
          last_synced_at: string | null
          player_id: string
          rank_snapshot: Json | null
          region: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          rso_access_token: string | null
          rso_expires_at: string | null
          rso_refresh_token: string | null
          rso_scopes: string[] | null
          tag_line: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status_type"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          evidence_url?: string | null
          external_id: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          is_primary?: boolean
          last_synced_at?: string | null
          player_id: string
          rank_snapshot?: Json | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          rso_access_token?: string | null
          rso_expires_at?: string | null
          rso_refresh_token?: string | null
          rso_scopes?: string[] | null
          tag_line?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          evidence_url?: string | null
          external_id?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          is_primary?: boolean
          last_synced_at?: string | null
          player_id?: string
          rank_snapshot?: Json | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          rso_access_token?: string | null
          rso_expires_at?: string | null
          rso_refresh_token?: string | null
          rso_scopes?: string[] | null
          tag_line?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_accounts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_accounts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_accounts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: Database["public"]["Enums"]["game_code_type"]
          config: Json
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean
          max_substitutes: number
          name: string
          publisher: string | null
          team_size: number
          updated_at: string
        }
        Insert: {
          code: Database["public"]["Enums"]["game_code_type"]
          config?: Json
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_substitutes?: number
          name: string
          publisher?: string | null
          team_size?: number
          updated_at?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["game_code_type"]
          config?: Json
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_substitutes?: number
          name?: string
          publisher?: string | null
          team_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      map_vetoes: {
        Row: {
          action: Database["public"]["Enums"]["veto_action_type"]
          created_at: string
          deadline_at: string | null
          id: string
          map_name: string
          match_id: string
          side_choice: string | null
          step_order: number
          team_id: string | null
          was_auto: boolean
        }
        Insert: {
          action: Database["public"]["Enums"]["veto_action_type"]
          created_at?: string
          deadline_at?: string | null
          id?: string
          map_name: string
          match_id: string
          side_choice?: string | null
          step_order: number
          team_id?: string | null
          was_auto?: boolean
        }
        Update: {
          action?: Database["public"]["Enums"]["veto_action_type"]
          created_at?: string
          deadline_at?: string | null
          id?: string
          map_name?: string
          match_id?: string
          side_choice?: string | null
          step_order?: number
          team_id?: string | null
          was_auto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "map_vetoes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_vetoes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          auction_ends_at: string | null
          buyout_price: number | null
          created_at: string
          currency_type: Database["public"]["Enums"]["listing_currency_type"]
          current_highest_bid: number | null
          description: string | null
          floor_price: number
          highest_bidder_id: string | null
          id: string
          image_urls: Json
          is_paid_slot: boolean
          item_title: string
          shelf_billing_cycle_end: string | null
          status: Database["public"]["Enums"]["listing_status_type"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          auction_ends_at?: string | null
          buyout_price?: number | null
          created_at?: string
          currency_type?: Database["public"]["Enums"]["listing_currency_type"]
          current_highest_bid?: number | null
          description?: string | null
          floor_price: number
          highest_bidder_id?: string | null
          id?: string
          image_urls?: Json
          is_paid_slot?: boolean
          item_title: string
          shelf_billing_cycle_end?: string | null
          status?: Database["public"]["Enums"]["listing_status_type"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          auction_ends_at?: string | null
          buyout_price?: number | null
          created_at?: string
          currency_type?: Database["public"]["Enums"]["listing_currency_type"]
          current_highest_bid?: number | null
          description?: string | null
          floor_price?: number
          highest_bidder_id?: string | null
          id?: string
          image_urls?: Json
          is_paid_slot?: boolean
          item_title?: string
          shelf_billing_cycle_end?: string | null
          status?: Database["public"]["Enums"]["listing_status_type"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_highest_bidder_id_fkey"
            columns: ["highest_bidder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_trade_history: {
        Row: {
          buyer_id: string
          currency_type: Database["public"]["Enums"]["listing_currency_type"]
          id: string
          item_title: string
          listing_id: string
          seller_id: string
          sold_at: string
          sold_price: number
        }
        Insert: {
          buyer_id: string
          currency_type: Database["public"]["Enums"]["listing_currency_type"]
          id?: string
          item_title: string
          listing_id: string
          seller_id: string
          sold_at?: string
          sold_price: number
        }
        Update: {
          buyer_id?: string
          currency_type?: Database["public"]["Enums"]["listing_currency_type"]
          id?: string
          item_title?: string
          listing_id?: string
          seller_id?: string
          sold_at?: string
          sold_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_trade_history_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trade_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_trade_history_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_decisions: {
        Row: {
          created_at: string
          decided_by: string
          decision_type: string
          dispute_id: string | null
          effects: Json
          id: string
          match_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          decided_by: string
          decision_type?: string
          dispute_id?: string | null
          effects?: Json
          id?: string
          match_id: string
          reason: string
        }
        Update: {
          created_at?: string
          decided_by?: string
          decision_type?: string
          dispute_id?: string | null
          effects?: Json
          id?: string
          match_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          external_game_id: string | null
          game_number: number
          id: string
          map_name: string | null
          match_id: string
          raw_data: Json | null
          score_a: number
          score_b: number
          started_at: string | null
          status: string
          team_a_side_start: string | null
          team_b_side_start: string | null
          updated_at: string
          went_overtime: boolean
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_game_id?: string | null
          game_number: number
          id?: string
          map_name?: string | null
          match_id: string
          raw_data?: Json | null
          score_a?: number
          score_b?: number
          started_at?: string | null
          status?: string
          team_a_side_start?: string | null
          team_b_side_start?: string | null
          updated_at?: string
          went_overtime?: boolean
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_game_id?: string | null
          game_number?: number
          id?: string
          map_name?: string | null
          match_id?: string
          raw_data?: Json | null
          score_a?: number
          score_b?: number
          started_at?: string | null
          status?: string
          team_a_side_start?: string | null
          team_b_side_start?: string | null
          updated_at?: string
          went_overtime?: boolean
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lobby_messages: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          match_id: string
          message: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          match_id: string
          message: string
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          match_id?: string
          message?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lobby_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lobby_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          acs: number | null
          adr: number | null
          agent_played: string | null
          assists: number
          created_at: string
          deaths: number
          eligibility_checked: boolean
          eligibility_notes: string | null
          first_bloods: number
          first_deaths: number
          game_account_id: string | null
          headshot_pct: number | null
          id: string
          is_substitute: boolean
          kills: number
          match_game_id: string
          match_id: string
          player_id: string
          role_played: string | null
          rounds_played: number
          team_id: string
        }
        Insert: {
          acs?: number | null
          adr?: number | null
          agent_played?: string | null
          assists?: number
          created_at?: string
          deaths?: number
          eligibility_checked?: boolean
          eligibility_notes?: string | null
          first_bloods?: number
          first_deaths?: number
          game_account_id?: string | null
          headshot_pct?: number | null
          id?: string
          is_substitute?: boolean
          kills?: number
          match_game_id: string
          match_id: string
          player_id: string
          role_played?: string | null
          rounds_played?: number
          team_id: string
        }
        Update: {
          acs?: number | null
          adr?: number | null
          agent_played?: string | null
          assists?: number
          created_at?: string
          deaths?: number
          eligibility_checked?: boolean
          eligibility_notes?: string | null
          first_bloods?: number
          first_deaths?: number
          game_account_id?: string | null
          headshot_pct?: number | null
          id?: string
          is_substitute?: boolean
          kills?: number
          match_game_id?: string
          match_id?: string
          player_id?: string
          role_played?: string | null
          rounds_played?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_game_account_id_fkey"
            columns: ["game_account_id"]
            isOneToOne: false
            referencedRelation: "game_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_replays: {
        Row: {
          clip_url: string
          created_at: string
          created_by: string | null
          duration_seconds: number
          id: string
          is_official: boolean
          match_id: string
          metadata: Json | null
          player_id: string | null
          start_time_seconds: number
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          clip_url: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          is_official?: boolean
          match_id: string
          metadata?: Json | null
          player_id?: string | null
          start_time_seconds?: number
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          clip_url?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          is_official?: boolean
          match_id?: string
          metadata?: Json | null
          player_id?: string | null
          start_time_seconds?: number
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_replays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_replays_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_replays_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reports: {
        Row: {
          created_at: string
          evidence_urls: string[]
          id: string
          match_id: string
          note: string | null
          reported_by_team: string
          reported_by_user: string
          score_a: number
          score_b: number
          updated_at: string
          winner_team_id: string
        }
        Insert: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          match_id: string
          note?: string | null
          reported_by_team: string
          reported_by_user: string
          score_a: number
          score_b: number
          updated_at?: string
          winner_team_id: string
        }
        Update: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          match_id?: string
          note?: string | null
          reported_by_team?: string
          reported_by_user?: string
          score_a?: number
          score_b?: number
          updated_at?: string
          winner_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reports_reported_by_team_fkey"
            columns: ["reported_by_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reports_reported_by_user_fkey"
            columns: ["reported_by_user"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reports_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_state_transitions: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["match_status_type"] | null
          id: number
          match_id: string
          reason: string | null
          state_snapshot: Json
          to_status: Database["public"]["Enums"]["match_status_type"]
          trigger_source: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["match_status_type"] | null
          id?: number
          match_id: string
          reason?: string | null
          state_snapshot?: Json
          to_status: Database["public"]["Enums"]["match_status_type"]
          trigger_source: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["match_status_type"] | null
          id?: number
          match_id?: string
          reason?: string | null
          state_snapshot?: Json
          to_status?: Database["public"]["Enums"]["match_status_type"]
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_state_transitions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_state_transitions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          best_of: number
          bracket_node_id: string | null
          created_at: string | null
          ended_at: string | null
          forfeit_deadline_at: string | null
          format_config: Json
          id: string
          match_number: number | null
          outcome: Database["public"]["Enums"]["match_outcome_type"] | null
          referee_id: string | null
          reschedule_reason: string | null
          rescheduled_from: string | null
          result_confirmed_at: string | null
          result_reported_by: string | null
          result_source:
            | Database["public"]["Enums"]["result_source_type"]
            | null
          round_label: string | null
          rounds_won_a: number
          rounds_won_b: number
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          stage_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["match_status_type"]
          team_a_id: string | null
          team_a_ready_at: string | null
          team_b_id: string | null
          team_b_ready_at: string | null
          tournament_id: string | null
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          best_of?: number
          bracket_node_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          forfeit_deadline_at?: string | null
          format_config?: Json
          id?: string
          match_number?: number | null
          outcome?: Database["public"]["Enums"]["match_outcome_type"] | null
          referee_id?: string | null
          reschedule_reason?: string | null
          rescheduled_from?: string | null
          result_confirmed_at?: string | null
          result_reported_by?: string | null
          result_source?:
            | Database["public"]["Enums"]["result_source_type"]
            | null
          round_label?: string | null
          rounds_won_a?: number
          rounds_won_b?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          stage_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status_type"]
          team_a_id?: string | null
          team_a_ready_at?: string | null
          team_b_id?: string | null
          team_b_ready_at?: string | null
          tournament_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          best_of?: number
          bracket_node_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          forfeit_deadline_at?: string | null
          format_config?: Json
          id?: string
          match_number?: number | null
          outcome?: Database["public"]["Enums"]["match_outcome_type"] | null
          referee_id?: string | null
          reschedule_reason?: string | null
          rescheduled_from?: string | null
          result_confirmed_at?: string | null
          result_reported_by?: string | null
          result_source?:
            | Database["public"]["Enums"]["result_source_type"]
            | null
          round_label?: string | null
          rounds_won_a?: number
          rounds_won_b?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          stage_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status_type"]
          team_a_id?: string | null
          team_a_ready_at?: string | null
          team_b_id?: string | null
          team_b_ready_at?: string | null
          tournament_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_bracket_node_id_fkey"
            columns: ["bracket_node_id"]
            isOneToOne: false
            referencedRelation: "bracket_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_result_reported_by_fkey"
            columns: ["result_reported_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          channels: Database["public"]["Enums"]["notification_channel_type"][]
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          player_id: string
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel_type"][]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          player_id: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel_type"][]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          player_id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          name_at: string
          order_id: string
          quantity: number
          unit_price_ap: number
          unit_price_thb: number
          variant_id: string
        }
        Insert: {
          id?: string
          name_at: string
          order_id: string
          quantity: number
          unit_price_ap: number
          unit_price_thb: number
          variant_id: string
        }
        Update: {
          id?: string
          name_at?: string
          order_id?: string
          quantity?: number
          unit_price_ap?: number
          unit_price_thb?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string | null
          player_id: string
          shipping_address_id: string | null
          status: string
          total_price_ap: number
          total_price_thb: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key?: string | null
          player_id: string
          shipping_address_id?: string | null
          status?: string
          total_price_ap?: number
          total_price_thb?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          player_id?: string
          shipping_address_id?: string | null
          status?: string
          total_price_ap?: number
          total_price_thb?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "shipping_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          banner_url: string | null
          brand_colors: Json | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          social_links: Json | null
          tag: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          brand_colors?: Json | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          social_links?: Json | null
          tag: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          brand_colors?: Json | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          social_links?: Json | null
          tag?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_transfer_otp_challenges: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          locked_until: string | null
          otp_code_hash: string
          sender_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          locked_until?: string | null
          otp_code_hash: string
          sender_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          locked_until?: string | null
          otp_code_hash?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_transfer_otp_challenges_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_transfer_used_tokens: {
        Row: {
          jti: string
          sender_id: string
          used_at: string
        }
        Insert: {
          jti: string
          sender_id: string
          used_at?: string
        }
        Update: {
          jti?: string
          sender_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_transfer_used_tokens_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount_thb: number | null
          ap_amount: number | null
          channel: string
          checkout_url: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string | null
          method: string | null
          order_id: string | null
          player_id: string
          provider: string | null
          provider_intent_id: string | null
          purpose: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_thb?: number | null
          ap_amount?: number | null
          channel: string
          checkout_url?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key?: string | null
          method?: string | null
          order_id?: string | null
          player_id: string
          provider?: string | null
          provider_intent_id?: string | null
          purpose: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_thb?: number | null
          ap_amount?: number | null
          channel?: string
          checkout_url?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          method?: string | null
          order_id?: string | null
          player_id?: string
          provider?: string | null
          provider_intent_id?: string | null
          purpose?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      perk_redemptions: {
        Row: {
          created_at: string
          id: string
          is_redeemed: boolean
          perk_id: string
          perk_token: string
          redeemed_amount: number
          redeemed_at: string | null
          redeemed_by_player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_redeemed?: boolean
          perk_id: string
          perk_token: string
          redeemed_amount: number
          redeemed_at?: string | null
          redeemed_by_player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_redeemed?: boolean
          perk_id?: string
          perk_token?: string
          redeemed_amount?: number
          redeemed_at?: string | null
          redeemed_by_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perk_redemptions_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "sponsor_perks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perk_redemptions_redeemed_by_player_id_fkey"
            columns: ["redeemed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_inventory: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_equipped: boolean
          item_type: string
          player_id: string
          quantity: number
          redeemed_at: string | null
          status: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_equipped?: boolean
          item_type: string
          player_id: string
          quantity?: number
          redeemed_at?: string | null
          status?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_equipped?: boolean
          item_type?: string
          player_id?: string
          quantity?: number
          redeemed_at?: string | null
          status?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          agent_pool: Json
          avg_acs: number | null
          avg_adr: number | null
          avg_kd: number | null
          avg_kda: number | null
          game_id: string
          games_played: number
          headshot_pct: number | null
          id: string
          last_match_at: string | null
          map_performance: Json
          matches_lost: number
          matches_played: number
          matches_won: number
          player_id: string
          season_id: string | null
          total_assists: number
          total_deaths: number
          total_first_bloods: number
          total_kills: number
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          agent_pool?: Json
          avg_acs?: number | null
          avg_adr?: number | null
          avg_kd?: number | null
          avg_kda?: number | null
          game_id: string
          games_played?: number
          headshot_pct?: number | null
          id?: string
          last_match_at?: string | null
          map_performance?: Json
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          player_id: string
          season_id?: string | null
          total_assists?: number
          total_deaths?: number
          total_first_bloods?: number
          total_kills?: number
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          agent_pool?: Json
          avg_acs?: number | null
          avg_adr?: number | null
          avg_kd?: number | null
          avg_kda?: number | null
          game_id?: string
          games_played?: number
          headshot_pct?: number | null
          id?: string
          last_match_at?: string | null
          map_performance?: Json
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          player_id?: string
          season_id?: string | null
          total_assists?: number
          total_deaths?: number
          total_first_bloods?: number
          total_kills?: number
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          ap_balance: number
          athlete_id: string
          avatar_url: string | null
          ban_reason: string | null
          banner_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          display_name: string
          email: string | null
          id: string
          kyc_verified_at: string | null
          last_login_at: string | null
          last_login_ip: unknown
          locale: string
          notification_prefs: Json
          phone: string | null
          real_name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["account_status_type"]
          suspended_until: string | null
          timezone: string
          unverified_data: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ap_balance?: number
          athlete_id: string
          avatar_url?: string | null
          ban_reason?: string | null
          banner_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locale?: string
          notification_prefs?: Json
          phone?: string | null
          real_name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["account_status_type"]
          suspended_until?: string | null
          timezone?: string
          unverified_data?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ap_balance?: number
          athlete_id?: string
          avatar_url?: string | null
          ban_reason?: string | null
          banner_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          kyc_verified_at?: string | null
          last_login_at?: string | null
          last_login_ip?: unknown
          locale?: string
          notification_prefs?: Json
          phone?: string | null
          real_name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["account_status_type"]
          suspended_until?: string | null
          timezone?: string
          unverified_data?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_pools: {
        Row: {
          bonus_pool_ap: number
          created_at: string
          house_fee_percent: number
          id: string
          match_id: string
          settled_at: string | null
          status: Database["public"]["Enums"]["prediction_pool_status_type"]
          total_ap_pool_a: number
          total_ap_pool_b: number
          updated_at: string
          winning_team_id: string | null
        }
        Insert: {
          bonus_pool_ap?: number
          created_at?: string
          house_fee_percent?: number
          id?: string
          match_id: string
          settled_at?: string | null
          status?: Database["public"]["Enums"]["prediction_pool_status_type"]
          total_ap_pool_a?: number
          total_ap_pool_b?: number
          updated_at?: string
          winning_team_id?: string | null
        }
        Update: {
          bonus_pool_ap?: number
          created_at?: string
          house_fee_percent?: number
          id?: string
          match_id?: string
          settled_at?: string | null
          status?: Database["public"]["Enums"]["prediction_pool_status_type"]
          total_ap_pool_a?: number
          total_ap_pool_b?: number
          updated_at?: string
          winning_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_pools_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_pools_winning_team_id_fkey"
            columns: ["winning_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_tickets: {
        Row: {
          ap_amount: number
          created_at: string
          id: string
          payout_ap: number | null
          player_id: string
          pool_id: string
          predicted_team_id: string
          tier: Database["public"]["Enums"]["prediction_ticket_tier_type"]
        }
        Insert: {
          ap_amount: number
          created_at?: string
          id?: string
          payout_ap?: number | null
          player_id: string
          pool_id: string
          predicted_team_id: string
          tier?: Database["public"]["Enums"]["prediction_ticket_tier_type"]
        }
        Update: {
          ap_amount?: number
          created_at?: string
          id?: string
          payout_ap?: number | null
          player_id?: string
          pool_id?: string
          predicted_team_id?: string
          tier?: Database["public"]["Enums"]["prediction_ticket_tier_type"]
        }
        Relationships: [
          {
            foreignKeyName: "prediction_tickets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_tickets_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "prediction_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_tickets_predicted_team_id_fkey"
            columns: ["predicted_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_payouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          gross: number
          id: string
          idempotency_key: string | null
          net: number
          paid_at: string | null
          player_id: string
          status: string
          tax_withheld: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gross: number
          id?: string
          idempotency_key?: string | null
          net: number
          paid_at?: string | null
          player_id: string
          status?: string
          tax_withheld?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gross?: number
          id?: string
          idempotency_key?: string | null
          net?: number
          paid_at?: string | null
          player_id?: string
          status?: string
          tax_withheld?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_payouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_thb: number | null
          ap_amount: number | null
          channel: string
          created_at: string
          id: string
          idempotency_key: string | null
          payment_intent_id: string
          provider_refund_id: string | null
          reason: string | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_thb?: number | null
          ap_amount?: number | null
          channel: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          payment_intent_id: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_thb?: number | null
          ap_amount?: number | null
          channel?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          payment_intent_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_snapshot_members: {
        Row: {
          id: string
          player_id: string
          role: string
          snapshot_id: string
        }
        Insert: {
          id?: string
          player_id: string
          role: string
          snapshot_id: string
        }
        Update: {
          id?: string
          player_id?: string
          role?: string
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_snapshot_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_snapshot_members_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "roster_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_snapshots: {
        Row: {
          created_at: string | null
          id: string
          locked_at: string | null
          team_id: string
          tournament_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          locked_at?: string | null
          team_id: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          locked_at?: string | null
          team_id?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_snapshots_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      season_jackpot_pools: {
        Row: {
          accumulated_ap: number
          carried_over_at: string | null
          created_at: string
          id: string
          injected_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["jackpot_pool_status_type"]
          updated_at: string
        }
        Insert: {
          accumulated_ap?: number
          carried_over_at?: string | null
          created_at?: string
          id?: string
          injected_at?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["jackpot_pool_status_type"]
          updated_at?: string
        }
        Update: {
          accumulated_ap?: number
          carried_over_at?: string | null
          created_at?: string
          id?: string
          injected_at?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["jackpot_pool_status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_jackpot_pools_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_standings: {
        Row: {
          id: string
          losses: number
          season_id: string
          team_id: string
          total_zp: number
          updated_at: string | null
          wins: number
        }
        Insert: {
          id?: string
          losses?: number
          season_id: string
          team_id: string
          total_zp?: number
          updated_at?: string | null
          wins?: number
        }
        Update: {
          id?: string
          losses?: number
          season_id?: string
          team_id?: string
          total_zp?: number
          updated_at?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          circuit_id: string
          created_at: string | null
          ends_at: string
          id: string
          name: string
          starts_at: string
          status: string
        }
        Insert: {
          circuit_id: string
          created_at?: string | null
          ends_at: string
          id?: string
          name: string
          starts_at: string
          status?: string
        }
        Update: {
          circuit_id?: string
          created_at?: string | null
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          id: string
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          created_at: string
          id: string
          is_default: boolean
          phone: string
          player_id: string
          postal_code: string
          province: string
          recipient_name: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          phone: string
          player_id: string
          postal_code: string
          province: string
          recipient_name: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          phone?: string
          player_id?: string
          postal_code?: string
          province?: string
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_perks: {
        Row: {
          amount_used: number
          created_at: string
          id: string
          is_active: boolean
          max_quota_amount: number
          perk_type: Database["public"]["Enums"]["perk_type"]
          subscription_id: string
          team_id: string
          valid_until: string
        }
        Insert: {
          amount_used?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_quota_amount?: number
          perk_type?: Database["public"]["Enums"]["perk_type"]
          subscription_id: string
          team_id: string
          valid_until: string
        }
        Update: {
          amount_used?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_quota_amount?: number
          perk_type?: Database["public"]["Enums"]["perk_type"]
          subscription_id?: string
          team_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_perks_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_perks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          partner_brand: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          partner_brand?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          partner_brand?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_item_variants: {
        Row: {
          available_until: string | null
          id: string
          is_active: boolean
          item_id: string
          name: string
          price_ap: number
          price_thb: number
          reserved_stock: number
          stock: number
        }
        Insert: {
          available_until?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          name: string
          price_ap?: number
          price_thb?: number
          reserved_stock?: number
          stock?: number
        }
        Update: {
          available_until?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          name?: string
          price_ap?: number
          price_thb?: number
          reserved_stock?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_type: string | null
          max_per_player: number | null
          name: string
          partner_brand: string | null
          price_ap: number | null
          price_thb_est: number | null
          stock_quantity: number | null
          type: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string | null
          max_per_player?: number | null
          name: string
          partner_brand?: string | null
          price_ap?: number | null
          price_thb_est?: number | null
          stock_quantity?: number | null
          type: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string | null
          max_per_player?: number | null
          name?: string
          partner_brand?: string | null
          price_ap?: number | null
          price_thb_est?: number | null
          stock_quantity?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_sessions: {
        Row: {
          connected_at: string | null
          created_at: string
          current_bitrate_kbps: number | null
          current_fps: number | null
          disconnect_reason: string | null
          disconnected_at: string | null
          ended_at: string | null
          frame_drop_ratio: number | null
          health_status: string
          id: string
          ingest_server: string
          is_connected: boolean
          metadata: Json | null
          session_uid: string | null
          stream_id: string
          stream_key: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          current_bitrate_kbps?: number | null
          current_fps?: number | null
          disconnect_reason?: string | null
          disconnected_at?: string | null
          ended_at?: string | null
          frame_drop_ratio?: number | null
          health_status?: string
          id?: string
          ingest_server?: string
          is_connected?: boolean
          metadata?: Json | null
          session_uid?: string | null
          stream_id: string
          stream_key: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          current_bitrate_kbps?: number | null
          current_fps?: number | null
          disconnect_reason?: string | null
          disconnected_at?: string | null
          ended_at?: string | null
          frame_drop_ratio?: number | null
          health_status?: string
          id?: string
          ingest_server?: string
          is_connected?: boolean
          metadata?: Json | null
          session_uid?: string | null
          stream_id?: string
          stream_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          ap_budget_spent: number
          ap_budget_total: number | null
          available_until: string | null
          created_at: string
          creator_id: string | null
          deleted_at: string | null
          description: string | null
          duration_seconds: number | null
          earning_rule_id: string | null
          embed_url: string | null
          ended_at: string | null
          external_id: string | null
          id: string
          is_earn_eligible: boolean
          is_public: boolean
          language: string
          match_id: string | null
          peak_viewers: number
          platform: string
          scheduled_at: string | null
          slug: string
          started_at: string | null
          status: Database["public"]["Enums"]["stream_status_type"]
          stream_url: string
          thumbnail_url: string | null
          title: string
          tournament_id: string | null
          type: Database["public"]["Enums"]["stream_type_type"]
          unique_viewers: number
          updated_at: string
          view_count: number
        }
        Insert: {
          ap_budget_spent?: number
          ap_budget_total?: number | null
          available_until?: string | null
          created_at?: string
          creator_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          earning_rule_id?: string | null
          embed_url?: string | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          is_earn_eligible?: boolean
          is_public?: boolean
          language?: string
          match_id?: string | null
          peak_viewers?: number
          platform?: string
          scheduled_at?: string | null
          slug: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stream_status_type"]
          stream_url: string
          thumbnail_url?: string | null
          title: string
          tournament_id?: string | null
          type?: Database["public"]["Enums"]["stream_type_type"]
          unique_viewers?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          ap_budget_spent?: number
          ap_budget_total?: number | null
          available_until?: string | null
          created_at?: string
          creator_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          earning_rule_id?: string | null
          embed_url?: string | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          is_earn_eligible?: boolean
          is_public?: boolean
          language?: string
          match_id?: string | null
          peak_viewers?: number
          platform?: string
          scheduled_at?: string | null
          slug?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stream_status_type"]
          stream_url?: string
          thumbnail_url?: string | null
          title?: string
          tournament_id?: string | null
          type?: Database["public"]["Enums"]["stream_type_type"]
          unique_viewers?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_earning_rule_id_fkey"
            columns: ["earning_rule_id"]
            isOneToOne: false
            referencedRelation: "ap_earning_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_ap: number | null
          amount_thb: number | null
          created_at: string
          currency: string
          expires_at: string
          id: string
          idempotency_key: string | null
          paid_at: string | null
          player_id: string | null
          status: Database["public"]["Enums"]["invoice_status_type"]
          subscriber_type: Database["public"]["Enums"]["subscriber_owner_type"]
          subscription_id: string
          team_id: string | null
        }
        Insert: {
          amount_ap?: number | null
          amount_thb?: number | null
          created_at?: string
          currency: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          player_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status_type"]
          subscriber_type: Database["public"]["Enums"]["subscriber_owner_type"]
          subscription_id: string
          team_id?: string | null
        }
        Update: {
          amount_ap?: number | null
          amount_thb?: number | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          player_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status_type"]
          subscriber_type?: Database["public"]["Enums"]["subscriber_owner_type"]
          subscription_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew_with_ap: boolean
          created_at: string
          current_status: Database["public"]["Enums"]["subscription_status_type"]
          grace_until: string | null
          id: string
          plan_code: string
          player_id: string | null
          subscriber_type: Database["public"]["Enums"]["subscriber_owner_type"]
          team_id: string | null
          updated_at: string
          valid_until: string
        }
        Insert: {
          auto_renew_with_ap?: boolean
          created_at?: string
          current_status?: Database["public"]["Enums"]["subscription_status_type"]
          grace_until?: string | null
          id?: string
          plan_code: string
          player_id?: string | null
          subscriber_type?: Database["public"]["Enums"]["subscriber_owner_type"]
          team_id?: string | null
          updated_at?: string
          valid_until: string
        }
        Update: {
          auto_renew_with_ap?: boolean
          created_at?: string
          current_status?: Database["public"]["Enums"]["subscription_status_type"]
          grace_until?: string | null
          id?: string
          plan_code?: string
          player_id?: string | null
          subscriber_type?: Database["public"]["Enums"]["subscriber_owner_type"]
          team_id?: string | null
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      system_burn_ledger: {
        Row: {
          burned_ap_amount: number
          burned_at: string
          id: string
          reference_id: string | null
          source_module: string
        }
        Insert: {
          burned_ap_amount: number
          burned_at?: string
          id?: string
          reference_id?: string | null
          source_module: string
        }
        Update: {
          burned_ap_amount?: number
          burned_at?: string
          id?: string
          reference_id?: string | null
          source_module?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          jersey_number: number | null
          joined_at: string | null
          left_at: string | null
          player_id: string
          removal_reason: string | null
          responded_at: string | null
          role: Database["public"]["Enums"]["team_role_type"]
          status: Database["public"]["Enums"]["membership_status_type"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          jersey_number?: number | null
          joined_at?: string | null
          left_at?: string | null
          player_id: string
          removal_reason?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"]
          status?: Database["public"]["Enums"]["membership_status_type"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          jersey_number?: number | null
          joined_at?: string | null
          left_at?: string | null
          player_id?: string
          removal_reason?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"]
          status?: Database["public"]["Enums"]["membership_status_type"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          brand_colors: Json | null
          captain_id: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          game_id: string
          id: string
          is_active: boolean
          is_locked: boolean
          is_roster_locked: boolean | null
          locked_until: string | null
          logo_url: string | null
          losses: number
          name: string
          organization_id: string | null
          slug: string
          tag: string
          total_zp: number
          updated_at: string
          wins: number
        }
        Insert: {
          brand_colors?: Json | null
          captain_id?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          game_id: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_roster_locked?: boolean | null
          locked_until?: string | null
          logo_url?: string | null
          losses?: number
          name: string
          organization_id?: string | null
          slug: string
          tag: string
          total_zp?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          brand_colors?: Json | null
          captain_id?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          game_id?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_roster_locked?: boolean | null
          locked_until?: string | null
          logo_url?: string | null
          losses?: number
          name?: string
          organization_id?: string | null
          slug?: string
          tag?: string
          total_zp?: number
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          ap_deducted: number | null
          id: string
          idempotency_key: string
          registered_at: string | null
          roster_snapshot_id: string | null
          status: string
          team_id: string
          tournament_id: string
        }
        Insert: {
          ap_deducted?: number | null
          id?: string
          idempotency_key: string
          registered_at?: string | null
          roster_snapshot_id?: string | null
          status?: string
          team_id: string
          tournament_id: string
        }
        Update: {
          ap_deducted?: number | null
          id?: string
          idempotency_key?: string
          registered_at?: string | null
          roster_snapshot_id?: string | null
          status?: string
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          best_of_config: Json
          created_at: string | null
          end_at: string | null
          format: Database["public"]["Enums"]["stage_format_type"]
          format_config: Json
          id: string
          map_pool: string[] | null
          name: string
          stage_order: number
          start_at: string | null
          status: Database["public"]["Enums"]["stage_status_type"]
          teams_advancing: number | null
          teams_in: number | null
          tournament_id: string
          updated_at: string
          veto_format: Json | null
        }
        Insert: {
          best_of_config?: Json
          created_at?: string | null
          end_at?: string | null
          format: Database["public"]["Enums"]["stage_format_type"]
          format_config?: Json
          id?: string
          map_pool?: string[] | null
          name: string
          stage_order: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["stage_status_type"]
          teams_advancing?: number | null
          teams_in?: number | null
          tournament_id: string
          updated_at?: string
          veto_format?: Json | null
        }
        Update: {
          best_of_config?: Json
          created_at?: string | null
          end_at?: string | null
          format?: Database["public"]["Enums"]["stage_format_type"]
          format_config?: Json
          id?: string
          map_pool?: string[] | null
          name?: string
          stage_order?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["stage_status_type"]
          teams_advancing?: number | null
          teams_in?: number | null
          tournament_id?: string
          updated_at?: string
          veto_format?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          entry_fee_ap: number
          format: string
          id: string
          max_teams: number
          name: string
          prize_zp: number
          registration_closes_at: string | null
          registration_opens_at: string | null
          season_id: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          entry_fee_ap?: number
          format: string
          id?: string
          max_teams?: number
          name: string
          prize_zp?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          season_id: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          entry_fee_ap?: number
          format?: string
          id?: string
          max_teams?: number
          name?: string
          prize_zp?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          season_id?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          player_id: string
          revoke_reason: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          scope_id: string | null
          scope_type: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          player_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          scope_id?: string | null
          scope_type?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          player_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          scope_id?: string | null
          scope_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          concurrent_slot_limit: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_listing_count: number
          monthly_reset_at: string
          player_id: string
          shop_name: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          concurrent_slot_limit?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_listing_count?: number
          monthly_reset_at?: string
          player_id: string
          shop_name: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          concurrent_slot_limit?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_listing_count?: number
          monthly_reset_at?: string
          player_id?: string
          shop_name?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_heartbeats: {
        Row: {
          anomaly_reason: string | null
          cap_reached_at: string | null
          created_at: string
          delta_sec: number
          id: string
          is_anomalous: boolean
          playback_rate: number
          position_sec: number
          risk_score_delta: number
          session_id: string
          watched_seconds: number
        }
        Insert: {
          anomaly_reason?: string | null
          cap_reached_at?: string | null
          created_at?: string
          delta_sec: number
          id?: string
          is_anomalous?: boolean
          playback_rate?: number
          position_sec: number
          risk_score_delta?: number
          session_id: string
          watched_seconds: number
        }
        Update: {
          anomaly_reason?: string | null
          cap_reached_at?: string | null
          created_at?: string
          delta_sec?: number
          id?: string
          is_anomalous?: boolean
          playback_rate?: number
          position_sec?: number
          risk_score_delta?: number
          session_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "watch_heartbeats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "watch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_sessions: {
        Row: {
          anomaly_note: string | null
          ap_awarded: number | null
          claimed_at: string | null
          created_at: string
          device_id: string | null
          earning_rule_id: string | null
          id: string
          ip_address: string | null
          is_anomalous: boolean
          last_heartbeat_at: string | null
          player_id: string
          position_sec: number
          risk_score: number
          start_idempotency_key: string | null
          started_at: string
          status: string
          stream_id: string
          updated_at: string
          watched_seconds: number
        }
        Insert: {
          anomaly_note?: string | null
          ap_awarded?: number | null
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          earning_rule_id?: string | null
          id?: string
          ip_address?: string | null
          is_anomalous?: boolean
          last_heartbeat_at?: string | null
          player_id: string
          position_sec?: number
          risk_score?: number
          start_idempotency_key?: string | null
          started_at?: string
          status?: string
          stream_id: string
          updated_at?: string
          watched_seconds?: number
        }
        Update: {
          anomaly_note?: string | null
          ap_awarded?: number | null
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          earning_rule_id?: string | null
          id?: string
          ip_address?: string | null
          is_anomalous?: boolean
          last_heartbeat_at?: string | null
          player_id?: string
          position_sec?: number
          risk_score?: number
          start_idempotency_key?: string | null
          started_at?: string
          status?: string
          stream_id?: string
          updated_at?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "watch_sessions_earning_rule_id_fkey"
            columns: ["earning_rule_id"]
            isOneToOne: false
            referencedRelation: "ap_earning_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_team_analytics: {
        Row: {
          adr_metrics: number | null
          avg_acs: number | null
          avg_assists: number | null
          avg_deaths: number | null
          avg_headshot_pct: number | null
          avg_kills: number | null
          data_as_of: string | null
          economy_breakdown: Json | null
          first_blood_pct: number | null
          games_played: number | null
          heatmap_data: Json | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_revert_prediction_pool: {
        Args: { p_admin_id: string; p_pool_id: string }
        Returns: Json
      }
      admin_void_match_and_refund: {
        Args: { p_admin_id: string; p_match_id: string; p_reason: string }
        Returns: Json
      }
      advance_bracket_node: {
        Args: { p_match_id: string; p_winner_team_id: string }
        Returns: Json
      }
      buy_prediction_ticket: {
        Args: {
          p_ap_amount: number
          p_idempotency_key: string
          p_player_id: string
          p_pool_id: string
          p_predicted_team_id: string
          p_tier: Database["public"]["Enums"]["prediction_ticket_tier_type"]
        }
        Returns: Json
      }
      buyout_athlete_listing: {
        Args: {
          p_buyer_player_id: string
          p_destination_team_id: string
          p_listing_id: string
        }
        Returns: Json
      }
      buyout_marketplace_item: {
        Args: {
          p_buyer_id: string
          p_idempotency_key: string
          p_listing_id: string
        }
        Returns: Json
      }
      check_athlete_roster_lock: {
        Args: { p_player_id: string }
        Returns: boolean
      }
      checkout_order: { Args: { p_order_id: string }; Returns: Json }
      claim_watch_reward: { Args: { p_session_id: string }; Returns: Json }
      clean_expired_orders: { Args: never; Returns: number }
      confirm_shelf_payment: { Args: { p_listing_id: string }; Returns: Json }
      consume_p2p_transfer_token: {
        Args: { p_jti: string; p_sender_id: string }
        Returns: Json
      }
      create_marketplace_listing: {
        Args: {
          p_auction_ends_at: string
          p_buyout_price: number
          p_currency_type: Database["public"]["Enums"]["listing_currency_type"]
          p_description: string
          p_floor_price: number
          p_image_urls: Json
          p_is_paid_slot: boolean
          p_item_title: string
          p_vendor_id: string
        }
        Returns: Json
      }
      create_store_order: {
        Args: {
          p_address_id?: string
          p_idempotency_key?: string
          p_items_json: Json
        }
        Returns: string
      }
      create_subscription_invoice: {
        Args: {
          p_idempotency_key: string
          p_plan_code: string
          p_subscriber_id: string
          p_subscriber_type: Database["public"]["Enums"]["subscriber_owner_type"]
        }
        Returns: Json
      }
      credit_watch_v2_heartbeat: {
        Args: { p_player_id: string; p_session_id: string }
        Returns: Json
      }
      current_player_id: { Args: never; Returns: string }
      deduct_player_ap_fine: {
        Args: { p_amount: number; p_player_id: string; p_reason: string }
        Returns: Json
      }
      dispute_escrow_and_refund: {
        Args: { p_escrow_id: string; p_sender_id: string }
        Returns: Json
      }
      equip_inventory_item: { Args: { p_variant_id: string }; Returns: Json }
      generate_athlete_id: { Args: never; Returns: string }
      get_daily_unverified_bid_total: {
        Args: { p_player_id: string }
        Returns: number
      }
      get_plan_ap_cost: { Args: { p_plan_code: string }; Returns: number }
      inject_jackpot_bonus: {
        Args: { p_pool_id: string; p_season_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_referee_of: { Args: { p_match_id: string }; Returns: boolean }
      is_team_leader: { Args: { p_team_id: string }; Returns: boolean }
      issue_p2p_otp_challenge: {
        Args: { p_otp_code_hash: string; p_sender_id: string }
        Returns: Json
      }
      mark_subscription_invoice_paid: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      match_ffxi_athlete_bid: {
        Args: {
          p_bid_amount_ap: number
          p_bidder_player_id: string
          p_destination_team_id: string
          p_idempotency_key?: string
          p_listing_id: string
        }
        Returns: Json
      }
      match_ffxi_blind_bid: {
        Args: {
          p_bid_amount: number
          p_bidder_id: string
          p_idempotency_key: string
          p_listing_id: string
        }
        Returns: Json
      }
      move_ap:
        | {
            Args: {
              p_amount: number
              p_idempotency_key?: string
              p_metadata?: Json
              p_player_id: string
              p_reason: string
            }
            Returns: number
          }
        | {
            Args: {
              p_amount: number
              p_idempotency_key?: string
              p_player_id: string
              p_reason: string
              p_reference_id?: string
              p_reference_type?: string
            }
            Returns: Json
          }
      open_prediction_pool: {
        Args: { p_house_fee_percent?: number; p_match_id: string }
        Returns: Json
      }
      redeem_sponsor_perk: {
        Args: { p_redeemed_amount: number; p_redemption_id: string }
        Returns: Json
      }
      refresh_team_analytics: { Args: never; Returns: undefined }
      release_escrow_to_receiver: {
        Args: { p_auto?: boolean; p_escrow_id: string }
        Returns: Json
      }
      renew_subscription_with_ap: {
        Args: {
          p_idempotency_key: string
          p_player_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      request_perk_redemption: {
        Args: {
          p_amount: number
          p_perk_id: string
          p_perk_token: string
          p_redeemed_by_player_id: string
          p_redemption_id: string
        }
        Returns: Json
      }
      resolve_expired_ready_checks: {
        Args: never
        Returns: {
          final_status: string
          resolved_match_id: string
          winner_team_id: string
        }[]
      }
      resolve_match_season_id: { Args: { p_match_id: string }; Returns: string }
      settle_payment_intent: {
        Args: { p_payment_intent_id: string }
        Returns: Json
      }
      settle_prediction_pool: {
        Args: { p_pool_id: string; p_winning_team_id: string }
        Returns: Json
      }
      sweep_subscription_lifecycle: { Args: never; Returns: number }
      transfer_ap_to_escrow: {
        Args: {
          p_amount_ap: number
          p_idempotency_key: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      unequip_inventory_item: { Args: { p_variant_id: string }; Returns: Json }
      verify_p2p_otp_challenge: {
        Args: { p_otp_code_hash: string; p_sender_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_status_type:
        | "PENDING"
        | "ACTIVE"
        | "SUSPENDED"
        | "BANNED"
        | "DEACTIVATED"
      ap_reason_type:
        | "WATCH_EARN"
        | "TOP_UP"
        | "CRYPTO_TOP_UP"
        | "PRIZE_PAYOUT"
        | "REFUND"
        | "PROMO"
        | "REFERRAL"
        | "COMPENSATION"
        | "STORE_PURCHASE"
        | "TOURNAMENT_ENTRY"
        | "WITHDRAWAL"
        | "PENALTY"
        | "EXPIRY"
        | "ADMIN_ADJUSTMENT"
        | "REVERSAL"
        | "CLAWBACK"
      athlete_bid_status: "PENDING" | "ACCEPTED" | "OUTBID" | "REFUNDED"
      athlete_listing_status:
        | "ACTIVE"
        | "SOLD"
        | "CANCELLED"
        | "EXPIRED"
        | "ESCROW_LOCKED"
      athlete_listing_type: "AUCTION" | "BUYOUT_ONLY" | "DUAL_MODE"
      audit_action_type:
        | "CREATE"
        | "UPDATE"
        | "DELETE"
        | "LOGIN"
        | "LOGOUT"
        | "GRANT"
        | "REVOKE"
        | "APPROVE"
        | "REJECT"
        | "CREDIT"
        | "DEBIT"
        | "TRANSFER"
        | "BAN"
        | "UNBAN"
        | "SUSPEND"
        | "RESTORE"
      bracket_node_status_type:
        | "PENDING"
        | "READY"
        | "LIVE"
        | "COMPLETED"
        | "VOID"
        | "RESET"
      decision_type_type:
        | "PENALTY"
        | "SCORE_OVERRIDE"
        | "MATCH_VOID"
        | "DISQUALIFICATION"
        | "REMATCH_ORDER"
      dispute_status_type:
        | "OPEN"
        | "UNDER_REVIEW"
        | "AWAITING_EVIDENCE"
        | "RESOLVED"
        | "REJECTED"
        | "ESCALATED"
        | "WITHDRAWN"
      escrow_status_type:
        | "PENDING"
        | "COMPLETED"
        | "CANCELLED"
        | "DISPUTED"
        | "AUTO_RELEASED"
        | "CANCELLED_BANNED"
      game_code_type: "VAL" | "LOL" | "CS2" | "TFT"
      invoice_status_type:
        | "PENDING"
        | "PAID"
        | "EXPIRED"
        | "FAILED"
        | "REFUNDED"
      jackpot_pool_status_type: "ACCUMULATING" | "INJECTED" | "CARRIED_OVER"
      listing_currency_type: "AP" | "THB"
      listing_status_type:
        | "ACTIVE"
        | "PENDING_PAYMENT"
        | "UNPUBLISHED_OVERDUE"
        | "SOLD"
        | "CANCELLED"
        | "EXPIRED"
      match_outcome_type:
        | "NORMAL"
        | "FORFEIT"
        | "WALKOVER"
        | "DISQUALIFICATION"
        | "ADMIN_DECISION"
        | "DRAW"
        | "BYE"
      match_status_type:
        | "SCHEDULED"
        | "READY_CHECK"
        | "VETO"
        | "LIVE"
        | "PAUSED"
        | "AWAITING_RESULT"
        | "DISPUTED"
        | "COMPLETED"
        | "FORFEITED"
        | "WALKOVER"
        | "BYE"
        | "CANCELLED"
      membership_status_type:
        | "INVITED"
        | "REQUESTED"
        | "ACTIVE"
        | "LEFT"
        | "KICKED"
        | "LOCKED"
      notification_channel_type:
        | "IN_APP"
        | "EMAIL"
        | "PUSH"
        | "DISCORD"
        | "LINE"
      perk_type: "HEALTH_WELLNESS_CHECK"
      prediction_pool_status_type:
        | "OPEN"
        | "LOCKED"
        | "SETTLED"
        | "SETTLEMENT_ERROR"
        | "VOIDED"
        | "JACKPOT_CARRIED"
      prediction_ticket_tier_type: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"
      result_source_type:
        | "GAME_API"
        | "PLAYER_REPORT"
        | "REFEREE"
        | "ADMIN_OVERRIDE"
      stage_format_type:
        | "SINGLE_ELIMINATION"
        | "DOUBLE_ELIMINATION"
        | "SWISS"
        | "ROUND_ROBIN"
        | "GROUP_STAGE"
        | "GAUNTLET"
        | "SHOWDOWN"
      stage_status_type:
        | "PENDING"
        | "SEEDING"
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED"
      stream_status_type:
        | "SCHEDULED"
        | "LIVE"
        | "ENDED"
        | "PROCESSING"
        | "AVAILABLE"
        | "REMOVED"
      stream_type_type:
        | "LIVE_MATCH"
        | "VOD"
        | "HIGHLIGHT"
        | "CREATOR"
        | "OFFICIAL"
      subscriber_owner_type: "PLAYER" | "TEAM"
      subscription_status_type:
        | "ACTIVE"
        | "GRACE_PERIOD"
        | "PAST_DUE"
        | "EXPIRED"
        | "CANCELLED"
      team_role_type:
        | "OWNER"
        | "CAPTAIN"
        | "PLAYER"
        | "SUBSTITUTE"
        | "COACH"
        | "MANAGER"
      user_role_type:
        | "ATHLETE"
        | "TEAM_MANAGER"
        | "ORG_OWNER"
        | "CASTER"
        | "REFEREE"
        | "ADMIN"
        | "SUPER_ADMIN"
        | "MARKETPLACE_ADMIN"
      verification_status_type:
        | "UNVERIFIED"
        | "PENDING"
        | "VERIFIED"
        | "MANUAL_REVIEW"
        | "REJECTED"
        | "REVOKED"
      veto_action_type: "BAN" | "PICK" | "DECIDER" | "SIDE_PICK"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status_type: [
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "BANNED",
        "DEACTIVATED",
      ],
      ap_reason_type: [
        "WATCH_EARN",
        "TOP_UP",
        "CRYPTO_TOP_UP",
        "PRIZE_PAYOUT",
        "REFUND",
        "PROMO",
        "REFERRAL",
        "COMPENSATION",
        "STORE_PURCHASE",
        "TOURNAMENT_ENTRY",
        "WITHDRAWAL",
        "PENALTY",
        "EXPIRY",
        "ADMIN_ADJUSTMENT",
        "REVERSAL",
        "CLAWBACK",
      ],
      athlete_bid_status: ["PENDING", "ACCEPTED", "OUTBID", "REFUNDED"],
      athlete_listing_status: [
        "ACTIVE",
        "SOLD",
        "CANCELLED",
        "EXPIRED",
        "ESCROW_LOCKED",
      ],
      athlete_listing_type: ["AUCTION", "BUYOUT_ONLY", "DUAL_MODE"],
      audit_action_type: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "GRANT",
        "REVOKE",
        "APPROVE",
        "REJECT",
        "CREDIT",
        "DEBIT",
        "TRANSFER",
        "BAN",
        "UNBAN",
        "SUSPEND",
        "RESTORE",
      ],
      bracket_node_status_type: [
        "PENDING",
        "READY",
        "LIVE",
        "COMPLETED",
        "VOID",
        "RESET",
      ],
      decision_type_type: [
        "PENALTY",
        "SCORE_OVERRIDE",
        "MATCH_VOID",
        "DISQUALIFICATION",
        "REMATCH_ORDER",
      ],
      dispute_status_type: [
        "OPEN",
        "UNDER_REVIEW",
        "AWAITING_EVIDENCE",
        "RESOLVED",
        "REJECTED",
        "ESCALATED",
        "WITHDRAWN",
      ],
      escrow_status_type: [
        "PENDING",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
        "AUTO_RELEASED",
        "CANCELLED_BANNED",
      ],
      game_code_type: ["VAL", "LOL", "CS2", "TFT"],
      invoice_status_type: ["PENDING", "PAID", "EXPIRED", "FAILED", "REFUNDED"],
      jackpot_pool_status_type: ["ACCUMULATING", "INJECTED", "CARRIED_OVER"],
      listing_currency_type: ["AP", "THB"],
      listing_status_type: [
        "ACTIVE",
        "PENDING_PAYMENT",
        "UNPUBLISHED_OVERDUE",
        "SOLD",
        "CANCELLED",
        "EXPIRED",
      ],
      match_outcome_type: [
        "NORMAL",
        "FORFEIT",
        "WALKOVER",
        "DISQUALIFICATION",
        "ADMIN_DECISION",
        "DRAW",
        "BYE",
      ],
      match_status_type: [
        "SCHEDULED",
        "READY_CHECK",
        "VETO",
        "LIVE",
        "PAUSED",
        "AWAITING_RESULT",
        "DISPUTED",
        "COMPLETED",
        "FORFEITED",
        "WALKOVER",
        "BYE",
        "CANCELLED",
      ],
      membership_status_type: [
        "INVITED",
        "REQUESTED",
        "ACTIVE",
        "LEFT",
        "KICKED",
        "LOCKED",
      ],
      notification_channel_type: ["IN_APP", "EMAIL", "PUSH", "DISCORD", "LINE"],
      perk_type: ["HEALTH_WELLNESS_CHECK"],
      prediction_pool_status_type: [
        "OPEN",
        "LOCKED",
        "SETTLED",
        "SETTLEMENT_ERROR",
        "VOIDED",
        "JACKPOT_CARRIED",
      ],
      prediction_ticket_tier_type: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      result_source_type: [
        "GAME_API",
        "PLAYER_REPORT",
        "REFEREE",
        "ADMIN_OVERRIDE",
      ],
      stage_format_type: [
        "SINGLE_ELIMINATION",
        "DOUBLE_ELIMINATION",
        "SWISS",
        "ROUND_ROBIN",
        "GROUP_STAGE",
        "GAUNTLET",
        "SHOWDOWN",
      ],
      stage_status_type: [
        "PENDING",
        "SEEDING",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
      ],
      stream_status_type: [
        "SCHEDULED",
        "LIVE",
        "ENDED",
        "PROCESSING",
        "AVAILABLE",
        "REMOVED",
      ],
      stream_type_type: [
        "LIVE_MATCH",
        "VOD",
        "HIGHLIGHT",
        "CREATOR",
        "OFFICIAL",
      ],
      subscriber_owner_type: ["PLAYER", "TEAM"],
      subscription_status_type: [
        "ACTIVE",
        "GRACE_PERIOD",
        "PAST_DUE",
        "EXPIRED",
        "CANCELLED",
      ],
      team_role_type: [
        "OWNER",
        "CAPTAIN",
        "PLAYER",
        "SUBSTITUTE",
        "COACH",
        "MANAGER",
      ],
      user_role_type: [
        "ATHLETE",
        "TEAM_MANAGER",
        "ORG_OWNER",
        "CASTER",
        "REFEREE",
        "ADMIN",
        "SUPER_ADMIN",
        "MARKETPLACE_ADMIN",
      ],
      verification_status_type: [
        "UNVERIFIED",
        "PENDING",
        "VERIFIED",
        "MANUAL_REVIEW",
        "REJECTED",
        "REVOKED",
      ],
      veto_action_type: ["BAN", "PICK", "DECIDER", "SIDE_PICK"],
    },
  },
} as const
