import { GITHUB_USERNAME_REGEX } from '../security/validation';

export interface GitHubMergedPR {
  repoName: string;
  title: string;
  prUrl: string;
  mergedAt: string;
}

export interface GitHubDayActivity {
  date: string; // "YYYY-MM-DD"
  formattedDate: string; // "Sep 16, 2026"
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubWeekActivity {
  days: GitHubDayActivity[];
  monthLabel?: string | null;
}

export interface GitHubActivityData {
  username: string;
  totalPublicEvents: number;
  recentPRs: GitHubMergedPR[];
  heatmapWeeks: GitHubWeekActivity[];
}

/**
 * Validates username and fetches public activity from GitHub's public API.
 * Employs SSRF prevention, aggressive ISR caching (4 hours), and silent failure.
 */
export async function fetchGitHubActivity(username: string | null | undefined): Promise<GitHubActivityData | null> {
  if (!username) return null;

  const clean = username.trim();
  // SSRF defense: enforce exact GitHub username specification
  if (!GITHUB_USERNAME_REGEX.test(clean)) {
    console.warn(`[GitHub Integration] Rejected invalid/unsafe username: ${clean}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://api.github.com/users/${encodeURIComponent(clean)}/events/public?per_page=100`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SingularityStudentLab-Portfolio/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 14400 }, // Cache 4 hours
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[GitHub Integration] GitHub API returned status ${res.status} for ${clean}. Failing silently.`);
      return null;
    }

    interface RawGitHubEvent {
      id: string;
      type: string;
      repo: { name: string; url: string };
      payload: {
        action?: string;
        pull_request?: {
          title: string;
          html_url: string;
          merged: boolean;
          merged_at: string;
        };
        commits?: { message: string }[];
      };
      created_at: string;
    }

    const events: RawGitHubEvent[] = await res.json();
    if (!Array.isArray(events)) return null;

    // Extract merged PRs or recent code contribution activities
    const recentPRs: GitHubMergedPR[] = [];
    for (const ev of events) {
      if (ev.type === 'PullRequestEvent' && ev.payload.pull_request) {
        recentPRs.push({
          repoName: ev.repo.name,
          title: ev.payload.pull_request.title || 'Contribution',
          prUrl: ev.payload.pull_request.html_url || `https://github.com/${ev.repo.name}`,
          mergedAt: ev.payload.pull_request.merged_at || ev.created_at,
        });
      } else if (ev.type === 'PushEvent' && recentPRs.length < 4) {
        const commitMsg = ev.payload.commits?.[0]?.message?.split('\n')[0] || 'Commit to repository';
        recentPRs.push({
          repoName: ev.repo.name,
          title: commitMsg.length > 55 ? `${commitMsg.slice(0, 52)}...` : commitMsg,
          prUrl: `https://github.com/${ev.repo.name}`,
          mergedAt: ev.created_at,
        });
      }
      if (recentPRs.length >= 4) break;
    }

    // Synthesize structured 52-week contribution heatmap
    const eventCountsByDay = new Map<string, number>();
    for (const ev of events) {
      if (ev.created_at) {
        const dayKey = ev.created_at.slice(0, 10);
        eventCountsByDay.set(dayKey, (eventCountsByDay.get(dayKey) || 0) + 1);
      }
    }

    const now = new Date();
    // Align calendar to end on Saturday of the current week (GitHub calendar convention)
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    const startDate = new Date(endOfWeek);
    // 52 weeks = 364 days, starting on a Sunday
    startDate.setDate(endOfWeek.getDate() - (52 * 7 - 1));

    const heatmapWeeks: GitHubWeekActivity[] = [];
    let lastMonth = -1;
    let lastLabelWeek = -3;

    for (let w = 0; w < 52; w++) {
      const days: GitHubDayActivity[] = [];
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + w * 7);

      // Determine month label for this week column
      let monthLabel: string | null = null;
      const currentMonth = weekStartDate.getMonth();
      if (currentMonth !== lastMonth) {
        if (w - lastLabelWeek >= 3 && w < 50) {
          monthLabel = weekStartDate.toLocaleString('en-US', { month: 'short' });
          lastLabelWeek = w;
        }
        lastMonth = currentMonth;
      }

      for (let d = 0; d < 7; d++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + (w * 7 + d));
        const dateKey = targetDate.toISOString().slice(0, 10);
        const formattedDate = targetDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const count = eventCountsByDay.get(dateKey) || 0;

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count >= 5) level = 4;
        else if (count >= 3) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        days.push({
          date: dateKey,
          formattedDate,
          count,
          level,
        });
      }

      heatmapWeeks.push({
        days,
        monthLabel,
      });
    }

    return {
      username: clean,
      totalPublicEvents: events.length,
      recentPRs,
      heatmapWeeks,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[GitHub Integration Silent Fallback] Failed fetching activity for ${username}: ${message}`);
    return null;
  }
}
