export interface Database {
  public: {
    Tables: {
      TrackedEntity: {
        Row: {
          id: string;
          player: string;
          yearMin: number | null;
          yearMax: number | null;
          setKeywords: string[];
          parallelTerms: string[];
          excludeTerms: string[];
          priceCeilingUSD: number | null;
          alertThreshold: number;
          smsThreshold: number;
          active: boolean;
          createdAt: string;
        };
        Insert: {
          id?: string;
          player: string;
          yearMin?: number | null;
          yearMax?: number | null;
          setKeywords?: string[];
          parallelTerms?: string[];
          excludeTerms?: string[];
          priceCeilingUSD?: number | null;
          alertThreshold?: number;
          smsThreshold?: number;
          active?: boolean;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["TrackedEntity"]["Insert"]>;
        Relationships: [];
      };
      Listing: {
        Row: {
          id: string;
          platform: string;
          externalId: string;
          url: string;
          title: string;
          priceUSD: number;
          priceNative: number;
          currency: string;
          imageUrl: string | null;
          sellerInfo: Record<string, unknown> | null;
          rawData: Record<string, unknown>;
          firstSeenAt: string;
          lastSeenAt: string;
          soldAt: string | null;
          actionId: string | null;
          avgSoldPrice: number | null;
          pctBelowMarket: number | null;
          lane: string | null;
        };
        Insert: {
          id?: string;
          platform: string;
          externalId: string;
          url: string;
          title: string;
          priceUSD: number;
          priceNative: number;
          currency: string;
          imageUrl?: string | null;
          sellerInfo?: Record<string, unknown> | null;
          rawData: Record<string, unknown>;
          firstSeenAt?: string;
          lastSeenAt?: string;
          soldAt?: string | null;
          actionId?: string | null;
          avgSoldPrice?: number | null;
          pctBelowMarket?: number | null;
          lane?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["Listing"]["Insert"]>;
        Relationships: [];
      };
      PriceHistory: {
        Row: {
          id: string;
          listingId: string;
          priceUSD: number;
          priceNative: number;
          currency: string;
          recordedAt: string;
        };
        Insert: {
          id?: string;
          listingId: string;
          priceUSD: number;
          priceNative: number;
          currency: string;
          recordedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["PriceHistory"]["Insert"]>;
        Relationships: [];
      };
      MatchScore: {
        Row: {
          id: string;
          listingId: string;
          entityId: string;
          score: number;
          reasons: Record<string, unknown>;
          alerted: boolean;
          createdAt: string;
        };
        Insert: {
          id?: string;
          listingId: string;
          entityId: string;
          score: number;
          reasons: Record<string, unknown>;
          alerted?: boolean;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["MatchScore"]["Insert"]>;
        Relationships: [];
      };
      ExtractionCache: {
        Row: {
          titleHash: string;
          extracted: Record<string, unknown>;
          createdAt: string;
        };
        Insert: {
          titleHash: string;
          extracted: Record<string, unknown>;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ExtractionCache"]["Insert"]>;
        Relationships: [];
      };
      PriceReference: {
        Row: {
          id: string;
          entityId: string;
          cardDescription: string;
          marketPriceUSD: number;
          lastSoldUSD: number | null;
          lastSoldDate: string | null;
          source: string;
          gradedPSA10: number | null;
          gradedPSA9: number | null;
          rawPrice: number | null;
          notes: string | null;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          entityId: string;
          cardDescription: string;
          marketPriceUSD: number;
          lastSoldUSD?: number | null;
          lastSoldDate?: string | null;
          source: string;
          gradedPSA10?: number | null;
          gradedPSA9?: number | null;
          rawPrice?: number | null;
          notes?: string | null;
          updatedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["PriceReference"]["Insert"]>;
        Relationships: [];
      };
      AlertSent: {
        Row: {
          id: string;
          listingId: string;
          entityId: string;
          channel: string;
          sentAt: string;
        };
        Insert: {
          id?: string;
          listingId: string;
          entityId: string;
          channel: string;
          sentAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["AlertSent"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
