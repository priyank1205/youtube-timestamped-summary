// The fictional video the film demonstrates on. Channel, people and video are
// invented; the summary is written in exactly the shape the extension renders
// (overview line, `#` section headings, `[time] - Title: description` points).

export const VIDEO = {
  title: 'The Science of Sleep: Full Masterclass (Every Question Answered)',
  channel: 'Night School',
  subscribers: '2.31M subscribers',
  views: '3.8M views',
  age: '4 months ago',
  likes: '86K',
  duration: 2 * 3600 + 47 * 60 + 13, // 2:47:13
  query: 'when should i stop drinking coffee',
  description:
    'Everything science knows about sleep, in one sitting: why we need it, how the body clock and the 90-minute cycle work, what caffeine, alcohol and light really do, and a routine for better nights. Audience Q&A in the final hour.',
};

export type Point = { time: string; sec: number; title: string; desc: string };
export type Section = { title: string; points: Point[] };

const toSec = (time: string) => time.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
const P = (time: string, title: string, desc: string): Point => ({ time, sec: toSec(time), title, desc });

export const OVERVIEW =
  'A sleep scientist walks through why we sleep, how the body clock and the 90-minute cycle work, and which habits actually move the needle: a fixed wake time, morning light, an early caffeine cut-off and a cool, dark room. The final hour answers audience questions on naps, melatonin and insomnia.';

