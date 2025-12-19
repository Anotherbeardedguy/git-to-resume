export type UserPlan = {
  tier: "free";
  maxReports: number;
};

export async function getUserPlan(_userId: string): Promise<UserPlan> {
  return { tier: "free", maxReports: 3 };
}
