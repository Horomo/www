import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { buildAnalysisLogInsert, insertAnalysisLog } from '@/lib/analysis-log';
import { parseAnalyzeRequestBody } from '@/lib/analysis-payload';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const AI_MODEL = 'gpt-4o-mini';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

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

  const { birthInfo, computedChart } = parsedBody;
  const { pillars, chartData } = computedChart;
  const requestId = crypto.randomUUID();

  const systemPrompt = `You are a classical Bazi (Four Pillars of Destiny) master with deep knowledge of Chinese metaphysics. Analyze the chart in a clear, modern, practical style — not mystical or overly formal. Use English with Chinese terms in parentheses where appropriate. Be specific and insightful. Structure your response with clear sections.`;

  const chartSummary = `
Birth: ${birthInfo.dob}${birthInfo.unknownTime ? ' (unknown time)' : ` ${birthInfo.tob}`}, ${birthInfo.gender}

Four Pillars (四柱):
- Year 年柱: ${pillars.year.stem.zh}${pillars.year.branch.zh} (${pillars.year.stem.pinyin}/${pillars.year.branch.pinyin}) — ${pillars.year.stem.element} ${pillars.year.stem.yin?'Yin':'Yang'} / ${pillars.year.branch.element} ${pillars.year.branch.yin?'Yin':'Yang'}
- Month 月柱: ${pillars.month.stem.zh}${pillars.month.branch.zh} (${pillars.month.stem.pinyin}/${pillars.month.branch.pinyin}) — ${pillars.month.stem.element} ${pillars.month.stem.yin?'Yin':'Yang'} / ${pillars.month.branch.element} ${pillars.month.branch.yin?'Yin':'Yang'}
- Day 日柱: ${pillars.day.stem.zh}${pillars.day.branch.zh} (${pillars.day.stem.pinyin}/${pillars.day.branch.pinyin}) — Day Master: ${pillars.day.stem.element} ${pillars.day.stem.yin?'Yin':'Yang'}
${pillars.hour ? `- Hour 時柱: ${pillars.hour.stem.zh}${pillars.hour.branch.zh} (${pillars.hour.stem.pinyin}/${pillars.hour.branch.pinyin}) — ${pillars.hour.stem.element} ${pillars.hour.stem.yin?'Yin':'Yang'} / ${pillars.hour.branch.element} ${pillars.hour.branch.yin?'Yin':'Yang'}` : '- Hour 時柱: Unknown'}

5 Structures count (including all hidden stems):
${Object.entries(chartData.structureCounts).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

Dominant Ten Gods: ${Object.entries(chartData.tenGodsCount).sort((a: [string, unknown], b: [string, unknown]) => (b[1] as number) - (a[1] as number)).slice(0,3).map(([k,v])=>`${k}(${v})`).join(', ')}
`;

  const userPrompt = `Please analyze this Bazi chart:

${chartSummary}

Provide analysis in these sections:
1. **Day Master Profile** — character, strengths, natural tendencies
2. **Chart Balance** — which elements dominate, favorable/unfavorable elements
3. **Life Themes** — career tendencies, relationship patterns, key life areas
4. **Current Period** — general outlook for the current decade
5. **Practical Advice** — 3-4 actionable suggestions based on the chart

Keep it under 500 words total.`;

  try {
    try {
      await insertAnalysisLog(
        buildAnalysisLogInsert({
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

    const response = await client.chat.completions.create({
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
