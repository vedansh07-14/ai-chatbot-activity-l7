import { InferenceClient } from "@huggingface/inference";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.HF_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: HF_API_KEY is missing from environment variables.");
    return res.status(500).json({ error: 'Hugging Face API key not configured in environment variables.' });
  }

  // Initialize the Hugging Face Inference Client
  const client = new InferenceClient(apiKey);

  console.log(`Generating image for prompt: "${prompt}" using provider: "nscale"...`);

  try {
    // Generate an image using the specified provider and model
    const blob = await client.textToImage({
      provider: "nscale",
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: prompt,
      parameters: { 
        num_inference_steps: 5 
      },
    });

    if (!blob || !(blob instanceof Blob)) {
      throw new Error(`Invalid response from Hugging Face: Expected a Blob, but got ${typeof blob}`);
    }

    console.log("Image blob received successfully. Size:", blob.size);

    // Convert the resulting Blob to an ArrayBuffer and then to Base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    console.log("Image converted to Base64 successfully.");

    // Return the image in the format the frontend expects
    return res.status(200).json({ data: [{ b64_json: base64Data }] });
  } catch (error) {
    console.error("DETAILED IMAGE ERROR:", error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

