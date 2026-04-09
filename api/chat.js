export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, textProvider } = req.body;

  const isHF = textProvider === "hf";
  const apiUrl = isHF ? "https://router.huggingface.co/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = isHF ? process.env.HF_API_KEY : process.env.OPENROUTER_KEY;
  const model  = isHF ? "arcee-ai/Trinity-Large-Thinking:featherless-ai" : "openai/gpt-4o-mini";

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured in Vercel Environment Variables.' });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(isHF ? {} : { "HTTP-Referer": req.headers.referer || "https://ai-chatbot-activity-l7.vercel.app", "X-Title": "NeuralChat" })
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