export const SECTIONS: Section[] = [
  { title: 'Why We Sleep', points: [
    P('0:00', 'The Question That Started It All', 'An animal that sleeps cannot eat, mate or defend itself for a third of its life, so sleep must earn that risk.'),
    P('2:14', 'Every Animal Sleeps', 'From fruit flies to whales, every animal studied shows some form of sleep, which points to a very old function.'),
    P('4:52', 'What Goes Wrong Without It', 'After a single short night, volunteers show measurable drops in attention, mood and immune response.'),
    P('7:31', 'The Two-Process Model', 'Sleep timing is the sum of sleep pressure that builds while awake and a circadian rhythm that opens the window for sleep.'),
    P('10:05', 'Adenosine and Sleep Pressure', 'Adenosine accumulates with every waking hour and is cleared during sleep; it is the chemical behind sleep pressure.'),
  ] },
  { title: 'Your Internal Clock', points: [
    P('12:48', 'The Master Clock', 'The suprachiasmatic nucleus keeps a roughly 24-hour rhythm and coordinates the clocks in every organ.'),
    P('15:20', 'Light Is the Main Signal', 'Light reaching specialised cells in the eye resets the clock daily; morning light advances it, evening light delays it.'),
    P('18:09', 'Melatonin Is a Timer, Not a Sedative', 'Melatonin signals that night has begun; it shifts timing far more than it knocks you out.'),
    P('21:36', 'Larks, Owls and Chronotypes', 'Chronotype is partly genetic, and forcing an owl onto a lark’s schedule costs sleep.'),
    P('24:02', 'Social Jet Lag', 'Sleeping in on weekends shifts the clock as if you had flown two time zones.'),
  ] },
  { title: 'The Architecture of a Night', points: [
    P('26:45', 'The Stages of Sleep', 'The night cycles through light sleep, deep slow-wave sleep and REM, each with its own brain signature.'),
    P('29:18', 'The 90-Minute Cycle', 'Each cycle lasts about 90 minutes, and a typical night runs four to six of them.'),
    P('32:40', 'Deep Sleep Comes First', 'Slow-wave sleep dominates the first half of the night, when the brain clears waste and consolidates facts.'),
    P('35:57', 'REM Comes Last', 'REM piles up toward morning, so cutting the last hours of sleep costs mostly REM.'),
    P('38:23', 'Why You Wake at 3 a.m.', 'Brief awakenings between cycles are normal; anxiety is what turns them into long ones.'),
  ] },
  { title: 'Sleep, Memory and Learning', points: [
    P('41:06', 'Sleep Before Learning', 'A rested brain encodes new information markedly better than a sleep-deprived one.'),
    P('43:50', 'Sleep After Learning', 'Deep sleep replays the day’s memories and moves them into long-term storage.'),
    P('46:32', 'Dreams and Creativity', 'REM sleep links distant ideas, which is why solutions sometimes arrive overnight.'),
    P('49:15', 'Naps That Help', 'A 20-minute nap boosts alertness without grogginess; a 90-minute nap includes a full cycle.'),
  ] },
  { title: 'Body and Health', points: [
    P('52:04', 'Sleep and Appetite', 'Short sleep raises hunger hormones the next day and makes high-calorie food more tempting.'),
    P('54:41', 'The Immune Connection', 'People sleeping under six hours were far more likely to catch a cold after exposure.'),
    P('57:28', 'Heart and Blood Pressure', 'Blood pressure dips at night; chronic short sleep keeps it elevated.'),
    P('1:00:12', 'Sleep and Mood', 'One bad night makes the brain’s emotional centres markedly more reactive.'),
  ] },
  { title: 'Caffeine, Alcohol and Light', points: [
    P('1:03:05', 'How Caffeine Works', 'Caffeine blocks adenosine receptors, hiding sleep pressure rather than removing it.'),
    P('1:06:47', 'The Afternoon Coffee Problem', 'Even when you fall asleep easily, late caffeine still reduces deep sleep.'),
    P('1:09:30', 'Decaf Isn’t Zero', 'A decaf coffee can still carry a meaningful fraction of a regular cup’s caffeine.'),
    P('1:12:40', 'Caffeine’s Half-Life', 'Caffeine’s half-life is about five hours, so a 2 p.m. coffee still leaves a quarter of it in your system at midnight. The rule: no caffeine within eight to ten hours of bedtime.'),
    P('1:15:22', 'Alcohol Fragments REM', 'Alcohol sedates rather than sleeps; it suppresses REM and causes awakenings later in the night.'),
    P('1:18:09', 'Screens and Evening Light', 'Bright evening light delays melatonin; dimming the lights matters more than the screen itself.'),
  ] },
  { title: 'Building a Better Night', points: [
    P('1:21:33', 'A Fixed Wake-Up Time', 'The single most effective habit: wake at the same time every day, weekends included.'),
    P('1:24:18', 'Morning Light, Outside', 'Ten minutes of outdoor light soon after waking anchors the clock.'),
    P('1:27:02', 'Keep It Cool', 'Core temperature must drop for sleep to start; a cool bedroom helps.'),
    P('1:29:45', 'The Wind-Down Hour', 'A consistent pre-bed routine tells the brain that sleep is coming.'),
    P('1:32:20', 'If You Can’t Sleep, Get Up', 'Lying awake trains the brain to associate bed with wakefulness.'),
  ] },
  { title: 'Insomnia and Disorders', points: [
    P('1:35:11', 'What Insomnia Really Is', 'Insomnia is difficulty sleeping despite the opportunity, not simply short sleep.'),
    P('1:38:04', 'CBT-I Beats Pills', 'Cognitive behavioural therapy for insomnia outperforms sleeping pills over the long term.'),
    P('1:41:26', 'Sleep Apnea', 'Loud snoring and daytime fatigue can signal apnea, which fragments sleep without waking you.'),
    P('1:44:39', 'Restless Legs and Iron', 'Low iron stores are a common, treatable cause of restless legs.'),
  ] },
  { title: 'Trackers and Myths', points: [
    P('1:47:55', 'Can You Trust Your Tracker?', 'Wearables estimate total sleep well but stages poorly; trends matter more than nightly scores.'),
    P('1:50:41', 'Chasing a Perfect Score', 'Obsessing over sleep scores can itself cause anxiety and worse sleep.'),
    P('1:53:28', 'Myth: You Can Catch Up', 'Weekend recovery sleep does not fully reverse a week of short nights.'),
    P('1:56:10', 'Myth: Older People Need Less', 'Older adults need about as much sleep but get less deep sleep.'),
  ] },
  { title: 'Audience Questions', points: [
    P('1:59:02', 'Is Six Hours Enough?', 'For the vast majority, no; true short sleepers are very rare.'),
    P('2:02:47', 'Should I Take Melatonin?', 'Low doses can help with jet lag and shifting timing; it is not a nightly sleeping pill.'),
    P('2:06:30', 'Surviving Shift Work', 'Anchor sleep, blackout curtains and consistent light reduce the toll.'),
    P('2:10:12', 'Teenagers and School Starts', 'Teenagers’ later clocks clash with early school starts.'),
    P('2:14:05', 'Exercise Timing', 'Exercise improves sleep; very hard late sessions can delay it for some people.'),
    P('2:17:48', 'Weighted Blankets and Gadgets', 'The evidence is modest; comfort and consistency matter more.'),
    P('2:22:31', 'Sleeping With a Partner', 'Separate blankets or sleep schedules can help mismatched sleepers.'),
    P('2:27:09', 'Jet Lag Strategy', 'Shift light exposure toward the destination’s morning before you fly.'),
  ] },
  { title: 'Putting It Together', points: [
    P('2:33:44', 'The Five Rules', 'A fixed wake time, morning light, an early caffeine cut-off, a cool dark room and a wind-down hour.'),
    P('2:39:20', 'When to See a Doctor', 'Persistent insomnia, loud snoring or daytime sleepiness deserve a professional look.'),
    P('2:44:51', 'Closing Thoughts', 'Sleep is the foundation the rest of health is built on.'),
  ] },
];

export const ALL_POINTS = SECTIONS.flatMap((s) => s.points);
export const TARGET_TIME = '1:12:40';
export const TARGET_INDEX = ALL_POINTS.findIndex((p) => p.time === TARGET_TIME);

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

// Chapter of the video at a time, for the player's chapter title and scrub label.
export const chapterAt = (sec: number) => {
  let cur = SECTIONS[0];
  for (const s of SECTIONS) if (s.points[0].sec <= sec) cur = s;
  return cur.title;
};

export const CHAPTER_STARTS = SECTIONS.map((s) => s.points[0].sec);

// The extension's own density arithmetic, from scripts/constants.js, for a
// 167-minute video: what the Detail field reads out.
export const DETAIL_TARGETS = { brief: 20, standard: 40, detailed: 84 };
