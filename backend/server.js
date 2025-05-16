const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const app = express();

app.use(cors());
app.use(bodyParser.json());

function cleanGPTResponse(text) {
  return text
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
}

function generateReply(formData) {
  // Check missing fields
  const missingFields = [];
  for (const key of ['cakeType', 'flavor', 'toppings', 'decor', 'size', 'layers', 'filling', 'icing', 'weddingStyle', 'allergies']) {
    if (formData[key] == null || (Array.isArray(formData[key]) && formData[key].length === 0)) {
      missingFields.push(key);
    }
  }

  if (missingFields.length === 0) {
    return "Thanks! I've noted your complete cake order details.";
  }

  // Customize message for greetings or unrelated inputs
  if (!formData.cakeType && !formData.flavor && !formData.toppings.length && !formData.decor) {
    return "Hi there! What kind of cake are you thinking about today? You can tell me the cake type, flavor, toppings, or anything you want.";
  }

  return `Got it! Could you please tell me your preferred: ${missingFields.join(", ")}?`;
}

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  const fields = {
    cakeType: ['birthday', 'wedding', 'cupcake'],
    flavor: ['vanilla', 'chocolate', 'strawberry', 'red velvet', 'lemon'],
    size: ['small', 'medium', 'large', 'tiered'],
    layers: ['1', '2', '3'],
    filling: ['none', 'cream', 'jam', 'ganache'],
    icing: ['buttercream', 'fondant', 'chocolate glaze'],
    toppings: ['sprinkles', 'cherries', 'nuts', 'berries', 'chocolate chips'],
    decor: ['simple', 'fancy', 'themed', 'floral'],
    weddingStyle: ['classic', 'romantic', 'modern'],
    allergies: ['none', 'nuts', 'gluten', 'dairy'],
  };

  const systemMessage = {
    role: "system",
    content: `You are a helpful assistant that extracts structured cake order details from casual user input. 
Return only a **strict JSON object** without any text or explanation. Only use values from these options:

- cakeType: ${fields.cakeType.join(', ')} or null
- flavor: ${fields.flavor.join(', ')} or null
- size: ${fields.size.join(', ')} or null
- layers: ${fields.layers.join(', ')} or null
- filling: ${fields.filling.join(', ')} or null
- icing: ${fields.icing.join(', ')} or null
- toppings: array of any of [${fields.toppings.join(', ')}]
- decor: ${fields.decor.join(', ')} or null
- weddingStyle: ${fields.weddingStyle.join(', ')} or null (only if cakeType is wedding)
- allergies: ${fields.allergies.join(', ')} or null

All values must be lowercase. If any field is not mentioned, return null or an empty array.
NEVER include markdown or code fences.`
  };

  const userMessage = {
    role: "user",
    content: prompt
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [systemMessage, userMessage],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return res.status(500).json({ error: "OpenAI API error" });
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid response from OpenAI:", data);
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    let content = data.choices[0].message.content;
    console.log("Raw GPT response:", content);

    content = cleanGPTResponse(content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response JSON:", parseError);
      parsed = {};
    }

    const complete = {
      cakeType: null,
      flavor: null,
      size: null,
      layers: null,
      filling: null,
      icing: null,
      toppings: [],
      decor: null,
      weddingStyle: null,
      allergies: null,
      ...parsed
    };

    const reply = generateReply(complete);

    res.json({ data: complete, reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).send("Error calling OpenAI");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
