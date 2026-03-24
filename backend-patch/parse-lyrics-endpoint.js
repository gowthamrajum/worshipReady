/**
 * Add this to your server.js backend.
 *
 * 1. Install: npm install @anthropic-ai/sdk
 * 2. Set env var: ANTHROPIC_API_KEY=sk-ant-...
 * 3. Paste the code below into server.js (before the app.listen section)
 */

// ── At the top of server.js, add: ──
// const Anthropic = require("@anthropic-ai/sdk");

// ── Then add this endpoint: ──

/*
app.post("/songs/parse-lyrics", async (req, res) => {
  try {
    const { rawLyrics } = req.body;
    if (!rawLyrics || !rawLyrics.trim()) {
      return res.status(400).json({ error: "rawLyrics is required" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: "AI parsing not configured" });
    }

    const anthropic = new Anthropic({ apiKey });

    // Extract a likely song identifier from the first few lines for web search
    const firstLines = rawLyrics.trim().split("\n").slice(0, 3).join(" ").substring(0, 120);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        }
      ],
      messages: [
        {
          role: "user",
          content: `You are an expert in Telugu Christian worship songs.

STEP 1 — WEB SEARCH:
Search the web for this song to find properly structured lyrics. Try searching for:
- "${firstLines} Telugu Christian song lyrics"
- Any recognisable Telugu or English phrases from the lyrics below

Use the web search results to cross-reference and verify the song structure: which part is the pallavi (chorus), which are the charanams (stanzas), and ensure you have complete, accurate Telugu and English transliteration.

STEP 2 — PARSE:
Using BOTH the pasted lyrics AND any web results, produce a structured JSON.

RULES:
1. Identify the "main_stanza" (pallavi/chorus) — the part that repeats between stanzas. Include any bridge/pre-chorus sections here too.
2. Identify numbered stanzas (charanams) — the unique verse sections.
3. Each section must have BOTH Telugu and English transliteration lines. If the user only pasted one language for a section, use the web search results to fill in the other.
4. Remove (x2), (x3) repeat markers from the text.
5. Remove stanza number prefixes like "1.", "2." from the text.
6. If the same block of text appears multiple times, it's the chorus — include it only once in main_stanza.
7. The song_name should be the first meaningful English transliteration phrase (title of the song).
8. Keep Telugu lines as proper Telugu script. Keep English lines as English/Latin transliteration.
9. Each line should be a single displayable line (not too long — split long lines naturally at phrase boundaries).

IMPORTANT: After searching and analysing, return ONLY valid JSON as your final text output — no markdown fences, no explanation. Use this exact structure:
{
  "song_name": "English name of the song",
  "main_stanza": {
    "telugu": ["line1", "line2", ...],
    "english": ["transliteration1", "transliteration2", ...]
  },
  "stanzas": [
    {
      "stanza_number": 1,
      "telugu": ["line1", "line2", ...],
      "english": ["transliteration1", "transliteration2", ...]
    }
  ]
}

RAW LYRICS:
${rawLyrics}`
        }
      ]
    });

    // Claude may return multiple content blocks (tool_use, tool_result, text).
    // We need the final text block which contains the JSON.
    let jsonText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        jsonText = block.text;
      }
    }

    if (!jsonText) {
      return res.status(500).json({ error: "No text response from AI" });
    }

    // Extract JSON (handle potential markdown wrapping)
    let jsonStr = jsonText.trim();
    if (jsonStr.startsWith("\`\`\`")) {
      jsonStr = jsonStr.replace(/^\`\`\`(?:json)?\n?/, "").replace(/\n?\`\`\`$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    console.error("AI lyrics parse failed:", err.message);
    res.status(500).json({ error: "AI parsing failed", detail: err.message });
  }
});
*/
