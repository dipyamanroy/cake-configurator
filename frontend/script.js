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

  // Dropdowns to update
  const dropdowns = [
    "cakeType", "flavor", "decor", "size", "layers",
    "filling", "icing", "weddingStyle", "allergies"
  ];

  dropdowns.forEach((key) => {
    const el = document.getElementById(key);
    if (el && formFields[key] != null) {
      const normalizedValue = normalize(formFields[key]) || "";
      if (el.value !== normalizedValue) {
        el.value = normalizedValue;
        // Trigger change event so listeners update UI properly
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Toppings (checkboxes)
  const normalizedToppings = (formFields.toppings || []).map(normalize);
  document.querySelectorAll(".topping").forEach((cb) => {
    const shouldBeChecked = normalizedToppings.includes(normalize(cb.value));
    if (cb.checked !== shouldBeChecked) {
      cb.checked = shouldBeChecked;
      // Trigger change event for checkboxes too
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Conditional rendering for wedding style
  const weddingStyleWrapper = document.getElementById("weddingStyleWrapper");
  if (normalize(formFields.cakeType) === "wedding") {
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

  // Example mapping logic for cake images
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

  updateCurrentSelection();
  updatePriceTable();
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
    const response = await fetch("api/chat", {
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

// Utility: format price as $x.xx
function formatPrice(num) {
  return `$${num.toFixed(2)}`;
}

// Get selected values from form
function getSelectedValues() {
  const cakeType = document.getElementById("cakeType").value || null;
  const size = document.getElementById("size").value || null;
  const layers = document.getElementById("layers").value || null;
  const flavor = document.getElementById("flavor").value || null;
  const filling = document.getElementById("filling").value || null;
  const icing = document.getElementById("icing").value || null;
  const weddingStyle = document.getElementById("weddingStyle").value || null;
  const allergies = document.getElementById("allergies").value || null;

  // Collect toppings from checkboxes
  const toppingsEls = document.querySelectorAll(".topping:checked");
  const toppings = Array.from(toppingsEls).map((el) => el.value);

  return {
    cakeType,
    size,
    layers,
    flavor,
    filling,
    icing,
    toppings,
    weddingStyle: cakeType === "wedding" ? weddingStyle : null,
    allergies,
  };
}

// Update Current Selection display
function updateCurrentSelection() {
  const selection = getSelectedValues();

  document.getElementById("spec-type").textContent = selection.cakeType || "Not selected";
  document.getElementById("spec-size").textContent = selection.size || "Not selected";
  document.getElementById("spec-flavor").textContent = selection.flavor || "Not selected";

  // Show/hide wedding style dropdown
  document.getElementById("weddingStyleWrapper").style.display =
    selection.cakeType === "wedding" ? "block" : "none";
}

// Calculate price based on selection (simple example pricing)
function calculatePrice(selection) {
  let total = 0;
  const breakdown = [];

  // Prices for types
  const typePrices = {
    birthday: 20,
    wedding: 50,
    cupcake: 10,
  };
  if (selection.cakeType && typePrices[selection.cakeType]) {
    breakdown.push({ label: `Cake Type (${selection.cakeType})`, price: typePrices[selection.cakeType] });
    total += typePrices[selection.cakeType];
  }

  // Prices for size
  const sizePrices = {
    small: 10,
    medium: 20,
    large: 30,
    tiered: 50,
  };
  if (selection.size && sizePrices[selection.size]) {
    breakdown.push({ label: `Size (${selection.size})`, price: sizePrices[selection.size] });
    total += sizePrices[selection.size];
  }

  // Price per layer ($5 per layer)
  if (selection.layers) {
    const layerCount = parseInt(selection.layers, 10) || 0;
    const layerPrice = layerCount * 5;
    breakdown.push({ label: `Layers (${layerCount})`, price: layerPrice });
    total += layerPrice;
  }

  // Price for filling
  const fillingPrices = {
    none: 0,
    cream: 5,
    jam: 5,
    ganache: 7,
  };
  if (selection.filling && fillingPrices[selection.filling] !== undefined) {
    breakdown.push({ label: `Filling (${selection.filling})`, price: fillingPrices[selection.filling] });
    total += fillingPrices[selection.filling];
  }

  // Price for icing
  const icingPrices = {
    buttercream: 5,
    fondant: 10,
    "chocolate glaze": 7,
  };
  if (selection.icing && icingPrices[selection.icing] !== undefined) {
    breakdown.push({ label: `Icing (${selection.icing})`, price: icingPrices[selection.icing] });
    total += icingPrices[selection.icing];
  }

  // Price per topping ($2 each)
  if (selection.toppings && selection.toppings.length > 0) {
    const toppingCount = selection.toppings.length;
    const toppingPrice = toppingCount * 2;
    breakdown.push({ label: `Toppings (${selection.toppings.join(", ")})`, price: toppingPrice });
    total += toppingPrice;
  }

  // Wedding style surcharge (if wedding)
  const weddingStylePrices = {
    classic: 10,
    romantic: 15,
    modern: 20,
  };
  if (selection.cakeType === "wedding" && selection.weddingStyle && weddingStylePrices[selection.weddingStyle] !== undefined) {
    breakdown.push({ label: `Wedding Style (${selection.weddingStyle})`, price: weddingStylePrices[selection.weddingStyle] });
    total += weddingStylePrices[selection.weddingStyle];
  }

  // Allergies surcharge (if any except none)
  const allergiesPrices = {
    none: 0,
    nuts: 5,
    gluten: 5,
    dairy: 5,
  };
  if (selection.allergies && allergiesPrices[selection.allergies] !== undefined) {
    breakdown.push({ label: `Allergies (${selection.allergies})`, price: allergiesPrices[selection.allergies] });
    total += allergiesPrices[selection.allergies];
  }

  return { total, breakdown };
}

// Update price table display
function updatePriceTable() {
  const selection = getSelectedValues();
  const priceContainer = document.getElementById("price-table-container");
  const { total, breakdown } = calculatePrice(selection);

  if (breakdown.length === 0) {
    priceContainer.innerHTML = "<p>No selections yet to price.</p>";
    return;
  }

  priceContainer.innerHTML = `
    <table class="price-table" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left; border-bottom: 1px solid #ccc;">Item</th>
          <th style="text-align:right; border-bottom: 1px solid #ccc;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${breakdown
          .map(
            (item) =>
              `<tr>
                <td style="padding:4px 8px;">${item.label}</td>
                <td style="padding:4px 8px; text-align:right;">${formatPrice(item.price)}</td>
              </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td style="font-weight:bold; padding:4px 8px; border-top: 1px solid #ccc;">Total</td>
          <td style="font-weight:bold; padding:4px 8px; text-align:right; border-top: 1px solid #ccc;">${formatPrice(total)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

// Attach listeners to all inputs to update UI on change
function attachListeners() {
  const inputs = document.querySelectorAll(
    "#cakeType, #size, #layers, #flavor, #filling, #icing, #weddingStyle, #allergies, .topping"
  );

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateCurrentSelection();
      updatePriceTable();
    });
  });
}

// Initialize on DOM ready
window.addEventListener("DOMContentLoaded", () => {
  attachListeners();
  updateCurrentSelection();
  updatePriceTable();
});
