// Pure helper functions extracted from index.html so they can be unit tested.
// Loaded as a plain script before the dashboard code, so every name below stays a
// global exactly as it was when it lived inline.

// Possible header names a customer phone number might live under, once it's added to the feed.
const PHONE_HEADERS = ['Phone','Customer Phone','Mobile','Telephone','Phone Number','Contact Number','Cell','Tel'];
// Reduce any stored format to the UK national significant number so they all compare equal:
// +44 7713..., 447713..., 4407713..., 07713..., 7713... all become 7713...; landlines like
// 01202 736149 / 1202736149 / +441202736149 all become 1202736149.
function normNum(s) {
  let d = String(s == null ? '' : s).replace(/\D/g, '');
  if (!d) return '';
  if (d.indexOf('00') === 0) d = d.slice(2);   // drop international 00 prefix
  if (d.indexOf('44') === 0) d = d.slice(2);    // drop UK country code
  while (d.charAt(0) === '0') d = d.slice(1);    // drop the trunk 0 (and any stray leading zeros)
  return d;
}
// A call stays in the chase list (counts as "open") only for these. Anything else is a closed outcome.
// 'No answer' is a legacy value kept open so old rows behave sensibly.
function isCallOpen(st) {
  st = String(st == null ? '' : st).trim();
  return st === '' || st === 'New' || st === 'Needs callback' || st === 'Left message' || st === 'No answer';
}

// Fold the many free-text Service Type values into the canonical service lines shown on the
// website, so the "Revenue by service" breakdown is a short, readable list instead of every
// one-off description. Ordered: first pattern to match wins, anything unmatched lands in "Other".
const SERVICE_GROUPS = [
  ['Assessment visits',                   /assessment/i],
  ['Regular Garden Maintenance',          /regular garden maintenance|garden maintenance|grounds maintenance|strim.*mow.*blow|regular maintenance/i],
  ['Garden Tidy-Up',                      /tidy/i],
  ['Hedge Cutting',                       /hedge/i],
  ['Pressure Washing & Exterior Cleaning',/pressure wash|exterior clean|soft wash|soft was|patio|driveway|jet wash/i],
  ['Garden Waste & Clearance',            /waste|clearance|tip run|rubbish|bamboo|leaf clear|removal/i],
  ['Lawn Care & Renovation',              /lawn care|lawn treatment|lawn renovation|renovation|scarif|aerat|overseed|turf|fertilis/i],
  ['Grass Cutting & Lawn Edging',         /grass cutting|lawn edging|lawn mowing|mowing|\bmow\b/i],
  ['Planting & Landscaping',              /planting|landscap|plant sourcing|compost|bark|decorative stone|mulch|nursery|garden project|mesh|border/i],
  ['Weed & Moss Control',                 /weed|moss/i]
];
function serviceGroup(name) {
  const s = String(name || '');
  for (let i = 0; i < SERVICE_GROUPS.length; i++) if (SERVICE_GROUPS[i][1].test(s)) return SERVICE_GROUPS[i][0];
  return 'Other';
}

// ---------- CSV ----------
function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}
function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => obj[h.trim()] = (vals[idx] || '').trim());
    rows.push(obj);
  }
  return rows;
}
// Tolerant reader: scans the first rows for the line containing a known header keyword,
// so a title/banner row above the real headers no longer breaks parsing.
function parseCSVSmart(text, keywords) {
  const lines = text.split('\n');
  let hi = -1;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    if (!lines[i].trim()) continue;
    const low = lines[i].toLowerCase();
    if (keywords.some(k => low.includes(k))) { hi = i; break; }
  }
  if (hi === -1) hi = 0;
  const headers = parseCSVLine(lines[hi]).map(h => h.trim());
  const rows = [];
  for (let i = hi + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (vals[idx] || '').trim());
    if (Object.values(obj).every(v => !v)) continue;
    rows.push(obj);
  }
  return rows;
}
function parseAmount(s) { if (!s) return 0; return parseFloat(String(s).replace(/[£,]/g, '')) || 0; }
function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  s = String(s).trim();
  if (!s) return null;
  // DD/MM/YYYY (optionally followed by a time / comma)
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { const d = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(d) ? null : d; }
  // YYYY-MM-DD or full ISO (2026-05-20, 2026-05-20T14:30:00Z, etc.)
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { const d = new Date(+m[1], +m[2]-1, +m[3]); return isNaN(d) ? null : d; }
  // Last resort: let the browser try
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function daysBetween(d1, d2) { return Math.floor((d2 - d1) / (1000*60*60*24)); }
function col(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    for (const k of keys) if (k.trim().toLowerCase() === c) return row[k];
  }
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    for (const k of keys) if (k.trim().toLowerCase().includes(c)) return row[k];
  }
  return '';
}

function monthKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function monthOverlaps(k,b){ if(!b.from||!b.to) return true; const p=k.split('-'); const y=+p[0],m=+p[1]; const s=new Date(y,m-1,1), e=new Date(y,m,0,23,59,59); return e>=b.from && s<=b.to; }

// ---------- date logic ----------
function ukTaxYearBounds(ref) {
  const d = ref || new Date(); const y = d.getFullYear();
  const startThis = new Date(y, 3, 6);
  if (d < startThis) return { from: new Date(y-1, 3, 6), to: new Date(y, 3, 5, 23, 59, 59) };
  return { from: startThis, to: new Date(y+1, 3, 5, 23, 59, 59) };
}
function prevUkTaxYear() {
  const cur = ukTaxYearBounds();
  return { from: new Date(cur.from.getFullYear()-1, 3, 6), to: new Date(cur.from.getFullYear(), 3, 5, 23, 59, 59) };
}

function prevBounds(b) {
  if (!b.from || !b.to) return { from: null, to: null };
  // Year-on-year: the same window one year earlier. Gardening is seasonal, so this June
  // should be compared with last June, not with May.
  const shift = (d) => { const n = new Date(d.getTime()); n.setFullYear(n.getFullYear() - 1); return n; };
  return { from: shift(b.from), to: shift(b.to) };
}

