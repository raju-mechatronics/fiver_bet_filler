function setCombo(combo) {
  const comboCheckbox = document.querySelectorAll(".legCheckbox input");
  const combos = combo.split("-").map((e) => Number(e) - 1);
  combos.forEach((combo) => {
    if (!comboCheckbox[combo] || comboCheckbox[combo].disabled) {
      return false;
    }
  });
  combos.forEach((com) => {
    comboCheckbox[com].click();
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

function isFCT() {
  return !!location.pathname.includes("FCT");
}

async function addSingleBet({ combo, amount, pool }) {
  if (isFCT()) {
  }

  if (!setCombo(combo)) return;
  if (!setType(pool)) return;
  setAmount(amount);
  await wait(10);
  add2Form();
}

async function fillForm(data) {
  console.log(data);
  for (const datum of data) {
    console.log(datum);
    addSingleBet(datum);
    await wait(10);
  }
}

async function fillBatchForm(data) {
  let j = 0;
  for (let i = 0; i < data.length; i++) {
    if (j == 29) {
      j = 0;
      send();
      await wait(1000);
    }
    addSingleBet(data[i]);
    await wait(10);
    j++;
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === "fillForm") {
    if (req.data.length > 30) {
      fillBatchForm(req.data);
    } else fillForm(req.data);
  }
  if (req.message === "send") {
    send();
  }
  if (req.message === "url") {
    console.log(document.url);
    const query = document.URL.split("?")[1].split("&");
    let params = {};
    query.forEach(function (e) {
      params[e.split("=")[0]] = e.split("=")[1];
    });
    sendResponse(params);
  }
});

console.log("running");

let extensionOrigin = "chrome-extension://" + chrome.runtime.id;
if (!location.ancestorOrigins.contains(extensionOrigin)) {
  let iframe = document.createElement("iframe");
  // Must be declared at web_accessible_resources in manifest.json
  iframe.src = chrome.runtime.getURL("popup.html");
  // Some styles for a fancy sidebar
  iframe.style.cssText =
    "position:fixed;top:0;right:0;display:block;" +
    "width:680px;height:100%;z-index:1000;";
  document.body.appendChild(iframe);
}
