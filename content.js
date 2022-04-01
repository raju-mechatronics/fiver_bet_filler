function setCombo(combo) {
  const comboCheckbox = document.querySelectorAll(".legCheckbox input");
  const combos = combo.split("+").map((e) => Number(e) - 1);
  combos.forEach((combo) => {
    if (!comboCheckbox[combo] || comboCheckbox[combo].disabled) {
      return false;
    }
  });
  combos.forEach((combo) => {
    comboCheckbox[combo].click();
  });
  return true;
}

function add2Form() {
  document.querySelector(".rsAddBet").click();
}

function send() {
  document.querySelector("#bsSendPreviewButton").click();
}

function setAmount(amount) {
  const amountField = document.querySelector(".rsInvCalUnitBetInput");
  amountField.value = amount;
}

function setType(type) {
  const typeInputs = document.querySelectorAll('[name="wpqRadio"]');
  let selected = false;
  typeInputs.forEach((el) => {
    if (el.value.toLowerCase().trim() === type.toLowerCase().trim()) {
      el.click();
      selected = true;
    }
  });
  return selected;
}

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function addSingleBet({ combo, amount, pool }) {
  if (!setCombo(combo)) return;
  if (!setType(pool)) return;
  setAmount(amount);
  await wait(10);
  add2Form();
}

async function fillForm(data) {
  for (const datum in data) {
    addSingleBet(datum);
    await wait(10);
  }
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.message === "fillForm") {
    fillForm(req.data);
  }
  if (req.message === "send") {
    send();
  }
});
