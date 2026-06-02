import Anthropic from '@anthropic-ai/sdk';
import { getProviderKeys, markKeyFailure, markKeySuccess } from './api-keys';

type ChatMessage = { role: string; content: string };
type TenderForComparison = {
  id: string;
  title: string;
  summary?: string | null;
  budget?: string | null;
  deadline?: string | Date | null;
  category?: string | null;
  analysis: any;
  scorecard?: Record<string, unknown>;
};

const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL ?? 'mistral-large-latest';
const MISTRAL_API_URL = process.env.MISTRAL_API_URL ?? 'https://api.mistral.ai/v1/chat/completions';

function anthropicClient(apiKey = process.env.ANTHROPIC_API_KEY) {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Set AI_PROVIDER="mistral" to use Mistral instead.');
  }
  return new Anthropic({ apiKey });
}

function anthropicText(response: any) {
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Invalid response');
  return content.text;
}

async function mistralComplete(messages: ChatMessage[], maxTokens: number, system?: string) {
  const keys = await getProviderKeys('mistral');
  if (!keys.length) throw new Error('No active Mistral API key is configured');

  let lastError = '';
  for (const key of keys) {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key.value}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      await markKeySuccess(key.id, estimateTokens(messages, text));
      return text;
    }

    lastError = `Mistral API error: ${response.status} ${await response.text()}`;
    await markKeyFailure(key.id);
    if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
  }

  throw new Error(lastError || 'Mistral API request failed');
}

async function completeText(messages: ChatMessage[], maxTokens: number, system?: string) {
  if (provider === 'mistral') return mistralComplete(messages, maxTokens, system);

  const response = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  });
  return anthropicText(response);
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error('AI returned invalid JSON');
  }
}

export async function streamTenderChat(messages: ChatMessage[], tenderText: string) {
  const system = `You are TenderNova AI, a professional tender intelligence assistant for procurement and bid teams. Be concise, business-focused, analytical, and grounded in the uploaded tender. Help with eligibility, compliance, risks, proposal strategy, deadlines, required documents, and government tender terminology. Reference relevant clauses or document snippets when possible. Tender: ${tenderText.slice(0, 6000)}`;

  if (provider === 'mistral') {
    const keys = await getProviderKeys('mistral');
    if (!keys.length) throw new Error('No active Mistral API key is configured');

    let response: Response | null = null;
    let activeKeyId: string | undefined;
    let lastError = '';
    for (const key of keys) {
      response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          max_tokens: 1000,
          stream: true,
          messages: [{ role: 'system', content: system }, ...messages]
        })
      });

      if (response.ok && response.body) {
        activeKeyId = key.id;
        break;
      }

      await markKeyFailure(key.id);
      lastError = `Mistral API error: ${response.status} ${await response.text()}`;
      if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
    }

    if (!response?.ok || !response.body) throw new Error(lastError || 'Mistral API stream failed');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let streamedText = '';
    return new ReadableStream({
      async start(controller) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const text = chunk
            .split('\n')
            .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]')
            .map(line => {
              try {
                return JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? '';
              } catch {
                return '';
              }
            })
            .join('');
          if (text) {
            streamedText += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        await markKeySuccess(activeKeyId, estimateTokens(messages, streamedText));
        controller.close();
      }
    });
  }

  const stream = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    stream: true,
    system,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    }
  });
}

export async function analyzeTender(text: string) {
  const content = await completeText([{
    role: 'user',
    content: `Analyze this tender document and return ONLY valid JSON (no markdown):
{
  "title": "tender title",
  "summary": "1-2 concise business sentences",
  "deadline": "deadline date or null",
  "budget": "budget amount or null",
  "category": "category type",
  "eligibility": {
    "score": 0-100,
    "criteria": ["list of requirements"],
    "met": ["requirements likely met"],
    "missing": ["requirements to address"]
  },
  "requirements": {
    "documents": ["required documents"],
    "technical": ["technical requirements"],
    "financial": ["financial requirements"]
  },
  "risks": [
    {"level": "high|medium|low", "description": "risk description", "clause": "relevant clause"}
  ],
  "keyDates": [{"event": "name", "date": "date"}],
  "estimatedBudget": "budget range if extractable",
  "successProbability": 0-100,
  "opportunityScore": 0-100,
  "qualityRating": "A|B|C|D",
  "weaknesses": ["specific bid weaknesses"],
  "improvementSuggestions": ["specific actions to improve win chances"],
  "confidence": 0-100,
  "explainability": "one concise sentence explaining score drivers"
}
Tender text: ${text.slice(0, 8000)}`
  }], 1400);
  return parseJsonResponse(content);
}

export async function generateProposal(tenderText: string, analysis: any) {
  return completeText([{
    role: 'user',
    content: `Generate a concise professional tender proposal based on this tender.
Analysis: ${JSON.stringify(analysis)}
Tender excerpt: ${tenderText.slice(0, 4000)}
Use clear section headings without markdown symbols. Include: Executive Summary, Company Overview, Technical Approach, Team and Qualifications, Timeline, Commercial Approach, Why Choose Us. Do not use placeholder brackets.`
  }], 2200);
}

export async function chatWithTender(messages: ChatMessage[], tenderText: string) {
  const system = `You are TenderNova AI, an expert tender analysis assistant for bid managers. Answer in a professional, concise, business-oriented tone. Use plain text with no markdown symbols. Keep answers brief, readable, and grounded in the tender document. Tender document: ${tenderText.slice(0, 6000)}`;
  return completeText(messages, 1000, system);
}

export async function compareTenders(tenders: TenderForComparison[]) {
  const content = await completeText([{
    role: 'user',
    content: `Compare these tenders using their provided ids and scorecards. Return ONLY valid JSON. Each comparison row must be specific to that tender, with unique pros, cons, and business reasoning:
{
  "recommendation": "which tender to prioritize and why",
  "winnerTenderId": "id",
  "winnerReason": "business explanation of why this tender wins",
  "comparison": [
    {
      "tenderId": "id",
      "title": "title", 
      "score": 0-100,
      "budgetFit": 0-100,
      "winProbability": 0-100,
      "complexity": 0-100,
      "timelineFit": 0-100,
      "profitability": 0-100,
      "eligibilityMatch": 0-100,
      "pros": ["list"],
      "cons": ["list"],
      "riskLevel": "high|medium|low",
      "costBenefitInsight": "specific insight"
    }
  ],
  "summary": "overall comparison summary"
}
Tenders: ${JSON.stringify(tenders)}`
  }], 1400);
  return parseJsonResponse(content);
}

function estimateTokens(messages: ChatMessage[], text: string) {
  return Math.ceil((JSON.stringify(messages).length + text.length) / 4);
}
