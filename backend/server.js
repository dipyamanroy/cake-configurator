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
    content: `
You are a helpful assistant that extracts structured cake order details from casual user input.

If the user provides order info, respond ONLY with a strict JSON object containing the fields:

- cakeType: one of [${fields.cakeType.join(", ")}] or null
- flavor: one of [${fields.flavor.join(", ")}] or null
- size: one of [${fields.size.join(", ")}] or null
- layers: one of [${fields.layers.join(", ")}] or null
- filling: one of [${fields.filling.join(", ")}] or null
- icing: one of [${fields.icing.join(", ")}] or null
- toppings: array of any of [${fields.toppings.join(", ")}]
- decor: one of [${fields.decor.join(", ")}] or null
- weddingStyle: one of [${fields.weddingStyle.join(", ")}] or null (only if cakeType is wedding)
- allergies: one of [${fields.allergies.join(", ")}] or null

If the user is asking about available options, respond with a friendly natural language answer listing those options.

NEVER include markdown or code fences when returning JSON.

Examples:

User: "What cake types do you have?"
Bot: "Our available cake types are birthday, wedding, cupcake."

User: "I'd like a chocolate cake."
Bot: { "cakeType": null, "flavor": "chocolate", ... }

Be concise and clear.
`.trim()
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

    // Try parse JSON - if fails, assume natural language response for options
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      // Merge with defaults to fill missing fields
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
    } else {
      // Natural language response (e.g. options list)
      res.json({ data: {}, reply: content });
    }
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).send("Error calling OpenAI");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));