import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, format, targetWordCount } = await req.json();

    if (!content || !format || !targetWordCount) {
      return Response.json({ error: "Missing required fields." }, { status: 400, headers: corsHeaders });
    }

    // ── Call Claude API ───────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-3-haiku-20240307",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `You are a professional content editor. Adapt the following content for a ${format} format.
Target word count: ${targetWordCount} words.
Return ONLY the adapted content — no explanations, no headings, no extra commentary.

Original content:
${content}`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error("Claude error:", err);
      return Response.json({ error: "AI service error." }, { status: 500, headers: corsHeaders });
    }

    const claudeData = await claudeRes.json();
    const adaptedText = claudeData.content?.[0]?.text ?? "";

    // ── Save to Supabase DB ───────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("content_adaptations").insert({
          user_id:           user.id,
          original_text:     content,
          adapted_text:      adaptedText,
          format:            format,
          target_word_count: targetWordCount,
        });
      }
    }

    return Response.json({ content: adaptedText }, { headers: corsHeaders });

  } catch (err) {
    console.error("Function error:", err);
    return Response.json({ error: "Internal server error." }, { status: 500, headers: corsHeaders });
  }
});