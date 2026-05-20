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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          budget_id: string
          code: string | null
          created_at: string
          id: string
          libelle: string
          montant_prevu: number
          niveau: string
          ordre: number
          parent_id: string | null
        }
        Insert: {
          budget_id: string
          code?: string | null
          created_at?: string
          id?: string
          libelle: string
          montant_prevu?: number
          niveau?: string
          ordre?: number
          parent_id?: string | null
        }
        Update: {
          budget_id?: string
          code?: string | null
          created_at?: string
          id?: string
          libelle?: string
          montant_prevu?: number
          niveau?: string
          ordre?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budget_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_insights: {
        Row: {
          budget_id: string
          generated_at: string
          id: string
          insights: Json
        }
        Insert: {
          budget_id: string
          generated_at?: string
          id?: string
          insights: Json
        }
        Update: {
          budget_id?: string
          generated_at?: string
          id?: string
          insights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "budget_insights_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_insights_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budget_summary"
            referencedColumns: ["budget_id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_id: string
          category_id: string | null
          cost_share: number
          cost_unitaire: number | null
          created_at: string
          description: string | null
          id: string
          justification: string | null
          libelle: string
          montant_prevu: number
          ordre: number
          quantite: number | null
          source_row: number | null
          villes: string[] | null
        }
        Insert: {
          budget_id: string
          category_id?: string | null
          cost_share?: number
          cost_unitaire?: number | null
          created_at?: string
          description?: string | null
          id?: string
          justification?: string | null
          libelle: string
          montant_prevu?: number
          ordre?: number
          quantite?: number | null
          source_row?: number | null
          villes?: string[] | null
        }
        Update: {
          budget_id?: string
          category_id?: string | null
          cost_share?: number
          cost_unitaire?: number | null
          created_at?: string
          description?: string | null
          id?: string
          justification?: string | null
          libelle?: string
          montant_prevu?: number
          ordre?: number
          quantite?: number | null
          source_row?: number | null
          villes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budget_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_share_links: {
        Row: {
          allow_export: boolean
          budget_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          label: string | null
          revoked_at: string | null
          token: string
          view_count: number
        }
        Insert: {
          allow_export?: boolean
          budget_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          label?: string | null
          revoked_at?: string | null
          token?: string
          view_count?: number
        }
        Update: {
          allow_export?: boolean
          budget_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          revoked_at?: string | null
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      budgets: {
        Row: {
          created_at: string
          created_by: string
          devise: string
          id: string
          imported_at: string | null
          montant_cost_share: number
          montant_total: number
          nom: string
          project_id: string
          source_file_name: string | null
          source_file_url: string | null
          source_raw: Json | null
          status: string
          taux_change_xof: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          devise?: string
          id?: string
          imported_at?: string | null
          montant_cost_share?: number
          montant_total?: number
          nom: string
          project_id: string
          source_file_name?: string | null
          source_file_url?: string | null
          source_raw?: Json | null
          status?: string
          taux_change_xof?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          devise?: string
          id?: string
          imported_at?: string | null
          montant_cost_share?: number
          montant_total?: number
          nom?: string
          project_id?: string
          source_file_name?: string | null
          source_file_url?: string | null
          source_raw?: Json | null
          status?: string
          taux_change_xof?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          budget_line_id: string
          created_at: string
          created_by: string | null
          id: string
          match_count: number
          pattern: string
        }
        Insert: {
          budget_line_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_count?: number
          pattern: string
        }
        Update: {
          budget_line_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_count?: number
          pattern?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_line_consumption"
            referencedColumns: ["budget_line_id"]
          },
        ]
      }
      payment_budget_allocations: {
        Row: {
          budget_line_id: string
          confidence: number | null
          created_at: string
          id: string
          montant_alloue: number
          montant_alloue_devise_budget: number | null
          payment_id: string
          reasoning: string | null
          source: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          budget_line_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          montant_alloue: number
          montant_alloue_devise_budget?: number | null
          payment_id: string
          reasoning?: string | null
          source?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          budget_line_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          montant_alloue?: number
          montant_alloue_devise_budget?: number | null
          payment_id?: string
          reasoning?: string | null
          source?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_budget_allocations_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_budget_allocations_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_line_consumption"
            referencedColumns: ["budget_line_id"]
          },
          {
            foreignKeyName: "payment_budget_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_documents: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          payment_id: string
          type_piece: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          payment_id: string
          type_piece?: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          payment_id?: string
          type_piece?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_valid: boolean
          payment_id: string
          signature_image_url: string | null
          signed_at: string | null
          signer_name: string | null
          signer_type: Database["public"]["Enums"]["signer_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          payment_id: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_type: Database["public"]["Enums"]["signer_type"]
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          payment_id?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_type?: Database["public"]["Enums"]["signer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_signatures_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_versions: {
        Row: {
          data: Json
          fields_changed: string[] | null
          id: string
          modification_reason: string | null
          modified_at: string
          modified_by: string | null
          payment_id: string
          signature_invalidated: boolean
          version_number: number
        }
        Insert: {
          data: Json
          fields_changed?: string[] | null
          id?: string
          modification_reason?: string | null
          modified_at?: string
          modified_by?: string | null
          payment_id: string
          signature_invalidated?: boolean
          version_number: number
        }
        Update: {
          data?: Json
          fields_changed?: string[] | null
          id?: string
          modification_reason?: string | null
          modified_at?: string
          modified_by?: string | null
          payment_id?: string
          signature_invalidated?: boolean
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_versions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          autorisation_reference: string | null
          beneficiaire_adresse: string | null
          beneficiaire_email: string | null
          beneficiaire_nom: string
          beneficiaire_piece_numero: string | null
          beneficiaire_piece_type: string | null
          beneficiaire_telephone: string | null
          categorie: Database["public"]["Enums"]["expense_category"]
          commentaire: string | null
          created_at: string
          created_by: string
          date_paiement: string
          devise: string
          id: string
          lieu: string | null
          mode_paiement: Database["public"]["Enums"]["payment_mode"]
          montant: number
          motif: string
          motif_absence_recu: string | null
          personne_effectuant: string | null
          project_id: string | null
          reference: string
          reference_transaction: string | null
          statut: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
          version_courante: number
        }
        Insert: {
          autorisation_reference?: string | null
          beneficiaire_adresse?: string | null
          beneficiaire_email?: string | null
          beneficiaire_nom: string
          beneficiaire_piece_numero?: string | null
          beneficiaire_piece_type?: string | null
          beneficiaire_telephone?: string | null
          categorie?: Database["public"]["Enums"]["expense_category"]
          commentaire?: string | null
          created_at?: string
          created_by: string
          date_paiement?: string
          devise?: string
          id?: string
          lieu?: string | null
          mode_paiement?: Database["public"]["Enums"]["payment_mode"]
          montant: number
          motif: string
          motif_absence_recu?: string | null
          personne_effectuant?: string | null
          project_id?: string | null
          reference: string
          reference_transaction?: string | null
          statut?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          version_courante?: number
        }
        Update: {
          autorisation_reference?: string | null
          beneficiaire_adresse?: string | null
          beneficiaire_email?: string | null
          beneficiaire_nom?: string
          beneficiaire_piece_numero?: string | null
          beneficiaire_piece_type?: string | null
          beneficiaire_telephone?: string | null
          categorie?: Database["public"]["Enums"]["expense_category"]
          commentaire?: string | null
          created_at?: string
          created_by?: string
          date_paiement?: string
          devise?: string
          id?: string
          lieu?: string | null
          mode_paiement?: Database["public"]["Enums"]["payment_mode"]
          montant?: number
          motif?: string
          motif_absence_recu?: string | null
          personne_effectuant?: string | null
          project_id?: string | null
          reference?: string
          reference_transaction?: string | null
          statut?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
          version_courante?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_previsionnel: number | null
          code: string
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          description: string | null
          id: string
          nom: string
          parent_id: string | null
          responsable: string | null
          statut: Database["public"]["Enums"]["project_status"]
          type_projet: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          budget_previsionnel?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nom: string
          parent_id?: string | null
          responsable?: string | null
          statut?: Database["public"]["Enums"]["project_status"]
          type_projet?: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          budget_previsionnel?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nom?: string
          parent_id?: string | null
          responsable?: string | null
          statut?: Database["public"]["Enums"]["project_status"]
          type_projet?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_association: {
        Row: {
          adresse: string | null
          created_at: string
          devise_defaut: string
          email: string | null
          id: string
          logo_url: string | null
          mention_legale: string | null
          nom: string
          prefixe_numerotation: string
          president_fonction: string | null
          president_nom: string | null
          president_signature_url: string | null
          prochain_numero: number
          telephone: string | null
          tresoriere_fonction: string | null
          tresoriere_nom: string | null
          tresoriere_signature_url: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          devise_defaut?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          mention_legale?: string | null
          nom?: string
          prefixe_numerotation?: string
          president_fonction?: string | null
          president_nom?: string | null
          president_signature_url?: string | null
          prochain_numero?: number
          telephone?: string | null
          tresoriere_fonction?: string | null
          tresoriere_nom?: string | null
          tresoriere_signature_url?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          devise_defaut?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          mention_legale?: string | null
          nom?: string
          prefixe_numerotation?: string
          president_fonction?: string | null
          president_nom?: string | null
          president_signature_url?: string | null
          prochain_numero?: number
          telephone?: string | null
          tresoriere_fonction?: string | null
          tresoriere_nom?: string | null
          tresoriere_signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signature_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payment_id: string
          refusal_reason: string | null
          sent_via: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["signature_request_status"]
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_id: string
          refusal_reason?: string | null
          sent_via?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_request_status"]
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_id?: string
          refusal_reason?: string | null
          sent_via?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_request_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_budget_line_consumption: {
        Row: {
          budget_id: string | null
          budget_line_id: string | null
          category_id: string | null
          libelle: string | null
          montant_consomme: number | null
          montant_prevu: number | null
          montant_restant: number | null
          pct_consomme: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budget_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_summary: {
        Row: {
          budget_id: string | null
          montant_consomme: number | null
          montant_restant: number | null
          montant_total: number | null
          pct_consomme: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_payment_reference: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "comptable" | "lecture_seule"
      document_type: "facture" | "recu" | "autre" | "justificatif_signature"
      expense_category:
        | "fournitures"
        | "transport"
        | "restauration"
        | "hebergement"
        | "communication"
        | "equipement_sportif"
        | "location_salle"
        | "honoraires"
        | "frais_bancaires"
        | "assurance"
        | "formation"
        | "evenement"
        | "autre"
      payment_mode:
        | "especes"
        | "virement"
        | "cheque"
        | "mobile_money"
        | "carte_bancaire"
        | "autre"
      payment_status:
        | "brouillon"
        | "en_attente_signature"
        | "signe"
        | "a_re_signer"
      payment_type: "recu_importe" | "fiche_manuelle"
      project_status: "actif" | "cloture"
      signature_request_status: "pending" | "signed" | "refused" | "expired"
      signer_type: "president" | "tresoriere" | "beneficiaire"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "comptable", "lecture_seule"],
      document_type: ["facture", "recu", "autre", "justificatif_signature"],
      expense_category: [
        "fournitures",
        "transport",
        "restauration",
        "hebergement",
        "communication",
        "equipement_sportif",
        "location_salle",
        "honoraires",
        "frais_bancaires",
        "assurance",
        "formation",
        "evenement",
        "autre",
      ],
      payment_mode: [
        "especes",
        "virement",
        "cheque",
        "mobile_money",
        "carte_bancaire",
        "autre",
      ],
      payment_status: [
        "brouillon",
        "en_attente_signature",
        "signe",
        "a_re_signer",
      ],
      payment_type: ["recu_importe", "fiche_manuelle"],
      project_status: ["actif", "cloture"],
      signature_request_status: ["pending", "signed", "refused", "expired"],
      signer_type: ["president", "tresoriere", "beneficiaire"],
    },
  },
} as const
