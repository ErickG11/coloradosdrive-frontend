export interface PendingPracticeRating {
  practiceSlotId: string;
  instructorName: string;
  scheduledAt: string;
  opensAt: string;
  closesAt: string;
}

export interface PendingPracticeRatingsPage {
  items: PendingPracticeRating[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubmittedPracticeRating {
  id: string;
  practiceSlotId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}
