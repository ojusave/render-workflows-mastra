export const REVIEW_FOCUSES = [
  "technical clarity",
  "structure and flow",
  "reader usefulness",
] as const;

export type ReviewFocus = (typeof REVIEW_FOCUSES)[number];

export type Review = {
  focus: string;
  feedback: string;
};

export type EditorialResult = {
  draft: string;
  reviews: Review[];
};
