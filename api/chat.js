export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  const apiUrl = "https://router.huggingface.co/v1/chat/completions";
  const apiKey = process.env.HF_API_KEY;
  
  // Default text model (Trinity)
  let model = "arcee-ai/Trinity-Large-Thinking:featherless-ai";

  // Check if any message contains an image
  const hasImage = messages.some(msg => 
    Array.isArray(msg.content) && msg.content.some(item => item.type === "image_url")
  );

  if (hasImage) {
    // Switch to Vision model if an image is attached
    model = "meta-llama/Llama-3.2-11B-Vision-Instruct";
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured in Vercel Environment Variables.' });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 2048
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
