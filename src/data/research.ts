// Single source of truth for every factual claim on the site.
// Every number rendered on the page should trace back to a Source here.
// Keep this honest — the whole point of the site is real, cited research.

export interface Source {
  /** Short cite key used in the Bibliography (e.g. "PNAS Nexus 2025"). */
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string;
}

export const sources = {
  pnasNexus: {
    id: 'pnas-nexus-2025',
    title:
      'Blocking mobile internet on smartphones improves sustained attention, mental health, and subjective well-being',
    publisher: 'PNAS Nexus (Castelo, Kushlev, et al.)',
    year: 2025,
    url: 'https://academic.oup.com/pnasnexus/article/4/2/pgaf017/8016017',
  },
  mccombs: {
    id: 'ut-mccombs-2025',
    title: 'To Be Happier, Take a Vacation… From Your Smartphone',
    publisher: 'UT Austin — McCombs School of Business',
    year: 2025,
    url: 'https://news.mccombs.utexas.edu/research/to-be-happier-take-a-vacation-from-your-smartphone/',
  },
  rct2h: {
    id: 'screen-reduction-rct',
    title:
      'Smartphone screen time reduction improves mental health: a randomized controlled trial',
    publisher: 'BMC Medicine (via PubMed Central)',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11846175/',
  },
  harvard: {
    id: 'harvard-health',
    title: 'Dopamine fasting: Misunderstanding science spawns a maladaptive fad',
    publisher: 'Harvard Health Publishing',
    year: 2020,
    url: 'https://www.health.harvard.edu/blog/dopamine-fasting-misunderstanding-science-spawns-a-maladaptive-fad-2020022618917',
  },
  cleveland: {
    id: 'cleveland-clinic',
    title: 'What Is a Dopamine Detox and Does It Work?',
    publisher: 'Cleveland Clinic — health essentials',
    year: 2024,
    url: 'https://health.clevelandclinic.org/dopamine-detox',
  },
  wikiSepah: {
    id: 'wiki-dopamine-fasting',
    title: 'Dopamine fasting (origin, Dr. Cameron Sepah)',
    publisher: 'Wikipedia',
    year: 2025,
    url: 'https://en.wikipedia.org/wiki/Dopamine_fasting',
  },
  lightPhone: {
    id: 'light-phone',
    title: 'The Light Phone III',
    publisher: 'Light Phone (official)',
    year: 2025,
    url: 'https://www.thelightphone.com/',
  },
  consumerReports: {
    id: 'consumer-reports-lp3',
    title: 'Light Phone 3 Review: A Delightfully Minimalist Smartphone Alternative',
    publisher: 'Consumer Reports',
    year: 2025,
    url: 'https://www.consumerreports.org/electronics-computers/cell-phones/light-phone-3-review-a1105801271/',
  },
  slate: {
    id: 'slate-lp3',
    title: 'The Light Phone III Is a Lot Smarter Than It Looks',
    publisher: 'Slate',
    year: 2025,
    url: 'https://slate.com/technology/2025/04/light-phone-iii-review-dumbphone-minimalism-iphone-apple.html',
  },
  dezeen: {
    id: 'dezeen-dumbphones',
    title: 'Four of the best dumbphones for a digital detox',
    publisher: 'Dezeen',
    year: 2025,
    url: 'https://www.dezeen.com/2025/08/28/best-dumbphones-reviewed-digital-detox/',
  },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof sources;

export interface Stat {
  value: string;
  label: string;
  source: SourceKey;
}

/** "SHOCKING FACTS" — the scale of the problem. */
export const problemStats: Stat[] = [
  {
    value: '~4.6 hrs',
    label: 'the average person spends on their phone every single day',
    source: 'mccombs',
  },
  {
    value: '6h 40m',
    label: 'average total daily screen time for adults across all devices',
    source: 'mccombs',
  },
];

/** "PROOF IT WORKS" — the evidence. */
export const evidenceStats: Stat[] = [
  {
    value: '91%',
    label:
      'of people improved on attention, mental health, or well-being after blocking mobile internet for just 2 weeks',
    source: 'pnasNexus',
  },
  {
    value: '71%',
    label: 'reported better mental health after the 2-week break than before it',
    source: 'pnasNexus',
  },
  {
    value: 'n = 467',
    label:
      'participants in the preregistered randomized controlled trial (this was a real experiment, not a vibe)',
    source: 'pnasNexus',
  },
  {
    value: '< 2 hrs',
    label:
      'a separate RCT found that cutting phone use below 2 hrs/day improved mood & stress in about 3 weeks',
    source: 'rct2h',
  },
];

export interface ProCon {
  text: string;
}

export const pros: ProCon[] = [
  { text: 'Fewer distractions — no feeds, no infinite scroll, no notification slot-machine.' },
  { text: 'Battery lasts days, sometimes a week, on a single charge.' },
  { text: 'Reclaimed attention: the RCT above saw depression drops larger than typical antidepressants.' },
  { text: 'You still get calls & texts — you lose the doomscroll, not the phone.' },
  { text: 'Cheaper to run and much harder to lose an evening to.' },
];

export const cons: ProCon[] = [
  { text: 'No maps, ride-share, banking, or "just look it up" apps in your pocket.' },
  { text: 'Messaging is slower; group chats and photos can be a pain.' },
  { text: 'Minimalist phones run a deliberately stripped-down, sometimes sluggish OS.' },
  { text: 'Real hardware costs money — the Light Phone III is $599.' },
  { text: 'Some daily friction: transit gates, QR menus, 2FA apps assume a smartphone.' },
];

export interface LinkCard {
  name: string;
  blurb: string;
  url: string;
  source?: SourceKey;
  free?: boolean;
}

export const coolLinks: LinkCard[] = [
  {
    name: 'The Light Phone III',
    blurb: 'The aspirational $599 e-ink minimalist phone. Calls, texts, maps, music — and nothing to doomscroll.',
    url: 'https://www.thelightphone.com/',
    source: 'lightPhone',
  },
  {
    name: 'Dumbphone roundup (Dezeen)',
    blurb: 'A tour of the best current dumbphones built for a digital detox — read before you buy.',
    url: 'https://www.dezeen.com/2025/08/28/best-dumbphones-reviewed-digital-detox/',
    source: 'dezeen',
  },
  {
    name: 'Freedom (app blocker)',
    blurb: 'The same tool the PNAS study used to block mobile internet. Keep your smartphone, kill the feeds.',
    url: 'https://freedom.to/',
    free: true,
  },
  {
    name: 'Grayscale mode',
    blurb: 'Free & built-in. A gray screen is dramatically less compelling than a candy-colored one. Try it tonight.',
    url: 'https://www.humanetech.com/take-control',
    free: true,
  },
];

export interface Step {
  n: number;
  title: string;
  detail: string;
}

/** "YOUR 5-STEP PLAN" — practical stimulus control (Sepah's actual method). */
export const steps: Step[] = [
  {
    n: 1,
    title: 'Name the trigger, not the neurotransmitter',
    detail:
      "You are not 'detoxing dopamine.' You are practicing stimulus control — removing the cues that start the compulsive loop.",
  },
  {
    n: 2,
    title: 'Grayscale your screen',
    detail: 'Kill the color. Costs nothing, works immediately, and makes the feed instantly boring.',
  },
  {
    n: 3,
    title: 'Delete the top 2 apps you reach for on autopilot',
    detail: 'Not forever — just off the phone. Use them on a laptop, on purpose, where they are less frictionless.',
  },
  {
    n: 4,
    title: 'Schedule a mobile-internet blackout',
    detail: 'An app blocker turns your smartphone into a dumb phone on a timer. The 2-week version beat antidepressants in an RCT.',
  },
  {
    n: 5,
    title: 'Give attention somewhere to go',
    detail: 'Boredom is the point, but a book, a walk, or an instrument makes the boring part stick.',
  },
];

export const siteMeta = {
  title: 'boring-phone.co — Dopamine Detox (est. 1996)',
  description:
    'A gloriously 1996 corner of the web with rigorously 2025 research: why the "dopamine detox" is half myth, what the science actually shows about putting your phone down, and honest pros & cons of going boring.',
  hitCount: '001,996',
} as const;
