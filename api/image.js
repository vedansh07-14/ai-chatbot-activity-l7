export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.HF_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'HF_API_KEY is not configured in environment variables.' });
  }

  try {
    console.log(`[API] Image request for prompt: ${prompt}`);
    
    const response = await fetch("https://router.huggingface.co/nscale/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        prompt: prompt,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API] Remote error ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: errText });
    }

    const contentType = response.headers.get("content-type") || "";
    
    // CASE 1: Response is JSON (Standard OpenAI format or error)
    if (contentType.includes("application/json")) {
      const data = await response.json();
      
      if (data.data && data.data[0] && data.data[0].b64_json) {
        return res.status(200).json({ data: data.data });
      } else {
        // Unexpected JSON structure
        return res.status(200).json(data);
      }
    } 
    
    // CASE 2: Response is raw Image (Blob/Binary)
    // Sometimes routers return the raw image even if JSON was requested
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    return res.status(200).json({ 
      data: [{ b64_json: base64Data }] 
    });

  } catch (error) {
    console.error("[API] Fatal error:", error);
    return res.status(500).json({ error: error.message });
  }
}