function normName(s){ return String(s==null?'':s).trim().toLowerCase(); }
function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ---------- regular-job scorecard ----------
// Fixed question set. id matches the original scorecard numbering (15 was never used).
// m is the weight: the seven importance-3 questions count double. o = [poor, okay, good] examples.
const SCORE_THEMES = ['Money & reliability','Communication & relationship','Route & access','The work itself'];
const SCORE_QUESTIONS = [
  {id:1, t:'Money & reliability', m:2, q:'Does the customer pay invoices on time?', o:['Frequently late; must chase, or it threatens cashflow','Usually on time; the odd chase needed','Reliably on time or early; auto-pay or standing order']},
  {id:3, t:'Money & reliability', m:2, q:'Do they stick to the agreed schedule (no last-minute cancellations)?', o:['Frequent short-notice cancels or reschedules','Occasional changes with reasonable notice','Rarely changes; reliably keeps booked slots']},
  {id:7, t:'Money & reliability', m:2, q:'What is the approximate annual value of this job?', o:['Low annual revenue (under £1k)','Moderate revenue (£1k to £2.5k)','High anchor account (£2.5k or more)']},
  {id:21, t:'Money & reliability', m:2, q:'Does the client have realistic expectations (scope clear, few add-ons, no time-consuming queries)?', o:['Constant scope creep; unclear or changing demands','Mostly clear scope; extras arise occasionally','Clear, realistic scope; changes agreed and scheduled properly']},
  {id:2, t:'Communication & relationship', m:1, q:'Is the customer easy to contact, i.e. do they respond promptly to calls, emails or texts?', o:['Slow or unreliable replies; repeated follow-ups needed','Responds within a reasonable window (by next day)','Responds promptly the same day; easy on multiple channels']},
  {id:4, t:'Communication & relationship', m:1, q:'Does the client respect professional boundaries (no late-night calls, no unpaid extras)?', o:['Regular boundary pushes; out-of-hours contact; expects free work','Generally respectful; slips now and then','Always professional; contacts appropriately; agrees extras first']},
  {id:12, t:'Communication & relationship', m:1, q:'Is the customer friendly, polite and pleasant to deal with?', o:['Difficult or rude; tense interactions','Civil but neutral; occasional friction','Warm, polite, easy rapport']},
  {id:13, t:'Communication & relationship', m:1, q:'Does the customer take pride in the garden\u2019s appearance?', o:['Minimal pride; happy with the bare minimum','Shows some pride; wants it looking decent','High pride; proactive; notices detail; supports upkeep']},
  {id:14, t:'Communication & relationship', m:1, q:'Does the customer show appreciation and trust (thanks, referrals, leaves you to it)?', o:['Rarely appreciative; mistrustful; supervises constantly','Generally appreciative but checks in often','Thanks you; refers others; comfortable leaving you to it']},
  {id:16, t:'Communication & relationship', m:1, q:'Are they open to extra services (pressure washing, planting, mulching)?', o:['Rejects extras; strictly minimum service','Occasional yes to small extras','Welcomes proposals; books add-on work']},
  {id:5, t:'Route & access', m:2, q:'Does the location fit naturally into your weekly route, keeping extra travel and fuel low?', o:['Out of area; long detour','Moderate detour but can batch with others','On or near the existing route; minimal extra travel']},
  {id:8, t:'Route & access', m:1, q:'Is there clear, easy physical access to the garden (gates, paths, no steps)?', o:['Narrow or obstructed; heavy lifts or many steps','Some obstacles; workable with effort','Wide, direct, step-free; easy to move kit']},
  {id:9, t:'Route & access', m:1, q:'Is on-site parking consistently available?', o:['No nearby parking; fines or long walks','Usually street parking within a short walk','Reliable on-site or drive parking next to the work']},
  {id:10, t:'Route & access', m:1, q:'Can you enter the garden without the client present if rescheduling or running late?', o:['Must wait for the client; missed visits','Spare key or code sometimes; not always reliable','Full independent access (key, code, unlocked route)']},
  {id:11, t:'Route & access', m:1, q:'Is the site secure enough that tools can be left briefly without concern?', o:['High theft risk; nothing can be left','Can leave light kit briefly if watched','Designated safe area; low risk']},
  {id:6, t:'The work itself', m:1, q:'Is the garden overall attractive and well-kept (healthy plants, no large areas of neglect)?', o:['Neglected; major weed or dieback issues','Mixed; needs work but improving','Generally tidy and healthy; good showcase potential']},
  {id:17, t:'The work itself', m:2, q:'Is the garden free of excessive hazards, and are any pets well controlled and cleaned up after?', o:['Serious hazards or pet risks; unsafe to work','Some hazards; need vigilance','Generally clear and safe; pets secured or managed']},
  {id:18, t:'The work itself', m:1, q:'Is the garden free from extreme physical demands (steep slopes, very high hedges)?', o:['Highly strenuous; specialist gear every visit','Some demanding features but manageable','Normal workload; minimal heavy or awkward labour']},
  {id:19, t:'The work itself', m:1, q:'Do you get enough time to make an impact and stay on top of the important tasks?', o:['Chronically under-time; work left unfinished','Marginal time; must prioritise core tasks','Adequate or ample time; can keep a high standard']},
  {id:20, t:'The work itself', m:2, q:'Do you enjoy working here and feel confident you can maintain it to a good standard?', o:['Dread visits; don\u2019t feel you can keep the standard','Neutral; okay but not inspiring','Look forward to visits; confident in great results']}
];
function scoreGrade(pct){ return pct>=80?'A':pct>=65?'B':pct>=50?'C':'Review'; }
function scoreGradeColor(g){ return g==='A'?'var(--green6)':g==='B'?'var(--blue)':g==='C'?'var(--accent)':'var(--red)'; }
// Weighted total over answered questions only, so the running grade is meaningful mid-way.
// When all 20 are answered this equals the original sheet's percent.
function scoreCompute(scores){
  scores = scores || {};
  let got=0, ansMax=0, ans=0, poor=0;
  SCORE_QUESTIONS.forEach(q=>{ const s=scores[q.id]; if(s>=1&&s<=3){ got+=s*q.m; ansMax+=3*q.m; ans++; if(s===1) poor++; } });
  const pct = ansMax ? Math.round(got/ansMax*100) : 0;
  return { got, ansMax, ans, total:SCORE_QUESTIONS.length, pct, grade:scoreGrade(pct), poor, complete: ans===SCORE_QUESTIONS.length };
}
// Estimated yearly value from visit price and cadence (used for the value axis and as a hint).
function annualValue(c){
  if(!c) return 0;
  let perYear = 26;
  const f = String(c.freq||'').toLowerCase();
  const m = f.match(/every\s+(\d+)\s+week/);
  if(/every\s+week|weekly/.test(f)) perYear = 52;
  else if(m) perYear = Math.max(1, Math.round(52/parseInt(m[1],10)));
  else if(/month/.test(f)) perYear = 12;
  const per = c.visit>0 ? c.visit : (c.j ? c.r/c.j : 0);
  return Math.round(per*perYear);
}
function hasScore(c){ return !!(c && c.score && c.score.scores && Object.keys(c.score.scores).length); }

// Node/Vitest only: the browser loads this file as a classic script and uses the globals above.
if (typeof module === 'object' && module.exports) {
  module.exports = {
    PHONE_HEADERS, normNum, isCallOpen,
    SERVICE_GROUPS, serviceGroup,
    parseCSVLine, parseCSV, parseCSVSmart, parseAmount, parseDate, daysBetween, col,
    monthKey, monthOverlaps,
    ukTaxYearBounds, prevUkTaxYear, prevBounds,
    normName, escAttr,
    SCORE_THEMES, SCORE_QUESTIONS, scoreGrade, scoreGradeColor, scoreCompute, annualValue, hasScore
  };
}
