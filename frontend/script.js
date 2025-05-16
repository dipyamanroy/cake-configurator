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
    // Before sending to chatbot, capture the current form state
    const currentFormState = { ...formFields };
    // Also capture current UI state to ensure nothing is lost
    const uiFormState = getSelectedValues();

    const response = await fetch("https://t0md0m3g-3001.inc1.devtunnels.ms/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input,
        currentState: currentFormState // Send current state to API
      }),
    });

    const result = await response.json();

    const formData = result.data || {};
    const reply = result.reply || "Got it! Updated the form.";

    // Merge the new data with existing form state
    // Instead of reassigning, update property by property
    formFields.cakeType = formData.cakeType ?? currentFormState.cakeType;
    formFields.flavor = formData.flavor ?? currentFormState.flavor;
    formFields.decor = formData.decor ?? currentFormState.decor;
    formFields.size = formData.size ?? currentFormState.size;
    formFields.layers = formData.layers ?? currentFormState.layers;
    formFields.filling = formData.filling ?? currentFormState.filling;
    formFields.icing = formData.icing ?? currentFormState.icing;
    formFields.weddingStyle = formData.weddingStyle ?? currentFormState.weddingStyle;

    // Special handling for allergies - check for nut conflicts
    if (formData.allergies === 'nuts') {
      // If selecting nut allergy, filter out nut-related toppings
      formFields.allergies = 'nuts';
      formFields.toppings = (currentFormState.toppings || []).filter(topping =>
        !['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(normalize(topping))
      );
    } else {
      formFields.allergies = formData.allergies ?? currentFormState.allergies;
    }

    if (Array.isArray(formData.toppings)) {
      // If allergies is set to nuts, filter out nut toppings
      if (formFields.allergies === 'nuts') {
        formFields.toppings = formData.toppings.filter(topping =>
          !['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(normalize(topping))
        );
      } else {
        formFields.toppings = formData.toppings;
      }
    }

    // Safety check: Use UI state as fallback for any nullified fields
    Object.keys(formFields).forEach(key => {
      if (formFields[key] === null && uiFormState[key] && uiFormState[key] !== '') {
        formFields[key] = uiFormState[key];
      }
    });

    // Ensure toppings array is always valid
    if (!Array.isArray(formFields.toppings)) {
      formFields.toppings = [];
    }

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

// Add allergy change handler to check for conflicts
document.getElementById("allergies").addEventListener("change", (e) => {
  const allergyValue = normalize(e.target.value);
  formFields.allergies = allergyValue;

  // If nut allergy selected, remove nut toppings
  if (allergyValue === 'nuts') {
    formFields.toppings = formFields.toppings.filter(topping =>
      !['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(normalize(topping))
    );
  }

  updateForm();
});

// Add these listeners for the other form fields right after the above code
document.getElementById("flavor").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.flavor = value;
  updateForm();
});

document.getElementById("size").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.size = value;
  updateForm();
});

document.getElementById("layers").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.layers = value;
  updateForm();
});

document.getElementById("filling").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.filling = value;
  updateForm();
});

document.getElementById("icing").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.icing = value;
  updateForm();
});

document.getElementById("weddingStyle").addEventListener("change", (e) => {
  const value = normalize(e.target.value);
  formFields.weddingStyle = value;
  updateForm();
});

// Add handler for topping checkboxes
document.querySelectorAll('.topping').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const value = normalize(e.target.value);

    if (e.target.checked) {
      // When adding a topping
      if (formFields.allergies === 'nuts' &&
        ['nuts', 'almonds', 'walnuts', 'pecans', 'peanuts'].includes(value)) {
        // Prevent adding nut toppings with nut allergy
        e.target.checked = false;
        alert("Cannot add nut toppings with a nut allergy selected.");
      } else {
        // Add to toppings if not already included
        if (!formFields.toppings.map(normalize).includes(value)) {
          formFields.toppings.push(value);
        }
      }
    } else {
      // When removing a topping
      formFields.toppings = formFields.toppings.filter(t => normalize(t) !== value);
    }

    updateCurrentSelection();
    updatePriceTable();
  });
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

// Update formFields from UI on initialization to ensure consistency
function syncFormFieldsWithUI() {
  const uiState = getSelectedValues();
  Object.keys(uiState).forEach(key => {
    if (uiState[key] !== null && uiState[key] !== '') {
      formFields[key] = uiState[key];
    }
  });
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
  syncFormFieldsWithUI(); // Sync form fields with UI state initially
  updateCurrentSelection();
  updatePriceTable();
});
