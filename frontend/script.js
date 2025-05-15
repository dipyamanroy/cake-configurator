const formFields = {
  cakeType: null,
  flavor: null,
  toppings: [],
  decor: null,
};

function addChatMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "chat-entry";
  div.textContent = `${sender}: ${text}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function normalize(value) {
  if (!value) return "";
  return value.toString().trim().toLowerCase();
}

function updateForm() {
  console.log("Updating form with:", formFields);

  const cakeTypeEl = document.getElementById("cakeType");
  if (cakeTypeEl) cakeTypeEl.value = normalize(formFields.cakeType) || "";

  const flavorEl = document.getElementById("flavor");
  if (flavorEl) flavorEl.value = normalize(formFields.flavor) || "";

  const decorEl = document.getElementById("decor");
  if (decorEl) decorEl.value = normalize(formFields.decor) || "";

  const normalizedToppings = (formFields.toppings || []).map(normalize);
  document.querySelectorAll(".topping").forEach((cb) => {
    cb.checked = normalizedToppings.includes(normalize(cb.value));
  });
}


async function sendToChatbot() {
  const input = document.getElementById("chat-input").value.trim();
  if (!input) return;

  addChatMessage("You", input);
  document.getElementById("chat-input").value = "";

  try {
    // Now expect JSON object directly from backend
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });

    const parsed = await response.json();

    console.log("Parsed GPT form data:", parsed);

    Object.assign(formFields, {
      cakeType: parsed.cakeType || formFields.cakeType,
      flavor: parsed.flavor || formFields.flavor,
      toppings: Array.isArray(parsed.toppings) ? parsed.toppings : formFields.toppings,
      decor: parsed.decor || formFields.decor,
    });

    updateForm();
    addChatMessage("Bot", "Got it! Updated the form.");

    const missing = Object.entries(formFields).filter(
      ([, val]) => val == null || (Array.isArray(val) && val.length === 0)
    );
    if (missing.length > 0) {
      addChatMessage(
        "Bot",
        `Can you tell me your preferred: ${missing.map(([k]) => k).join(", ")}?`
      );
    }
  } catch (e) {
    console.error("Failed to parse GPT response", e);
    addChatMessage("Bot", "Sorry, I couldn't understand that.");
  }
}
