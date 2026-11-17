// Collect recent split-related Nasdaq Trader Equity Corporate Actions (ECA) alerts.
//
// Usage: node .github/scripts/fetch-eca.mjs <output-file> [count]
//
// Reads the newest ECA alert ID from Nasdaq Trader's public RSS feed, then steps
// back through the last <count> alerts (default 120, roughly six weeks) at about
// one request per second. Only split-related alerts are kept, reduced to their
// title, URL, source links and announcement text, for the weekly agent to verify.
// Nothing is cached or committed: the output is a temporary file on the runner.

import { writeFileSync } from 'node:fs';

const UA = 'stock-splits-data/1.0 (+https://github.com/coffee-cpu/stock-splits-data)';
const RSS = 'https://www.nasdaqtrader.com/rss.aspx?feed=currentheadlines&categorylist=0';
const ALERT = (id) => `https://www.nasdaqtrader.com/TraderNews.aspx?id=${id}`;
const SPLIT = /split|consolidation|ratio change/i;

const [out, countArg] = process.argv.slice(2);
if (!out) throw new Error('usage: fetch-eca.mjs <output-file> [count]');
const count = Number(countArg || 120);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  if (res.status !== 200) return null; // missing IDs redirect to a 404 page
  return res.text();
}

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|div|li|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
}

// Newest alert ID per year, from the RSS feed.
const rss = await get(RSS);
if (!rss) throw new Error('RSS feed unavailable');
const ids = [...rss.matchAll(/ECA(\d{4})-(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
if (!ids.length) throw new Error('no ECA alerts in RSS feed');
const year = Math.max(...ids.map(([y]) => y));
const latest = Math.max(...ids.filter(([y]) => y === year).map(([, n]) => n));

// IDs to scan, newest first; spill into the previous year early in January.
const targets = [];
for (let n = latest; n >= 1 && targets.length < count; n--) targets.push(`ECA${year}-${n}`);
if (targets.length < count) {
  // Find the previous year's last ID by binary search (IDs are sequential).
  let lo = 1, hi = 4000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    await sleep(1000);
    if (await get(ALERT(`ECA${year - 1}-${mid}`))) lo = mid; else hi = mid - 1;
  }
  for (let n = lo; n >= 1 && targets.length < count; n--) targets.push(`ECA${year - 1}-${n}`);
}

const kept = [];
for (const id of targets) {
  await sleep(1000);
  const html = await get(ALERT(id));
  if (!html) continue;
  const title = (html.match(/Information Regarding[^<]*/i) || [''])[0].trim();
  const text = toText(html);
  const start = text.indexOf('Markets Impacted');
  const end = text.indexOf('Email Alert Subscriptions');
  const body = text.slice(start < 0 ? 0 : start, end < 0 ? undefined : end).trim();
  if (!SPLIT.test(title) && !SPLIT.test(body)) continue;
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"[^>]*>\s*([^<]*(?:Release|Filing)[^<]*)</gi)]
    .map((m) => `${m[2].trim()}: ${m[1]}`);
  kept.push(`=== ${id}\nURL: ${ALERT(id)}\nTitle: ${title}\n${links.join('\n')}\n${body}\n`);
}

writeFileSync(out, kept.join('\n'));
console.log(`Scanned ${targets.length} alerts (${targets.at(-1)}..${targets[0]}); kept ${kept.length} split-related.`);
