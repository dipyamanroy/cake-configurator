const formFields = {
  cakeType: null,
  flavor: null,
  toppings: [],
  decor: [],
  size: null,
  layers: null,
  filling: null,
  icing: null,
  weddingStyle: null,
  allergies: null,
};

function normalize(value) {
  if (!value) return "";
  return value.toString().trim().toLowerCase();
}

function addChatMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.classList.add("chat-entry");

  if (normalize(sender) === "you") {
    div.classList.add("user-message");
  } else {
    div.classList.add("bot-message");
  }

  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function renderDecorInputs() {
  const container = document.getElementById("decorInputs");
  container.innerHTML = "";
  const layerCount = parseInt(formFields.layers) || 0;

  for (let i = 0; i < layerCount; i++) {
    const select = document.createElement("select");
    select.className = "decor-select";
    select.dataset.layer = i;

    ["None", "Rose", "Gold flake", "Honey"].forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.toLowerCase();
      option.textContent = opt;
      select.appendChild(option);
    });

    if (formFields.decor[i]) {
      select.value = formFields.decor[i];
    }

    select.addEventListener("change", (e) => {
      const index = parseInt(e.target.dataset.layer);
      formFields.decor[index] = e.target.value;
      updateCurrentSelection();
      updatePriceTable();
    });

    const label = document.createElement("label");
    label.textContent = `Layer ${i + 1} `;
    label.appendChild(select);
    container.appendChild(label);
  }
}

