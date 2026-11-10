import { mkdir, writeFile } from 'node:fs/promises';

const username = process.env.PROFILE_USERNAME || 'fasfis544';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required to read GitHub activity.');

async function graphql(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': `${username}-profile-activity`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
  if (!result.data?.user) throw new Error(`GitHub user ${username} was not found.`);
  return result.data.user;
}

const profile = await graphql(`
  query Activity($login: String!) {
    user(login: $login) {
      contributionsCollection {
        startedAt
        endedAt
        totalCommitContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`, { login: username });

const repositories = [];
let cursor = null;
do {
  const page = await graphql(`
    query Repositories($login: String!, $cursor: String) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name
            languages(first: 100, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `, { login: username, cursor });
  repositories.push(...page.repositories.nodes);
  cursor = page.repositories.pageInfo.hasNextPage ? page.repositories.pageInfo.endCursor : null;
} while (cursor);

const collection = profile.contributionsCollection;
const calendar = collection.contributionCalendar;
const days = calendar.weeks.flatMap(week => week.contributionDays);
const months = new Map();
for (const day of days) {
  const key = day.date.slice(0, 7);
  months.set(key, (months.get(key) || 0) + day.contributionCount);
}

const languageTotals = new Map();
for (const repo of repositories) {
  // Profile artwork and automation should not distort the development stack.
  if (repo.name.toLowerCase() === username.toLowerCase()) continue;
  for (const { size, node } of repo.languages.edges) {
    const previous = languageTotals.get(node.name);
    languageTotals.set(node.name, {
      name: node.name,
      color: /^#[\da-f]{6}$/i.test(node.color || '') ? node.color : '#94A3B8',
      size: (previous?.size || 0) + size,
    });
  }
}
const languages = [...languageTotals.values()].sort((a, b) => b.size - a.size);
const totalBytes = languages.reduce((total, language) => total + language.size, 0);
const visibleLanguages = languages.slice(0, 5);
if (languages.length > 5) {
  visibleLanguages.push({
    name: 'Other', color: '#94A3B8',
    size: languages.slice(5).reduce((total, language) => total + language.size, 0),
  });
}

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);
const number = value => new Intl.NumberFormat('en-US').format(value);
const text = (x, y, value, size = 14, color = '#A2B0CA', extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`;

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="688" viewBox="0 0 1200 688" role="img" aria-labelledby="title desc">',
  `<title id="title">${escape(username)} · GitHub activity</title>`,
  `<desc id="desc">${number(calendar.totalContributions)} contributions over the last twelve months, ${repositories.length} public non-fork repositories, ${number(collection.totalCommitContributions)} commit contributions. Languages are measured by code bytes, excluding the profile repository.</desc>`,
  '<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#67E8F9" stop-opacity=".3"/><stop offset="1" stop-color="#818CF8" stop-opacity=".015"/></linearGradient><linearGradient id="edge"><stop stop-color="#67E8F9"/><stop offset="1" stop-color="#C084FC"/></linearGradient></defs>',
  '<rect x="1" y="1" width="1198" height="686" rx="20" fill="#101523" stroke="#2B3449"/>',
  '<path d="M34 1H1166" stroke="url(#edge)" stroke-width="2"/>',
  '<g font-family="Segoe UI, Arial, sans-serif">',
  text(34, 41, 'GITHUB / IN CODE', 13, '#A5F3FC', 'font-weight="700" letter-spacing="2"'),
  text(1166, 41, `${collection.startedAt.slice(0, 10)} — ${collection.endedAt.slice(0, 10)}`, 12, '#8C9BB6', 'text-anchor="end"'),
];

const metrics = [
  ['CONTRIBUTIONS / 12 MONTHS', calendar.totalContributions, 'Issues, reviews, pull requests & commits', '#A5F3FC'],
  ['PUBLIC REPOSITORIES', repositories.length, 'Own repositories · forks excluded', '#C7D2FE'],
  ['COMMIT CONTRIBUTIONS', collection.totalCommitContributions, 'As counted by GitHub · last 12 months', '#E9D5FF'],
];
metrics.forEach(([label, value, caption, color], index) => {
  const x = 32 + index * 384;
  svg.push(`<rect x="${x}" y="64" width="368" height="112" rx="12" fill="#171E30" stroke="#2A354C"/>`);
  svg.push(text(x + 21, 90, label, 11, '#A2B0CA', 'letter-spacing="1.1"'));
  svg.push(text(x + 21, 135, number(value), 39, color, 'font-weight="700"'));
  svg.push(text(x + 21, 157, caption, 11, '#8C9BB6'));
});

svg.push(text(34, 215, 'MONTHLY CONTRIBUTIONS', 12, '#C9D5EA', 'font-weight="600" letter-spacing="1.2"'));
svg.push(text(816, 215, 'LANGUAGES / CODE VOLUME', 12, '#C9D5EA', 'font-weight="600" letter-spacing="1.2"'));
svg.push('<path d="M788 205V429" stroke="#28334A"/>');

const buckets = [...months.entries()];
const maximum = Math.max(5, Math.ceil(Math.max(0, ...buckets.map(([, count]) => count)) / 5) * 5);
const left = 65;
const baseline = 377;
const chartWidth = 680;
const chartHeight = 135;
for (const ratio of [0, 0.5, 1]) {
  const y = baseline - chartHeight * ratio;
  svg.push(`<path d="M${left} ${y}H${left + chartWidth}" stroke="#2A354B" stroke-dasharray="3 6"/>`);
  svg.push(text(left - 12, y + 4, maximum * ratio, 10, '#7F90AE', 'text-anchor="end"'));
}
const points = buckets.map(([, count], index) => [
  left + (index / Math.max(1, buckets.length - 1)) * chartWidth,
  baseline - (count / maximum) * chartHeight,
]);
if (points.length) {
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  svg.push(`<polygon points="${left},${baseline} ${line} ${points.at(-1)[0]},${baseline}" fill="url(#area)"/>`);
  svg.push(`<polyline points="${line}" fill="none" stroke="#67E8F9" stroke-width="2.5" stroke-linejoin="round"/>`);
  points.forEach(([x, y], index) => {
    const [month, count] = buckets[index];
    const date = new Date(`${month}-01T00:00:00Z`);
    const label = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    svg.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="#101523" stroke="#A5F3FC" stroke-width="1.5"><title>${escape(month)}: ${count}</title></circle>`);
    svg.push(text(x, 399, label, 10, '#92A2BD', 'text-anchor="middle"'));
  });
}
svg.push(text(65, 423, 'Rolling 12-month window · first and last months may be partial', 10, '#7F90AE'));

