import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { buildAnalysisLogInsert, insertAnalysisLog } from '@/lib/analysis-log';
import {
  analyzeRequestMatchesServerComputation,
  parseAnalyzeRequestBody,
  recomputeAnalysisChartPayload,
} from '@/lib/analysis-payload';
import { formatCalculationGenderMode, formatGenderIdentity } from '@/lib/gender';

const AI_MODEL = 'gpt-4o-mini';
let client: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

type AnalyzeRouteDependencies = {
  getSession: () => Promise<{ user?: { email?: string | null } } | null>;
  insertLog: typeof insertAnalysisLog;
  buildLogInsert: typeof buildAnalysisLogInsert;
  createCompletion: (payload: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    max_tokens: number;
    temperature: number;
  }) => Promise<{ choices: Array<{ message: { content: string | null } }> }>;
};

const defaultDependencies: AnalyzeRouteDependencies = {
  getSession: () => getServerSession(authOptions),
  insertLog: insertAnalysisLog,
  buildLogInsert: buildAnalysisLogInsert,
  createCompletion: (payload) => getOpenAiClient().chat.completions.create(payload),
};

export async function handleAnalyzeRequest(
  req: Request,
  dependencies: AnalyzeRouteDependencies = defaultDependencies,
) {
  const session = await dependencies.getSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in with Google to use AI analysis.' },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsedBody = parseAnalyzeRequestBody(body);

  if (!parsedBody) {
    return NextResponse.json(
      { error: 'Invalid analysis payload.' },
      { status: 400 },
    );
  }

  let computedChart;
  try {
    computedChart = recomputeAnalysisChartPayload(parsedBody.birthInfo);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid analysis payload.' },
      { status: 400 },
    );
  }

  if (!analyzeRequestMatchesServerComputation(parsedBody)) {
    return NextResponse.json(
      { error: 'Computed chart payload does not match the supplied birth information.' },
      { status: 400 },
    );
  }

  const { birthInfo } = parsedBody;
  const { pillars, chartData, daYun: rawDaYun } = computedChart;
  const [birthYear, birthMonth, birthDay] = birthInfo.dob.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() + 1 > birthMonth
    || (now.getUTCMonth() + 1 === birthMonth && now.getUTCDate() >= birthDay);
  const personAge = currentYear - birthYear - (hasHadBirthdayThisYear ? 0 : 1);
  const daYun = rawDaYun?.pillars.find((pillar) => personAge >= pillar.ageStart && personAge <= pillar.ageEnd) ?? null;
  const requestId = crypto.randomUUID();
  const mode = parsedBody.mode ?? 'initial';
  const followUpQuestion = parsedBody.followUpQuestion?.trim() ?? '';

  const systemPrompt = `You are a classical Bazi (Four Pillars of Destiny) master with deep knowledge of Chinese metaphysics. Analyze the chart in a clear, modern, practical style — not mystical or overly formal. Use English with Chinese terms in parentheses where appropriate. Be specific and insightful. Structure your response with clear sections.

Note on data model: element and Ten God counts in this chart are flat, unweighted occurrences from visible stems and hidden stems. They are not qi-strength scores. Avoid asserting that the Day Master is "strong" or "weak", or that elements are "favorable" or "unfavorable", based solely on these counts.

When analyzing, treat absent elements and minority Ten Gods as meaningful signals — what is missing from a chart is as diagnostic as what is present. Always surface shadow traits and challenges alongside strengths; a one-sided reading is not insightful.`;

  const chartSummary = `
Birth: ${birthInfo.dob}${birthInfo.unknownTime ? ' (unknown time)' : ` ${birthInfo.tob}`}
Gender identity: ${formatGenderIdentity(birthInfo.genderIdentity, birthInfo.genderOtherText)}
Luck cycle energy polarity (Da Yun direction rule): ${formatCalculationGenderMode(birthInfo.calculationMode)}

Four Pillars (四柱):
- Year 年柱: ${pillars.year.stem.zh}${pillars.year.branch.zh} (${pillars.year.stem.pinyin}/${pillars.year.branch.pinyin}) — ${pillars.year.stem.element} ${pillars.year.stem.yin?'Yin':'Yang'} / ${pillars.year.branch.element} ${pillars.year.branch.yin?'Yin':'Yang'}
- Month 月柱: ${pillars.month.stem.zh}${pillars.month.branch.zh} (${pillars.month.stem.pinyin}/${pillars.month.branch.pinyin}) — ${pillars.month.stem.element} ${pillars.month.stem.yin?'Yin':'Yang'} / ${pillars.month.branch.element} ${pillars.month.branch.yin?'Yin':'Yang'}
- Day 日柱: ${pillars.day.stem.zh}${pillars.day.branch.zh} (${pillars.day.stem.pinyin}/${pillars.day.branch.pinyin}) — Day Master: ${pillars.day.stem.element} ${pillars.day.stem.yin?'Yin':'Yang'}
${pillars.hour ? `- Hour 時柱: ${pillars.hour.stem.zh}${pillars.hour.branch.zh} (${pillars.hour.stem.pinyin}/${pillars.hour.branch.pinyin}) — ${pillars.hour.stem.element} ${pillars.hour.stem.yin?'Yin':'Yang'} / ${pillars.hour.branch.element} ${pillars.hour.branch.yin?'Yin':'Yang'}` : '- Hour 時柱: Unknown'}

5 Structures count (including all hidden stems):
${Object.entries(chartData.structureCounts).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

Most Frequent Ten Gods (flat count, unweighted): ${Object.entries(chartData.tenGodsCount).sort((a: [string, unknown], b: [string, unknown]) => (b[1] as number) - (a[1] as number)).slice(0,3).map(([k,v])=>`${k}(${v})`).join(', ')}

${daYun ? `Current Da Yun (luck cycle pillar):
- Stem: ${daYun.stem.zh} (${daYun.stem.pinyin}) — ${daYun.stem.element}
- Branch: ${daYun.branch.zh} (${daYun.branch.pinyin}) — ${daYun.branch.element}
- Age range: ${daYun.ageStart}–${daYun.ageEnd}` : '(Da Yun unavailable — birth time unknown)'}
`;

  if (mode === 'follow_up' && !followUpQuestion) {
    return NextResponse.json(
      { error: 'Please enter a follow-up question.' },
      { status: 400 },
    );
  }

  const userPrompt = mode === 'follow_up'
    ? `Please answer this follow-up question about the same Bazi chart:

${chartSummary}

Question: ${followUpQuestion}

Keep the answer focused, practical, and under 220 words.`
    : `Please analyze this Bazi chart:

${chartSummary}

Provide analysis in these sections:

1. Day Master Profile
   Character and core strengths AND natural blind spots or shadow tendencies.
   Be honest about both sides — do not list only positives.

2. Element Distribution
   Which elements dominate across visible and hidden stems, and what is notably
   absent. A missing element is as significant as a dominant one — explain what
   the absence means for this person's life pattern.

3. Life Themes — Career
   Derive career direction from BOTH the dominant Ten Gods AND the Day Master
   element using the intersection below. Do not use the Ten God label alone —
   always factor in what that energy means specifically for this Day Master.

   Day Master + Ten God career expressions:

   食神 (Eating God):
   - Wood DM: writing, education, environmental design, storytelling
   - Fire DM: product aesthetics, UX/industrial design, brand vision, performance
   - Earth DM: culinary arts, hospitality, urban planning, craft
   - Metal DM: engineering innovation, precision manufacturing, technical arts
   - Water DM: music, film, psychology, research communication

   傷官 (Hurting Officer):
   - Wood DM: activism, legal reform, unconventional academia
   - Fire DM: tech disruption, avant-garde art, political commentary
   - Earth DM: real estate reinvention, agricultural innovation, social enterprise
   - Metal DM: financial engineering, system deconstruction, military strategy
   - Water DM: philosophy, investigative journalism, behavioral science

   偏財 (Indirect Wealth):
   - Wood DM: venture capital, creative agency, media entrepreneurship
   - Fire DM: sales leadership, entertainment business, experience economy
   - Earth DM: real estate investment, commodity trading, logistics
   - Metal DM: M&A, private equity, manufacturing scale-up
   - Water DM: trading, hedge funds, information arbitrage

   正官 (Direct Officer):
   - Wood DM: judiciary, environmental policy, NGO leadership
   - Fire DM: government, military officer, corporate C-suite
   - Earth DM: civil service, land administration, institutional management
   - Metal DM: law enforcement, defense, central banking
   - Water DM: diplomacy, intelligence, academic administration

   偏官 (Seven Killings):
   - Wood DM: crisis management, surgery, competitive sports coaching
   - Fire DM: startup founding under adversity, emergency leadership
   - Earth DM: construction under pressure, geopolitics, infrastructure
   - Metal DM: combat sports, high-frequency trading, hardcore engineering
   - Water DM: investigative work, deep research, exploration

   正印 (Direct Resource):
   - Wood DM: literature, philosophy, traditional medicine
   - Fire DM: spiritual leadership, cultural curation, academic publishing
   - Earth DM: archaeology, classical scholarship, institutional research
   - Metal DM: legal scholarship, classical music theory, metallurgy research
   - Water DM: neuroscience, depth psychology, archival history

   偏印 (Indirect Resource):
   - Wood DM: alternative medicine, wilderness, unconventional healing
   - Fire DM: astrology/metaphysics, conceptual art, futurism
   - Earth DM: geology, traditional crafts, slow movements
   - Metal DM: cryptography, niche engineering, deconstruction
   - Water DM: quantum physics, mysticism, underground culture

   比肩/劫財 (Companion/Rob Wealth):
   - Wood DM: collaborative creative studio, open-source community
   - Fire DM: co-founder dynamic, competitive performer, rhetoric
   - Earth DM: family business, cooperative, community organizing
   - Metal DM: competitive manufacturing, sports rivalry
   - Water DM: academic competition, trading desk, peer networks

   Use only the rows relevant to this chart's Day Master and top Ten Gods.
   Pick 1–2 specific career archetypes and explain why they fit this chart.
   Do not list all possibilities.

4. Life Themes — Relationships & Key Areas
   Relationship patterns and key life tensions based on the structure counts.
   Surface the specific tension created by the dominant structure — e.g. high
   比肩/劫財 creates peer rivalry; high 偏官 creates authority conflicts.
   Do not default to generic "seek balance" statements.

5. Current Period
   Use the Da Yun pillar provided. Describe what the current luck cycle stem
   and branch elements mean when they interact with the Day Master element
   specifically — use the five-element interaction (生/剋/洩) to explain the
   dynamic. Do not give a generic "period of growth" statement.

6. Practical Advice — 3 suggestions
   Each suggestion must:
   - Name the specific Ten God or element it is derived from
   - Describe the actual tension or strength in this chart that motivates it
   - Give a concrete, real-world action (not "practice mindfulness" or
     "expand your network")

   Format each as:
   [Ten God / Element]: [Why this matters for this chart] → [Specific action]

Keep it under 750 words total.`;

  try {
    try {
      await dependencies.insertLog(
        dependencies.buildLogInsert({
          requestBody: parsedBody,
          userId: session.user.email,
          userAgent: req.headers.get('user-agent'),
          requestId,
          aiModel: AI_MODEL,
        }),
      );
    } catch (logError: unknown) {
      const message = logError instanceof Error ? logError.message : 'Unknown logging error';
      console.error('Analysis log insert failed', { requestId, userId: session.user.email, message });
    }

    const response = await dependencies.createCompletion({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return NextResponse.json({ analysis: response.choices[0].message.content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleAnalyzeRequest(req);
}
