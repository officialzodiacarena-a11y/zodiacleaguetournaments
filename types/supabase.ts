export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          game_id: string
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
          game_id: string
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
          game_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_bracket_node: {
        Args: {
          p_match_id: string
          p_winner_team_id: string
        }
        Returns: Json
      }
      current_player_id: { Args: never; Returns: string }
      deduct_player_ap_fine: {
        Args: {
          p_amount: number
          p_player_id: string
          p_reason: string
        }
        Returns: Json
      }
      generate_athlete_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_referee_of: { Args: { p_match_id: string }; Returns: boolean }
      is_team_leader: { Args: { p_team_id: string }; Returns: boolean }
      resolve_expired_ready_checks: {
        Args: never
        Returns: {
          final_status: string
          resolved_match_id: string
          winner_team_id: string
        }[]
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
      game_code_type: "VAL" | "LOL" | "CS2" | "TFT"
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
      game_code_type: ["VAL", "LOL", "CS2", "TFT"],
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
} as const;
