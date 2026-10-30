export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      SnipeBid: {
        Row: {
          id: string;
          externalId: string;
          targetId: string | null;
          title: string | null;
          url: string | null;
          endsAt: string | null;
          maxBid: number;
          status: string;
          wonPrice: number | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          externalId: string;
          targetId?: string | null;
          title?: string | null;
          url?: string | null;
          endsAt?: string | null;
          maxBid: number;
          status: string;
          wonPrice?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          externalId?: string;
          targetId?: string | null;
          title?: string | null;
          url?: string | null;
          endsAt?: string | null;
          maxBid?: number;
          status?: string;
          wonPrice?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      SnipeTarget: {
        Row: {
          id: string;
          actionId: string;
          card: string;
          query: string;
          mustInclude: string[];
          maxBid: number | null;
          exclude: string[];
          raw: number | null;
          psa9: number | null;
          psa10: number | null;
          popTotal: number | null;
          pop9: number | null;
          pop10: number | null;
          printRun: number | null;
          ssp: boolean;
          compsAsOf: string | null;
          confidence: string | null;
          notes: string | null;
          active: boolean;
          psaSpecId: number | null;
          popAsOf: string | null;
          psaCert: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          actionId: string;
          card: string;
          query: string;
          mustInclude?: string[];
          maxBid?: number | null;
          exclude?: string[];
          raw?: number | null;
          psa9?: number | null;
          psa10?: number | null;
          popTotal?: number | null;
          pop9?: number | null;
          pop10?: number | null;
          printRun?: number | null;
          ssp?: boolean;
          compsAsOf?: string | null;
          confidence?: string | null;
          notes?: string | null;
          active?: boolean;
          psaSpecId?: number | null;
          popAsOf?: string | null;
          psaCert?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["SnipeTarget"]["Insert"]>;
        Relationships: [];
      };
      PlayerForm: {
        Row: {
          actionId: string;
          asOf: string;
          season: string | null;
          club: string | null;
          league: string | null;
          scope: string | null;
          age: number | null;
          apps: number | null;
          minutes: number | null;
          goals: number | null;
          assists: number | null;
          avgRating: number | null;
          ratingSource: string | null;
          prior: Json | null;
          note: string | null;
          sources: string[];
          approved: boolean;
          approvedAt: string | null;
          createdAt: string;
        };
        Insert: {
          actionId: string;
          asOf: string;
          season?: string | null;
          club?: string | null;
          league?: string | null;
          scope?: string | null;
          age?: number | null;
          apps?: number | null;
          minutes?: number | null;
          goals?: number | null;
          assists?: number | null;
          avgRating?: number | null;
          ratingSource?: string | null;
          prior?: Json | null;
          note?: string | null;
          sources?: string[];
          approved?: boolean;
          approvedAt?: string | null;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["PlayerForm"]["Insert"]>;
        Relationships: [];
      };
      CardValueSnapshot: {
        Row: {
          cardId: string;
          week: string;
          status: string;
          valueNow: number | null;
          psa10: number | null;
          psa9: number | null;
          psa8: number | null;
          cost: number | null;
          createdAt: string;
        };
        Insert: {
          cardId: string;
          week: string;
          status: string;
          valueNow?: number | null;
          psa10?: number | null;
          psa9?: number | null;
          psa8?: number | null;
          cost?: number | null;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["CardValueSnapshot"]["Insert"]>;
        Relationships: [];
      };
      Submission: {
        Row: {
          id: string;
          subNumber: string | null;
          grader: string;
          serviceLevel: string | null;
          feePerCard: number | null;
          status: string | null;
          arrivedOn: string | null;
          estComplete: string | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          subNumber?: string | null;
          grader?: string;
          serviceLevel?: string | null;
          feePerCard?: number | null;
          status?: string | null;
          arrivedOn?: string | null;
          estComplete?: string | null;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["Submission"]["Insert"]>;
        Relationships: [];
      };
      Card: {
        Row: {
          id: string;
          status: "graded" | "raw" | "at_grader" | "sold" | "sealed";
          item: string;
          player: string | null;
          year: string | null;
          setName: string | null;
          cardNumber: string | null;
          parallel: string | null;
          printRun: number | null;
          grader: string | null;
          grade: string | null;
          cert: string | null;
          qty: number;
          submissionId: string | null;
          dateAdded: string | null;
          imagePath: string | null;
          psaSpecId: number | null;
          notes: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          status: "graded" | "raw" | "at_grader" | "sold" | "sealed";
          item: string;
          player?: string | null;
          year?: string | null;
          setName?: string | null;
          cardNumber?: string | null;
          parallel?: string | null;
          printRun?: number | null;
          grader?: string | null;
          grade?: string | null;
          cert?: string | null;
          qty?: number;
          submissionId?: string | null;
          dateAdded?: string | null;
          imagePath?: string | null;
          psaSpecId?: number | null;
          notes?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["Card"]["Insert"]>;
        Relationships: [];
      };
      CardComp: {
        Row: {
          id: number;
          cardId: string;
          grade: string;
          price: number;
          sampleSize: number;
          method: string;
          source: string;
          asOf: string;
          createdAt: string;
        };
        Insert: {
          id?: number;
          cardId: string;
          grade: string;
          price: number;
          sampleSize?: number;
          method?: string;
          source: string;
          asOf: string;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["CardComp"]["Insert"]>;
        Relationships: [];
      };
      CardPop: {
        Row: {
          cardId: string;
          asOf: string;
          total: number | null;
          gem10: number | null;
          pop9: number | null;
          gemRate: number | null;
          source: string;
        };
        Insert: {
          cardId: string;
          asOf: string;
          total?: number | null;
          gem10?: number | null;
          pop9?: number | null;
          gemRate?: number | null;
          source?: string;
        };
        Update: Partial<Database["public"]["Tables"]["CardPop"]["Insert"]>;
        Relationships: [];
      };
      LedgerEntry: {
        Row: {
          id: number;
          cardId: string | null;
          submissionId: string | null;
          kind: "purchase" | "grading_fee" | "upcharge" | "shipping" | "other_fee" | "sale";
          amount: number;
          occurredOn: string | null;
          source: string | null;
          ref: string | null;
          createdAt: string;
        };
        Insert: {
          id?: number;
          cardId?: string | null;
          submissionId?: string | null;
          kind: "purchase" | "grading_fee" | "upcharge" | "shipping" | "other_fee" | "sale";
          amount: number;
          occurredOn?: string | null;
          source?: string | null;
          ref?: string | null;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["LedgerEntry"]["Insert"]>;
        Relationships: [];
      };
      Assumption: {
        Row: {
          key: string;
          value: number;
          note: string | null;
          updatedAt: string;
        };
        Insert: {
          key: string;
          value: number;
          note?: string | null;
          updatedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["Assumption"]["Insert"]>;
        Relationships: [];
      };
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
      SoldStatsHistory: {
        Row: {
          actionId: string;
          snapshotWeek: string;
          player: string;
          lane: string;
          sampleSize: number;
          median: number | null;
          mean: number | null;
          low: number | null;
          high: number | null;
          last5Avg: number | null;
          trend7dPct: number | null;
          trend30dPct: number | null;
          fairValueLow: number | null;
          fairValueMid: number | null;
          fairValueHigh: number | null;
          sourceStatus: string;
          scrapedAt: string;
        };
        Insert: {
          actionId: string;
          snapshotWeek: string;
          player: string;
          lane: string;
          sampleSize?: number;
          median?: number | null;
          mean?: number | null;
          low?: number | null;
          high?: number | null;
          last5Avg?: number | null;
          trend7dPct?: number | null;
          trend30dPct?: number | null;
          fairValueLow?: number | null;
          fairValueMid?: number | null;
          fairValueHigh?: number | null;
          sourceStatus?: string;
          scrapedAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["SoldStatsHistory"]["Insert"]>;
        Relationships: [];
      };
      PlayerSoldStats: {
        Row: {
          actionId: string;
          player: string;
          lane: string;
          sampleSize: number;
          median: number | null;
          mean: number | null;
          low: number | null;
          high: number | null;
          last5Avg: number | null;
          trend7dPct: number | null;
          trend30dPct: number | null;
          fairValueLow: number | null;
          fairValueMid: number | null;
          fairValueHigh: number | null;
          sourceStatus: string;
          scrapedAt: string;
          errorMessage: string | null;
        };
        Insert: {
          actionId: string;
          player: string;
          lane: string;
          sampleSize?: number;
          median?: number | null;
          mean?: number | null;
          low?: number | null;
          high?: number | null;
          last5Avg?: number | null;
          trend7dPct?: number | null;
          trend30dPct?: number | null;
          fairValueLow?: number | null;
          fairValueMid?: number | null;
          fairValueHigh?: number | null;
          sourceStatus?: string;
          scrapedAt?: string;
          errorMessage?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["PlayerSoldStats"]["Insert"]>;
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
      CenteringCheck: {
        Row: {
          id: string; createdAt: string; cardId: string | null; side: string; imageHash: string; pxPerMm: number;
          measured: Json; confirmed: Json; adjusted: boolean; lr: number | null; tb: number | null; lrMid: number | null; tbMid: number | null;
        };
        Insert: {
          id?: string; createdAt?: string; cardId?: string | null; side: string; imageHash: string; pxPerMm: number;
          measured: Json; confirmed: Json; adjusted: boolean; lr?: number | null; tb?: number | null; lrMid?: number | null; tbMid?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["CenteringCheck"]["Insert"]>;
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
