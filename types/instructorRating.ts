export interface InstructorRatingSummary {
  instructorId: string;
  instructorName: string;
  active: boolean;
  average: number | null;
  responses: number;
  rankingEligible: boolean;
  label: string;
}

export interface InstructorRatingList {
  items: InstructorRatingSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstructorRatingDetail {
  instructorId: string;
  average: number | null;
  responses: number;
  rankingEligible: boolean;
  label: string;
  distribution: { stars: number; count: number; percentage: number }[];
  items: { score: number; comment: string | null }[];
  total: number;
  page: number;
  pageSize: number;
}