function updateForm() {
  console.log(formFields);
  handleConditionalFields();

  const dropdowns = ["cakeType", "flavor", "decor", "size", "layers", "filling", "icing", "weddingStyle", "allergies"];
  dropdowns.forEach((key) => {
    const el = document.getElementById(key);
    if (el && formFields[key] != null) {
      const val = normalize(formFields[key]);
      if (el.value !== val) {
        el.value = val;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });

  const normalizedToppings = formFields.toppings.map(normalize);
  document.querySelectorAll(".topping").forEach((cb) => {
    const shouldBeChecked = normalizedToppings.includes(normalize(cb.value));
    if (cb.checked !== shouldBeChecked) {
      cb.checked = shouldBeChecked;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  const weddingStyleWrapper = document.getElementById("weddingStyleWrapper");
  if (normalize(formFields.cakeType) === "wedding") {
    weddingStyleWrapper.style.display = "block";
  } else {
    weddingStyleWrapper.style.display = "none";
    formFields.weddingStyle = null;
  }

  const imageEl = document.querySelector('.cake-image');
  const type = normalize(formFields.cakeType);
  const flavor = normalize(formFields.flavor);
  let imageUrl = 'public/images/default.jpg';
  if (type === 'wedding') imageUrl = 'public/images/wedding.jpg';
  else if (type === 'birthday') imageUrl = 'public/images/birthday.jpg';
  else if (flavor === 'chocolate') imageUrl = 'public/images/chocolate.jpg';
  else if (flavor === 'vanilla') imageUrl = 'public/images/vanilla.jpg';
  imageEl.style.backgroundImage = `url('${imageUrl}')`;

  renderDecorInputs();
  updateCurrentSelection();
  updatePriceTable();
}

function handleConditionalFields() {
  const cakeType = normalize(document.getElementById('cakeType').value);
  const weddingStyleWrapper = document.getElementById('weddingStyleWrapper');
  if (cakeType === 'wedding') {
    weddingStyleWrapper.style.display = 'block';
  } else {
    weddingStyleWrapper.style.display = 'none';
    document.getElementById('weddingStyle').value = '';
  }
}

async function sendToChatbot() {
  const input = document.getElementById("chat-input").value.trim();
  if (!input) return;

  addChatMessage("You", input);
  document.getElementById("chat-input").value = "";

  // Get current selection + price info
  const currentSelection = getSelectedValues();
  const { total, breakdown } = calculatePrice(currentSelection);

  try {
    const response = await fetch("https://t0md0m3g-3001.inc1.devtunnels.ms/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input,
        currentState: { ...formFields, price: total },
        priceBreakdown: breakdown,
      }),
    });

    const result = await response.json();
    const formData = result.data || {};
    const reply = result.reply || "Got it! Updated the form.";

    Object.keys(formFields).forEach(key => {
      formFields[key] = formData[key] ?? formFields[key];
    });

    if (formData.allergies === 'nuts') {
      formFields.toppings = formFields.toppings.filter(t =>
        !['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(normalize(t))
      );
    }

    if (Array.isArray(formData.toppings)) {
      if (formFields.allergies === 'nuts') {
        formFields.toppings = formData.toppings.filter(t =>
          !['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(normalize(t))
        );
      } else {
        formFields.toppings = formData.toppings;
      }
    }

    Object.keys(formFields).forEach(key => {
      if (formFields[key] == null && currentSelection[key]) {
        formFields[key] = currentSelection[key];
      }
    });

    if (!Array.isArray(formFields.toppings)) formFields.toppings = [];

    updateForm();
    addChatMessage("Bot", reply);
  } catch (e) {
    console.error("Failed to parse GPT response", e);
    addChatMessage("Bot", "Sorry, I couldn't understand that.");
  }
}

function getSelectedValues() {
  const toppings = Array.from(document.querySelectorAll(".topping:checked")).map(el => el.value);
  return {
    cakeType: document.getElementById("cakeType").value || null,
    size: document.getElementById("size").value || null,
    layers: document.getElementById("layers").value || null,
    flavor: document.getElementById("flavor").value || null,
    filling: document.getElementById("filling").value || null,
    icing: document.getElementById("icing").value || null,
    toppings,
    weddingStyle: document.getElementById("cakeType").value === "wedding" ? document.getElementById("weddingStyle").value : null,
    allergies: document.getElementById("allergies").value || null,
  };
}

function updateCurrentSelection() {
  const selection = getSelectedValues();
  document.getElementById("spec-type").textContent = selection.cakeType || "Not selected";
  document.getElementById("spec-size").textContent = selection.size || "Not selected";
  document.getElementById("spec-flavor").textContent = selection.flavor || "Not selected";
  document.getElementById("weddingStyleWrapper").style.display = selection.cakeType === "wedding" ? "block" : "none";
}

function calculatePrice(selection) {
  let total = 0;
  const breakdown = [];

  const typePrices = { birthday: 20, wedding: 50, cupcake: 10 };
  const sizePrices = { small: 10, medium: 20, large: 30, tiered: 50 };
  const fillingPrices = { none: 0, cream: 5, jam: 5, ganache: 7 };
  const icingPrices = { buttercream: 5, fondant: 10, "chocolate glaze": 7 };
  const weddingStylePrices = { classic: 10, romantic: 15, modern: 20 };
  const allergiesPrices = { none: 0, nuts: 5, gluten: 5, dairy: 5 };

  if (selection.cakeType && typePrices[selection.cakeType]) {
    breakdown.push({ label: `Cake Type (${selection.cakeType})`, price: typePrices[selection.cakeType] });
    total += typePrices[selection.cakeType];
  }

  if (selection.size && sizePrices[selection.size]) {
    breakdown.push({ label: `Size (${selection.size})`, price: sizePrices[selection.size] });
    total += sizePrices[selection.size];
  }

  const layerCount = parseInt(selection.layers, 10) || 0;
  if (layerCount) {
    const price = layerCount * 5;
    breakdown.push({ label: `Layers (${layerCount})`, price });
    total += price;
  }

  if (selection.filling && fillingPrices[selection.filling] !== undefined) {
    breakdown.push({ label: `Filling (${selection.filling})`, price: fillingPrices[selection.filling] });
    total += fillingPrices[selection.filling];
  }

  if (selection.icing && icingPrices[selection.icing] !== undefined) {
    breakdown.push({ label: `Icing (${selection.icing})`, price: icingPrices[selection.icing] });
    total += icingPrices[selection.icing];
  }

  if (selection.toppings?.length) {
    const toppingPrice = selection.toppings.length * 2;
    breakdown.push({ label: `Toppings (${selection.toppings.join(", ")})`, price: toppingPrice });
    total += toppingPrice;
  }

  if (selection.cakeType === "wedding" && selection.weddingStyle && weddingStylePrices[selection.weddingStyle]) {
    breakdown.push({ label: `Wedding Style (${selection.weddingStyle})`, price: weddingStylePrices[selection.weddingStyle] });
    total += weddingStylePrices[selection.weddingStyle];
  }

  if (selection.allergies && allergiesPrices[selection.allergies] !== undefined) {
    breakdown.push({ label: `Allergies (${selection.allergies})`, price: allergiesPrices[selection.allergies] });
    total += allergiesPrices[selection.allergies];
  }

  return { total, breakdown };
}

function formatPrice(num) {
  return `$${num.toFixed(2)}`;
}

function updatePriceTable() {
  const selection = getSelectedValues();
  const { total, breakdown } = calculatePrice(selection);
  const container = document.getElementById("price-table-container");

  if (!breakdown.length) {
    container.innerHTML = "<p>No selections yet to price.</p>";
    return;
  }

  container.innerHTML = `
    <table class="price-table">
      <thead>
        <tr><th>Item</th><th style="text-align:right;">Price</th></tr>
      </thead>
      <tbody>
        ${breakdown.map(item => `<tr><td>${item.label}</td><td style="text-align:right;">${formatPrice(item.price)}</td></tr>`).join("")}
      </tbody>
      <tfoot>
        <tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>${formatPrice(total)}</strong></td></tr>
      </tfoot>
    </table>`;
}

function syncFormFieldsWithUI() {
  const uiState = getSelectedValues();
  Object.keys(uiState).forEach(key => {
    if (uiState[key]) {
      formFields[key] = uiState[key];
    }
  });
}

function attachListeners() {
  const fields = ["cakeType", "size", "layers", "flavor", "filling", "icing", "weddingStyle", "allergies"];
  fields.forEach(id => {
    document.getElementById(id).addEventListener("change", (e) => {
      formFields[id] = normalize(e.target.value);
      if (id === "layers") renderDecorInputs();
      updateForm();
    });
  });

  document.querySelectorAll(".topping").forEach(checkbox => {
    checkbox.addEventListener("change", (e) => {
      const value = normalize(e.target.value);
      if (e.target.checked) {
        if (formFields.allergies === 'nuts' && ['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(value)) {
          e.target.checked = false;
          alert("Cannot add nut toppings with a nut allergy selected.");
        } else {
          if (!formFields.toppings.includes(value)) formFields.toppings.push(value);
        }
      } else {
        formFields.toppings = formFields.toppings.filter(t => normalize(t) !== value);
      }
      updateCurrentSelection();
      updatePriceTable();
    });
  });

  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendToChatbot();
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  attachListeners();
  syncFormFieldsWithUI();
  updateCurrentSelection();
  updatePriceTable();
});
