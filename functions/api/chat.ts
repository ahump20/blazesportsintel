/**
 * Cloudflare Pages Function: AI Sports Chat
 * Powered by Cloudflare Workers AI (Llama 3.2)
 *
 * Endpoint: /api/chat
 * Methods: POST
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  AI: Ai;
  SPORTS_CACHE: KVNamespace;
}

interface ChatRequest {
  message: string;
  context?: string;
}

interface ChatResponse {
  ok: boolean;
  response: string;
  model: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are Blaze, the AI sports analyst for Blaze Sports Intel. You specialize in:
- MLB baseball (especially the St. Louis Cardinals)
- NFL football (especially the Tennessee Titans)
- NBA basketball (especially the Memphis Grizzlies)
- NCAA athletics (especially Texas Longhorns baseball and football)
- Youth baseball scouting and development
- College baseball (the most underserved sport in media)

Your personality:
- Direct and knowledgeable, like a Texas native who knows sports inside and out
- Warm but no-nonsense - give real analysis, not fluff
- Use stats and data to back up your points
- You can discuss strategy, player performance, and predictions
- You have strong opinions but back them with evidence
- No corporate speak - be genuine

Keep responses concise but insightful. If asked about soccer, politely decline - we don't cover that here.

Current date context: ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Parse request body
    const body = await request.json() as ChatRequest;

    if (!body.message || typeof body.message !== 'string') {
      return jsonResponse({
        ok: false,
        error: 'Missing or invalid message field',
      }, 400);
    }

    // Sanitize input
    const userMessage = body.message.trim().slice(0, 1000);

    if (userMessage.length < 2) {
      return jsonResponse({
        ok: false,
        error: 'Message too short',
      }, 400);
    }

    // Check if AI binding exists
    if (!env.AI) {
      return jsonResponse({
        ok: true,
        response: getFallbackResponse(userMessage),
        model: 'fallback',
        timestamp: new Date().toISOString(),
      }, 200);
    }

    // Call Workers AI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = (aiResponse as any).response ||
                         (aiResponse as any).generated_text ||
                         'I apologize, I had trouble processing that. Could you rephrase your question?';

    return jsonResponse({
      ok: true,
      response: responseText,
      model: 'llama-3.2-3b-instruct',
      timestamp: new Date().toISOString(),
    }, 200);

  } catch (error) {
    console.error('AI Chat error:', error);

    return jsonResponse({
      ok: true,
      response: 'I\'m having a moment here. Try asking me again in a sec - my brain needs to catch up with my passion for sports analysis.',
      model: 'error-fallback',
      timestamp: new Date().toISOString(),
    }, 200);
  }
};

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('cardinal') || lowerMessage.includes('stl')) {
    return 'The Cardinals are always in the conversation. With their pitching depth and young talent coming up, they\'re built for sustained success. What specifically do you want to know about the Redbirds?';
  }

  if (lowerMessage.includes('titan') || lowerMessage.includes('tennessee')) {
    return 'Titans football - now we\'re talking. They\'ve had their ups and downs, but that\'s the AFC South for you. The defense has been the backbone. What\'s on your mind about the two-tone blue?';
  }

  if (lowerMessage.includes('grizzl') || lowerMessage.includes('memphis')) {
    return 'Memphis basketball is all about grit and grind. Ja Morant is electric when healthy. The young core has championship potential if they can stay together. What do you want to discuss?';
  }

  if (lowerMessage.includes('longhorn') || lowerMessage.includes('texas') || lowerMessage.includes('ut')) {
    return 'Hook \'em! Texas is back in the SEC and making waves. The baseball program is perennially elite, and football is finding its footing in the new conference. What aspect of Longhorn athletics interests you?';
  }

  if (lowerMessage.includes('college baseball')) {
    return 'College baseball is the most underserved sport in mainstream media - and that\'s exactly why we\'re here. D1Baseball does great work, but there\'s so much more story to tell. What program or aspect do you want to dive into?';
  }

  if (lowerMessage.includes('soccer')) {
    return 'Appreciate the question, but we don\'t cover soccer here. Stick to baseball, football, basketball, and track & field - that\'s where we bring the heat.';
  }

  return 'That\'s a great question. The AI is warming up, but I\'m here to talk MLB, NFL, NBA, and NCAA athletics. What\'s on your mind about the sports world?';
}

function jsonResponse(data: any, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};
