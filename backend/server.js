const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json()); // replaced bodyParser.json()

function cleanGPTResponse(text) {
  return text
    .replace(/^```json\s*/, "")  // fix replace regex, remove opening triple backticks + optional "json"
    .replace(/```$/, "")          // remove closing triple backticks
    .trim();
}

function generateReply(formData, currentState = {}) {
  const completeData = { ...currentState, ...formData };
  const missingFields = [];
  const filledFields = [];

  for (const key of ['cakeType', 'flavor', 'size', 'layers', 'filling', 'icing', 'allergies']) {
    if (completeData[key] == null || completeData[key] === '') {
      missingFields.push(key);
    } else {
      filledFields.push(key);
    }
  }

  if (!Array.isArray(completeData.toppings) || completeData.toppings.length === 0) {
    missingFields.push('toppings');
  } else {
    filledFields.push('toppings');
  }

  const layerCount = parseInt(completeData.layers, 10) || 0;
  if (!Array.isArray(completeData.decor) || completeData.decor.length !== layerCount) {
    missingFields.push('decor');
  } else {
    filledFields.push('decor');
  }

  if (completeData.cakeType === 'wedding' && (!completeData.weddingStyle || completeData.weddingStyle === '')) {
    missingFields.push('weddingStyle');
  } else if (completeData.cakeType === 'wedding') {
    filledFields.push('weddingStyle');
  }

  if (filledFields.length === 0) {
    return "Hi there! What kind of cake are you thinking about today? You can tell me the cake type, flavor, toppings, or anything you want.";
  }

  // Fix: check if missingFields contains only 'weddingStyle' and cakeType !== 'wedding'
  if (missingFields.length === 0 ||
      (missingFields.length === 1 && missingFields[0] === 'weddingStyle' && completeData.cakeType !== 'wedding')) {
    return "Thanks! I've noted your complete cake order details.";
  }

  const filledMessage = filledFields.length > 0 
    ? `I've got your ${filledFields.join(", ")}. `
    : "";

  return `${filledMessage}Could you please tell me your preferred ${missingFields.join(", ")}?`;
}

app.post("/api/chat", async (req, res) => {
  const { prompt, currentState = {} } = req.body;

  const fields = {
    cakeType: ['birthday', 'wedding', 'cupcake'],
    flavor: ['vanilla', 'chocolate', 'strawberry', 'red velvet', 'lemon'],
    size: ['small', 'medium', 'large', 'tiered'],
    layers: ['1', '2', '3'],
    filling: ['none', 'cream', 'jam', 'ganache'],
    icing: ['buttercream', 'fondant', 'chocolate glaze'],
    toppings: ['sprinkles', 'cherries', 'nuts', 'berries', 'chocolate chips'],
    decor: ['none', 'rose', 'gold flake', 'honey'],
    weddingStyle: ['classic', 'romantic', 'modern'],
    allergies: ['none', 'nuts', 'gluten', 'dairy'],
  };

  let contextStr = "";
  if (currentState && Object.keys(currentState).length > 0) {
    contextStr = `
Current cake order state:
${Object.entries(currentState)
  .filter(([key, value]) => value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : true))
  .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
  .join("\n")}

Keep these values unless the user specifically changes them.
`;
  }

  const systemMessage = {
    role: "system",
    content: `
You are a helpful assistant that extracts structured cake order details from casual user input.

${contextStr}

If the user provides order info, respond ONLY with a strict JSON object containing the fields:

- cakeType: one of [${fields.cakeType.join(", ")}] or null
- flavor: one of [${fields.flavor.join(", ")}] or null
- size: one of [${fields.size.join(", ")}] or null
- layers: one of [${fields.layers.join(", ")}] or null
- filling: one of [${fields.filling.join(", ")}] or null
- icing: one of [${fields.icing.join(", ")}] or null
- toppings: array of any of [${fields.toppings.join(", ")}]
- decor: array of any of [${fields.decor.join(", ")}], with one value per cake layer (e.g. ["rose", "none", "gold flake"] for a 3-layer cake), or an empty array if not specified
- weddingStyle: one of [${fields.weddingStyle.join(", ")}] or null (only if cakeType is wedding)
- allergies: one of [${fields.allergies.join(", ")}] or null

If the user is asking about available options, respond with a friendly natural language answer listing those options.

NEVER include markdown or code fences when returning JSON.

Examples:

User: "What decor options are available?"
Bot: "We offer these decor options per layer: none, rose, gold flake, honey."

User: "I want floral decor on the first layer and gold flakes on others for my 3-layer cake"
Bot: { "decor": ["rose", "gold flake", "gold flake"], "layers": "3" }

Be concise and clear.
`.trim()
  };

  const userMessage = { role: "user", content: prompt };

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
    let content = data.choices[0].message.content; // fixed this line
    console.log("Raw GPT response:", content);

    content = cleanGPTResponse(content);

    let parsed;
    try {
      parsed = JSON.parse(content);
      if (parsed.decor && !Array.isArray(parsed.decor)) {
        parsed.decor = [parsed.decor];
      }
    } catch (parseError) {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      // Merge currentState first, then parsed overrides it
      const complete = {
        cakeType: null,
        flavor: null,
        size: null,
        layers: null,
        filling: null,
        icing: null,
        toppings: [],
        decor: [],
        weddingStyle: null,
        allergies: null,
        ...currentState,
        ...parsed
      };

      const layerCount = parseInt(complete.layers, 10) || 0;
      if (layerCount > 0) {
        complete.decor = Array.from({ length: layerCount }, (_, i) =>
          complete.decor[i] || 'none'
        );
      } else {
        complete.decor = [];
      }

      // Pass the merged complete object to generateReply to get accurate missing fields
      const reply = generateReply(complete, currentState);
      res.json({ data: complete, reply });
    } else {
      res.json({ data: currentState || {}, reply: content });
    }
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).send("Error calling OpenAI");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
