const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(bodyParser.json());

function cleanGPTResponse(text) {
  // Remove ```json or ``` and trailing ```
  return text
    .replace(/^```json\s*/, "")  // Remove starting ```json
    .replace(/^```\s*/, "")       // Remove starting ```
    .replace(/```$/, "")          // Remove ending ```
    .trim();
}

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant that extracts cake order details from user messages. Respond ONLY with a strict JSON object—no explanations, no extra text, no markdown, no code fences."
    },
    {
      role: "user",
      content: `Extract cake order details from this user message exactly as JSON with lowercase values and these fields:
- cakeType: one of "birthday", "wedding", "cupcake" or null
- flavor: one of "vanilla", "chocolate", "strawberry" or null
- toppings: array of zero or more of ["sprinkles", "cherries", "nuts"]
- decor: one of "simple", "fancy", "themed" or null

IMPORTANT: Only assign the cake type to "cakeType". Do NOT assign cake types to "decor".

User message: "${prompt}"

Reply ONLY with the JSON object.`
    },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
      }),
    });

    const data = await response.json();

    let content = data.choices[0].message.content;
    console.log("Raw GPT response:", content);

    content = cleanGPTResponse(content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response JSON:", parseError);
      // Return a default empty form if parsing fails
      parsed = {
        cakeType: null,
        flavor: null,
        toppings: [],
        decor: null,
      };
    }

    res.json(parsed);
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).send("Error calling OpenAI");
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
