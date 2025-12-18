export interface ReportMetrics {
  consistencyIndex: number;
  recencyScore: number;
  ownershipScore: number;
  collaborationIndex: number;
  totalRepos: number;
  activeRepos: number;
  primaryLanguages: LanguageStat[];
  contributionSummary: ContributionSummary;
  topRepositories: RepositorySummary[];
  privateRepoCount?: number | null;
}

export interface LanguageStat {
  language: string;
  percentage: number;
  color: string;
}

export interface ContributionSummary {
  totalCommits: number;
  totalPRs: number;
  mergedPRs: number;
  issuesOpened: number;
  issuesClosed: number;
  reviewsGiven: number;
  activeWeeks: number;
  totalWeeks: number;
}

export interface RepositorySummary {
  name: string;
  fullName: string;
  role: "owner" | "maintainer" | "contributor";
  languages: string[];
  commits: number;
  prs: number;
  ownershipPercentage: number;
  stars: number;
  description: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  stargazers_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  private: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
    message: string;
  };
}

export interface GitHubPR {
  id: number;
  state: string;
  merged_at: string | null;
  created_at: string;
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: {
    name: string;
  };
}