visibleLanguages.forEach((language, index) => {
  const y = 244 + index * 32;
  const percentage = totalBytes ? (language.size / totalBytes) * 100 : 0;
  svg.push(`<circle cx="823" cy="${y - 4}" r="4" fill="${language.color}"/>`);
  svg.push(text(835, y, language.name, 12, '#D4DEF0'));
  svg.push(text(1165, y, `${percentage.toFixed(1)}%`, 12, '#9EADC7', 'text-anchor="end"'));
  svg.push(`<rect x="835" y="${y + 7}" width="330" height="4" rx="2" fill="#25304A"/>`);
  svg.push(`<rect x="835" y="${y + 7}" width="${(percentage * 3.3).toFixed(2)}" height="4" rx="2" fill="${language.color}"/>`);
});
if (!visibleLanguages.length) svg.push(text(816, 255, 'No public language data yet.', 13));

svg.push('<path d="M34 449H1166" stroke="#28334A"/>');
svg.push(text(34, 477, 'A YEAR IN SMALL STEPS', 12, '#C9D5EA', 'font-weight="600" letter-spacing="1.2"'));
const step = Math.min(20, Math.floor(1080 / Math.max(1, calendar.weeks.length)));
const cell = step - 4;
const gridLeft = 68;
const gridTop = 511;
const peak = Math.max(1, ...days.map(day => day.contributionCount));
const palette = ['#202A40', '#254E65', '#337C91', '#50B7C5', '#99F6E4'];
for (const [label, weekday] of [['Mon', 1], ['Wed', 3], ['Fri', 5]]) {
  svg.push(text(53, gridTop + weekday * step + cell - 3, label, 9, '#7F90AE', 'text-anchor="end"'));
}
let previousMonth = '';
let lastMonthLabelX = -Infinity;
calendar.weeks.forEach((week, column) => {
  const x = gridLeft + column * step;
  const month = week.contributionDays[0]?.date.slice(0, 7);
  if (month && month !== previousMonth && x - lastMonthLabelX > 38) {
    const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    svg.push(text(x, 501, label, 9, '#7F90AE'));
    previousMonth = month;
    lastMonthLabelX = x;
  }
  for (const day of week.contributionDays) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    const y = gridTop + weekday * step;
    const level = day.contributionCount === 0 ? 0 : Math.min(4, Math.ceil((day.contributionCount / peak) * 4));
    svg.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${palette[level]}"><title>${day.date}: ${day.contributionCount} contributions</title></rect>`);
  }
});

svg.push(text(34, 668, `@${username} · GitHub API · Updated ${collection.endedAt.slice(0, 10)} UTC`, 10, '#7F90AE'));
svg.push(text(1005, 668, 'Less', 10, '#7F90AE', 'text-anchor="end"'));
palette.forEach((color, index) => svg.push(`<rect x="${1014 + index * 20}" y="657" width="14" height="14" rx="3" fill="${color}"/>`));
svg.push(text(1120, 668, 'More', 10, '#7F90AE'));
svg.push('</g></svg>');

const directory = new URL('../assets/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('activity.svg', directory), `${svg.join('\n')}\n`, 'utf8');
console.log(`Updated activity for ${username}: ${calendar.totalContributions} contributions, ${repositories.length} repositories, ${languages.length} languages.`);
