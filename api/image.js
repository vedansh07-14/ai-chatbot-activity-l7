export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.HF_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'HF_API_KEY not configured.' });
  }

  try {
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
      return res.status(response.status).json({ error: errText });
    }

    // Try to parse as JSON to get b64_json directly
    const data = await response.json();
    
    if (data.data && data.data[0] && data.data[0].b64_json) {
      return res.status(200).json({ data: data.data });
    }

    // If for some reason it's not base64 despite the request, we'd handle it here
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
