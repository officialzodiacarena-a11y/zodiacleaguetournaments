export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // =========================================================================
      // 1. ATHLETES & TEAMS CORE
      // =========================================================================
      players: {
        Row: {
          id: string
          user_id: string
          athlete_id: string
          display_name: string
          real_name: string | null
          avatar_url: string | null
          country_code: string | null
          ap_balance: number
          status: string
          unverified_data: Json | null
          kyc_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          athlete_id: string
          display_name: string
          real_name?: string | null
          avatar_url?: string | null
          country_code?: string | null
          ap_balance?: number
          status?: string
          unverified_data?: Json | null
          kyc_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          athlete_id?: string
          display_name?: string
          real_name?: string | null
          avatar_url?: string | null
          country_code?: string | null
          ap_balance?: number
          status?: string
          unverified_data?: Json | null
          kyc_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          tag: string
          slug: string | null
          game_id: string
          captain_id: string | null
          is_locked: boolean
          locked_until: string | null
          total_zp: number
          wins: number
          losses: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          tag: string
          slug?: string | null
          game_id: string
          captain_id?: string | null
          is_locked?: boolean
          locked_until?: string | null
          total_zp?: number
          wins?: number
          losses?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          tag?: string
          slug?: string | null
          game_id?: string
          captain_id?: string | null
          is_locked?: boolean
          locked_until?: string | null
          total_zp?: number
          wins?: number
          losses?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          player_id: string
          role: 'OWNER' | 'CAPTAIN' | 'PLAYER' | 'SUBSTITUTE' | 'COACH' | 'MANAGER'
          jersey_number: number | null
          status: 'ACTIVE' | 'INVITED' | 'REJECTED' | 'LEAVING' | 'REMOVED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          role?: 'OWNER' | 'CAPTAIN' | 'PLAYER' | 'SUBSTITUTE' | 'COACH' | 'MANAGER'
          jersey_number?: number | null
          status?: 'ACTIVE' | 'INVITED' | 'REJECTED' | 'LEAVING' | 'REMOVED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          role?: 'OWNER' | 'CAPTAIN' | 'PLAYER' | 'SUBSTITUTE' | 'COACH' | 'MANAGER'
          jersey_number?: number | null
          status?: 'ACTIVE' | 'INVITED' | 'REJECTED' | 'LEAVING' | 'REMOVED'
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          player_id: string
          role: 'SUPER_ADMIN' | 'ADMIN' | 'REFEREE' | 'MARKETPLACE_ADMIN' | 'PRODUCER' | 'ATHLETE'
          assigned_at: string
          revoked_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          player_id: string
          role: 'SUPER_ADMIN' | 'ADMIN' | 'REFEREE' | 'MARKETPLACE_ADMIN' | 'PRODUCER' | 'ATHLETE'
          assigned_at?: string
          revoked_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          player_id?: string
          role?: 'SUPER_ADMIN' | 'ADMIN' | 'REFEREE' | 'MARKETPLACE_ADMIN' | 'PRODUCER' | 'ATHLETE'
          assigned_at?: string
          revoked_at?: string | null
          expires_at?: string | null
        }
      }
      game_accounts: {
        Row: {
          id: string
          player_id: string
          game_id: string
          game_name: string | null
          tag_line: string | null
          verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED' | 'MANUAL_REVIEW' | 'SELF_DECLARED'
          evidence_url: string | null
          rejection_reason: string | null
          verified_at: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          game_id: string
          game_name?: string | null
          tag_line?: string | null
          verification_status?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED' | 'MANUAL_REVIEW' | 'SELF_DECLARED'
          evidence_url?: string | null
          rejection_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          game_id?: string
          game_name?: string | null
          tag_line?: string | null
          verification_status?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED' | 'MANUAL_REVIEW' | 'SELF_DECLARED'
          evidence_url?: string | null
          rejection_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =========================================================================
      // 2. ATHLETE TRANSFER MARKET ENGINE
      // =========================================================================
      athlete_market_listings: {
        Row: {
          id: string
          seller_player_id: string
          seller_team_id: string | null
          target_player_id: string
          listing_type: 'AUCTION' | 'BUYOUT_ONLY' | 'DUAL_MODE'
          floor_price_ap: number
          buyout_price_ap: number | null
          current_highest_bid_ap: number
          highest_bidder_id: string | null
          status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'ESCROW_LOCKED'
          contract_note: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_player_id: string
          seller_team_id?: string | null
          target_player_id: string
          listing_type?: 'AUCTION' | 'BUYOUT_ONLY' | 'DUAL_MODE'
          floor_price_ap: number
          buyout_price_ap?: number | null
          current_highest_bid_ap?: number
          highest_bidder_id?: string | null
          status?: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'ESCROW_LOCKED'
          contract_note?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_player_id?: string
          seller_team_id?: string | null
          target_player_id?: string
          listing_type?: 'AUCTION' | 'BUYOUT_ONLY' | 'DUAL_MODE'
          floor_price_ap?: number
          buyout_price_ap?: number | null
          current_highest_bid_ap?: number
          highest_bidder_id?: string | null
          status?: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'ESCROW_LOCKED'
          contract_note?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      athlete_market_bids: {
        Row: {
          id: string
          listing_id: string
          bidder_player_id: string
          destination_team_id: string | null
          bid_amount_ap: number
          status: 'PENDING' | 'ACCEPTED' | 'OUTBID' | 'REFUNDED'
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          bidder_player_id: string
          destination_team_id?: string | null
          bid_amount_ap: number
          status?: 'PENDING' | 'ACCEPTED' | 'OUTBID' | 'REFUNDED'
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          bidder_player_id?: string
          destination_team_id?: string | null
          bid_amount_ap?: number
          status?: 'PENDING' | 'ACCEPTED' | 'OUTBID' | 'REFUNDED'
          created_at?: string
        }
      }
      athlete_transfer_history: {
        Row: {
          id: string
          listing_id: string | null
          player_id: string
          from_team_id: string | null
          to_team_id: string
          deal_type: 'AUCTION_WIN' | 'INSTANT_BUYOUT'
          final_price_ap: number
          platform_fee_ap: number
          seller_payout_ap: number
          completed_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          player_id: string
          from_team_id?: string | null
          to_team_id: string
          deal_type: 'AUCTION_WIN' | 'INSTANT_BUYOUT'
          final_price_ap: number
          platform_fee_ap: number
          seller_payout_ap: number
          completed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          player_id?: string
          from_team_id?: string | null
          to_team_id?: string
          deal_type?: 'AUCTION_WIN' | 'INSTANT_BUYOUT'
          final_price_ap?: number
          platform_fee_ap?: number
          seller_payout_ap?: number
          completed_at?: string
        }
      }

      // =========================================================================
      // 3. SPONSOR BANNER ENGINE
      // =========================================================================
      sponsor_banners: {
        Row: {
          id: string
          title: string
          slot_position: 'TOP_LEADERBOARD' | 'LEFT_TOWER' | 'RIGHT_TOWER' | string
          image_url: string
          target_url: string
          brand_name: string | null
          priority: number
          is_active: boolean
          starts_at: string
          ends_at: string | null
          impression_count: number
          click_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slot_position: 'TOP_LEADERBOARD' | 'LEFT_TOWER' | 'RIGHT_TOWER' | string
          image_url: string
          target_url: string
          brand_name?: string | null
          priority?: number
          is_active?: boolean
          starts_at?: string
          ends_at?: string | null
          impression_count?: number
          click_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slot_position?: 'TOP_LEADERBOARD' | 'LEFT_TOWER' | 'RIGHT_TOWER' | string
          image_url?: string
          target_url?: string
          brand_name?: string | null
          priority?: number
          is_active?: boolean
          starts_at?: string
          ends_at?: string | null
          impression_count?: number
          click_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // =========================================================================
      // 4. COMPETITION & TOURNAMENT ENGINE
      // =========================================================================
      tournaments: {
        Row: {
          id: string
          season_id: string | null
          name: string
          type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASON_FINALE' | 'MERCENARY' | string | null
          status: 'UPCOMING' | 'REGISTRATION' | 'OPEN' | 'ONGOING' | 'ACTIVE' | 'CONCLUDED' | 'COMPLETED'
          max_teams: number | null
          entry_fee_ap: number
          start_at: string | null
          registration_closes_at: string | null
          format_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id?: string | null
          name: string
          type?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASON_FINALE' | 'MERCENARY' | string | null
          status?: 'UPCOMING' | 'REGISTRATION' | 'OPEN' | 'ONGOING' | 'ACTIVE' | 'CONCLUDED' | 'COMPLETED'
          max_teams?: number | null
          entry_fee_ap?: number
          start_at?: string | null
          registration_closes_at?: string | null
          format_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string | null
          name?: string
          type?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASON_FINALE' | 'MERCENARY' | string | null
          status?: 'UPCOMING' | 'REGISTRATION' | 'OPEN' | 'ONGOING' | 'ACTIVE' | 'CONCLUDED' | 'COMPLETED'
          max_teams?: number | null
          entry_fee_ap?: number
          start_at?: string | null
          registration_closes_at?: string | null
          format_config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tournament_stages: {
        Row: {
          id: string
          tournament_id: string
          name: string
          stage_order: number
          format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'SWISS' | 'ROUND_ROBIN' | 'GROUP_STAGE' | 'GAUNTLET' | 'SHOWDOWN'
          status: 'PENDING' | 'SEEDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
          teams_in: number | null
          teams_advancing: number | null
          format_config: Json
          best_of_config: Json
          map_pool: string[] | null
          veto_format: Json
          start_at: string | null
          end_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          stage_order: number
          format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'SWISS' | 'ROUND_ROBIN' | 'GROUP_STAGE' | 'GAUNTLET' | 'SHOWDOWN'
          status?: 'PENDING' | 'SEEDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
          teams_in?: number | null
          teams_advancing?: number | null
          format_config?: Json
          best_of_config?: Json
          map_pool?: string[] | null
          veto_format?: Json
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          stage_order?: number
          format?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'SWISS' | 'ROUND_ROBIN' | 'GROUP_STAGE' | 'GAUNTLET' | 'SHOWDOWN'
          status?: 'PENDING' | 'SEEDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
          teams_in?: number | null
          teams_advancing?: number | null
          format_config?: Json
          best_of_config?: Json
          map_pool?: string[] | null
          veto_format?: Json
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          stage_id: string | null
          status: 'SCHEDULED' | 'READY_CHECK' | 'VETO' | 'LIVE' | 'PAUSED' | 'AWAITING_RESULT' | 'DISPUTED' | 'COMPLETED' | 'FORFEITED' | 'WALKOVER' | 'BYE' | 'CANCELLED'
          best_of: number
          score_a: number
          score_b: number
          rounds_won_a: number
          rounds_won_b: number
          team_a_id: string | null
          team_b_id: string | null
          team_a_ready_at: string | null
          team_b_ready_at: string | null
          referee_id: string | null
          winner_team_id: string | null
          outcome: string | null
          forfeit_deadline_at: string | null
          scheduled_at: string | null
          started_at: string | null
          ended_at: string | null
          format_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          stage_id?: string | null
          status?: 'SCHEDULED' | 'READY_CHECK' | 'VETO' | 'LIVE' | 'PAUSED' | 'AWAITING_RESULT' | 'DISPUTED' | 'COMPLETED' | 'FORFEITED' | 'WALKOVER' | 'BYE' | 'CANCELLED'
          best_of?: number
          score_a?: number
          score_b?: number
          rounds_won_a?: number
          rounds_won_b?: number
          team_a_id?: string | null
          team_b_id?: string | null
          team_a_ready_at?: string | null
          team_b_ready_at?: string | null
          referee_id?: string | null
          winner_team_id?: string | null
          outcome?: string | null
          forfeit_deadline_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          format_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          stage_id?: string | null
          status?: 'SCHEDULED' | 'READY_CHECK' | 'VETO' | 'LIVE' | 'PAUSED' | 'AWAITING_RESULT' | 'DISPUTED' | 'COMPLETED' | 'FORFEITED' | 'WALKOVER' | 'BYE' | 'CANCELLED'
          best_of?: number
          score_a?: number
          score_b?: number
          rounds_won_a?: number
          rounds_won_b?: number
          team_a_id?: string | null
          team_b_id?: string | null
          team_a_ready_at?: string | null
          team_b_ready_at?: string | null
          referee_id?: string | null
          winner_team_id?: string | null
          outcome?: string | null
          forfeit_deadline_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          ended_at?: string | null
          format_config?: Json
          created_at?: string
          updated_at?: string
        }
      }

      // =========================================================================
      // 5. ECONOMY & LEDGER
      // =========================================================================
      ap_ledger: {
        Row: {
          id: string
          player_id: string
          amount: number
          balance_after: number
          reason: string
          reference_type: string | null
          reference_id: string | null
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          amount: number
          balance_after: number
          reason: string
          reference_type?: string | null
          reference_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          amount?: number
          balance_after?: number
          reason?: string
          reference_type?: string | null
          reference_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          subscriber_type: 'PLAYER' | 'TEAM'
          team_id: string | null
          player_id: string | null
          plan_code: 'PRO_CLUB' | 'VIP_CLUB' | 'ATHLETE_PASS'
          current_status: 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED'
          valid_until: string
          grace_until: string | null
          auto_renew_with_ap: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscriber_type?: 'PLAYER' | 'TEAM'
          team_id?: string | null
          player_id?: string | null
          plan_code: 'PRO_CLUB' | 'VIP_CLUB' | 'ATHLETE_PASS'
          current_status?: 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED'
          valid_until: string
          grace_until?: string | null
          auto_renew_with_ap?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscriber_type?: 'PLAYER' | 'TEAM'
          team_id?: string | null
          player_id?: string | null
          plan_code?: 'PRO_CLUB' | 'VIP_CLUB' | 'ATHLETE_PASS'
          current_status?: 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED'
          valid_until?: string
          grace_until?: string | null
          auto_renew_with_ap?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buyout_athlete_listing: {
        Args: {
          p_listing_id: string
          p_buyer_player_id: string
          p_destination_team_id: string
        }
        Returns: Json
      }
      increment_banner_impression: {
        Args: {
          p_banner_id: string
        }
        Returns: void
      }
      increment_banner_click: {
        Args: {
          p_banner_id: string
        }
        Returns: void
      }
      move_ap: {
        Args: {
          p_player_id: string
          p_amount: number
          p_reason: string
          p_idempotency_key?: string
          p_reference_type?: string
          p_reference_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      athlete_listing_type: 'AUCTION' | 'BUYOUT_ONLY' | 'DUAL_MODE'
      athlete_listing_status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'ESCROW_LOCKED'
      athlete_bid_status: 'PENDING' | 'ACCEPTED' | 'OUTBID' | 'REFUNDED'
      subscription_status_type: 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED'
      subscriber_owner_type: 'PLAYER' | 'TEAM'
    }
  }
}
