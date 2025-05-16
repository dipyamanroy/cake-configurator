const formFields = {
  cakeType: null,
  flavor: null,
  toppings: [],
  decor: null,
  size: null,
  layers: null,
  filling: null,
  icing: null,
  weddingStyle: null,
  allergies: null,
};

function addChatMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.classList.add("chat-entry");

  if (sender.toLowerCase() === "you") {
    div.classList.add("user-message");
  } else {
    div.classList.add("bot-message");
  }

  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function normalize(value) {
  if (!value) return "";
  return value.toString().trim().toLowerCase();
}

function updateForm() {
  console.log("Updating form with:", formFields);
  handleConditionalFields();

  // Dropdowns
  const dropdowns = [
    "cakeType", "flavor", "decor", "size", "layers",
    "filling", "icing", "weddingStyle", "allergies"
  ];
  dropdowns.forEach((key) => {
    const el = document.getElementById(key);
    if (el && formFields[key] != null) {
      el.value = normalize(formFields[key]) || "";
    }
  });

  // Toppings (checkboxes)
  const normalizedToppings = (formFields.toppings || []).map(normalize);
  document.querySelectorAll(".topping").forEach((cb) => {
    cb.checked = normalizedToppings.includes(normalize(cb.value));
  });

  // Conditional rendering
  const weddingStyleWrapper = document.getElementById("weddingStyleWrapper");
  if (formFields.cakeType === "wedding") {
    weddingStyleWrapper.style.display = "block";
  } else {
    weddingStyleWrapper.style.display = "none";
    formFields.weddingStyle = null;
  }

  // Update cake image preview
  const imageEl = document.querySelector('.cake-image');
  const type = normalize(formFields.cakeType);
  const flavor = normalize(formFields.flavor);

  let imageUrl = 'public/images/default.jpg'; 

  // Example mapping logic
  if (type === 'wedding') {
    imageUrl = 'public/images/wedding.jpg';
  } else if (type === 'birthday') {
    imageUrl = 'public/images/birthday.jpg';
  } else if (flavor === 'chocolate') {
    imageUrl = 'public/images/chocolate.jpg';
  } else if (flavor === 'vanilla') {
    imageUrl = 'public/images/vanilla.jpg';
  }

  imageEl.style.backgroundImage = `url('${imageUrl}')`;

}

function handleConditionalFields() {
  const cakeType = document.getElementById('cakeType').value.toLowerCase();
  const weddingStyleWrapper = document.getElementById('weddingStyleWrapper');

  if (cakeType === 'wedding') {
    weddingStyleWrapper.style.display = 'block';
  } else {
    weddingStyleWrapper.style.display = 'none';
    document.getElementById('weddingStyle').value = '';
  }
}

// Handle chat input
async function sendToChatbot() {
  const input = document.getElementById("chat-input").value.trim();
  if (!input) return;

  addChatMessage("You", input);
  document.getElementById("chat-input").value = "";

  try {
    const response = await fetch("https://t0md0m3g-3001.inc1.devtunnels.ms/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });

    const result = await response.json();

    const formData = result.data || {};
    const reply = result.reply || "Got it! Updated the form.";

    Object.assign(formFields, {
      cakeType: formData.cakeType ?? formFields.cakeType,
      flavor: formData.flavor ?? formFields.flavor,
      toppings: Array.isArray(formData.toppings) ? formData.toppings : formFields.toppings,
      decor: formData.decor ?? formFields.decor,
      size: formData.size ?? formFields.size,
      layers: formData.layers ?? formFields.layers,
      filling: formData.filling ?? formFields.filling,
      icing: formData.icing ?? formFields.icing,
      weddingStyle: formData.weddingStyle ?? formFields.weddingStyle,
      allergies: formData.allergies ?? formFields.allergies,
    });

    updateForm();

    addChatMessage("Bot", reply);

  } catch (e) {
    console.error("Failed to parse GPT response", e);
    addChatMessage("Bot", "Sorry, I couldn't understand that.");
  }
}

// Update form when user manually selects cakeType
document.getElementById("cakeType").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.cakeType = value;
  updateForm();
});

document.getElementById("chat-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault(); 
    sendToChatbot();
  }
});