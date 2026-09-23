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

interface RawContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

async function fetchFullYearContributions(cleanUsername: string): Promise<{
  totalCount: number;
  contributions: RawContributionDay[];
} | null> {
  // Method 1: jogruber API (structured 365-day contribution calendar)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(cleanUsername)}?y=last`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SingularityStudentLab-Portfolio/1.0',
      },
      next: { revalidate: 14400 }, // Cache 4 hours
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.contributions) && data.contributions.length >= 350) {
        const total = typeof data.total?.lastYear === 'number'
          ? data.total.lastYear
          : data.contributions.reduce((acc: number, d: any) => acc + (d.count || 0), 0);
        return {
          totalCount: total,
          contributions: data.contributions.map((c: any) => ({
            date: c.date,
            count: Number(c.count) || 0,
            level: Math.min(4, Math.max(0, Number(c.level) || 0)) as 0 | 1 | 2 | 3 | 4,
          })),
        };
      }
    }
  } catch (err) {
    console.warn(`[GitHub Integration] jogruber API unavailable for ${cleanUsername}:`, err);
  }

  // Method 2: Native GitHub contributions HTML page
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://github.com/users/${encodeURIComponent(cleanUsername)}/contributions`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      next: { revalidate: 14400 },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const html = await res.text();
      const regex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"/g;
      let match;
      const contributions: RawContributionDay[] = [];
      let total = 0;
      while ((match = regex.exec(html)) !== null) {
        const date = match[1];
        const level = Math.min(4, Math.max(0, parseInt(match[2], 10))) as 0 | 1 | 2 | 3 | 4;
        const count = level > 0 ? (level === 4 ? 10 : level === 3 ? 5 : level === 2 ? 3 : 1) : 0;
        total += count;
        contributions.push({ date, count, level });
      }
      if (contributions.length >= 350) {
        return { totalCount: total, contributions };
      }
    }
  } catch (err) {
    console.warn(`[GitHub Integration] Native contributions scraper unavailable for ${cleanUsername}:`, err);
  }

  return null;
}

function buildHeatmapWeeksFromContributions(contributions: RawContributionDay[]): GitHubWeekActivity[] {
  const weeks: GitHubWeekActivity[] = [];
  let currentWeek: GitHubDayActivity[] = [];
  let lastMonth = -1;
  let lastLabelWeek = -3;

  for (let i = 0; i < contributions.length; i++) {
    const item = contributions[i];
    const d = new Date(item.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay(); // 0 is Sunday

    // Pad front if first item is not Sunday
    if (currentWeek.length === 0 && dayOfWeek !== 0 && i === 0) {
      for (let p = 0; p < dayOfWeek; p++) {
        currentWeek.push({
          date: '',
          formattedDate: '',
          count: 0,
          level: 0,
        });
      }
    }

    const formattedDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    currentWeek.push({
      date: item.date,
      formattedDate,
      count: item.count,
      level: item.level,
    });

    if (currentWeek.length === 7 || i === contributions.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          formattedDate: '',
          count: 0,
          level: 0,
        });
      }

      const firstValidDay = currentWeek.find((day) => day.date);
      let monthLabel: string | null = null;
      if (firstValidDay) {
        const weekDate = new Date(firstValidDay.date + 'T00:00:00Z');
        const month = weekDate.getUTCMonth();
        if (month !== lastMonth) {
          if (weeks.length - lastLabelWeek >= 3 && weeks.length < 50) {
            monthLabel = weekDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            lastLabelWeek = weeks.length;
          }
          lastMonth = month;
        }
      }

      weeks.push({
        days: currentWeek,
        monthLabel,
      });
      currentWeek = [];
    }
  }

  return weeks;
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
    // 1. Fetch recent PRs and commits from /events/public
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

    const events: RawGitHubEvent[] = res.ok ? await res.json() : [];

    // Extract merged PRs or recent code contribution activities
    const recentPRs: GitHubMergedPR[] = [];
    if (Array.isArray(events)) {
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
    }

    // 2. Fetch full 52-week (365-day) contribution calendar
    const fullYearData = await fetchFullYearContributions(clean);
    if (fullYearData && fullYearData.contributions.length >= 350) {
      const heatmapWeeks = buildHeatmapWeeksFromContributions(fullYearData.contributions);
      return {
        username: clean,
        totalPublicEvents: fullYearData.totalCount,
        recentPRs,
        heatmapWeeks,
      };
    }

    // Fallback: Synthesize structured 52-week contribution heatmap from /events/public
    const eventCountsByDay = new Map<string, number>();
    if (Array.isArray(events)) {
      for (const ev of events) {
        if (ev.created_at) {
          const dayKey = ev.created_at.slice(0, 10);
          eventCountsByDay.set(dayKey, (eventCountsByDay.get(dayKey) || 0) + 1);
        }
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
      totalPublicEvents: Array.isArray(events) ? events.length : 0,
      recentPRs,
      heatmapWeeks,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[GitHub Integration Silent Fallback] Failed fetching activity for ${username}: ${message}`);
    return null;
  }
}

