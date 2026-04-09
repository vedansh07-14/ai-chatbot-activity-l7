export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.HF_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Hugging Face API key not configured in Vercel Environment Variables.' });
  }

  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt, // HF Inference API expects 'inputs' instead of 'prompt'
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    // HF inference API usually returns raw image bytes. We need to convert it to base64 for the frontend to consume easily like our old code did.
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    return res.status(200).json({ data: [{ b64_json: base64Data }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
