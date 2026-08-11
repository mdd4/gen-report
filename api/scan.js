export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server" });
  }

  const { image, mediaType, prompt, maxTokens } = req.body || {};

  if (!image || !prompt) {
    return res.status(400).json({ error: "Missing image or prompt" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch(e) { data = null; }

    // Pass the real status and message through so the app can show it
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || raw.slice(0, 400) || `Anthropic API returned ${response.status}`,
        status: response.status,
      });
    }

    if (!data) {
      return res.status(502).json({ error: "Anthropic API returned a non-JSON response" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Request to Anthropic failed: ${err.message}` });
  }
}
