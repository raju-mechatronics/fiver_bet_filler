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

async function send() {
  document.querySelector("#bsSendPreviewButton").click();
  await waitFor("#previewSend");
  // document.querySelector("#previewSend").click();
  // await wait(200);
  // await waitFor("#replyClose", 3000);
  // document.querySelector("#replyClose").click();
  // await wait(2500);
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

function isQIN() {
  return !!location.pathname.includes("odds_wpq");
}

function waitFor(selector, ms) {
  return new Promise((resolve) => {
    let interval;
    let t = 0;
    interval = setInterval(() => {
      if (document.querySelector(selector) || t >= ms) {
        clearInterval(interval);
        resolve();
      }
      t = t + 500;
    }, 500);
  });
}

async function addSingleBet({ combo, amount, pool }) {
  let { raceno } = await chrome.storage.local.get("raceno");
  const query = document.URL.split("?")[1].split("&");
  let params = {};
  query.forEach(function (e) {
    params[e.split("=")[0]] = e.split("=")[1];
  });
  if (params.raceno !== raceno) {
    document.getElementById(`raceSel${raceno}`)?.click();
    await wait(2000);
  }

  if (pool === "fct" && !isFCT()) {
    goToFCT();

    await waitFor('[for="fctS"]');
    await wait(1000);
  }

  if (pool === "qin" && !isQIN()) {
    goToQin();

    await waitFor(".legCheckbox input");
    await wait(1000);
  }

  if (pool === "fct") {
    if (!setComboFCT(combo)) return;
    await wait(5);

    setAmount(amount);
    await wait(5);
    add2Form();
  } else {
    if (!setCombo(combo)) return;
    if (!setType(pool)) return;
    setAmount(amount);
    await wait(5);
    add2Form();
  }
}

async function fillForm(data) {
  for (const datum of data) {
    await addSingleBet(datum);
    await wait(10);
  }
}

async function fillBatchForm(data) {
  let j = 0;
  for (let i = 0; i < data.length; i++) {
    if (j == 29) {
      j = 0;
      await send();
      await wait(100);
    }
    await addSingleBet(data[i]);
    await wait(2);
    j++;
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === "fillForm") {
    if (req.data.length > 30) {
      fillBatchForm(req.data);
      sendResponse();
    } else {
      fillForm(req.data);
      sendResponse();
    }
  }
  if (req.message === "send") {
    send();
    sendResponse();
  }
  if (req.message === "url") {
    const query = document.URL.split("?")[1].split("&");
    let params = {};
    query.forEach(function (e) {
      params[e.split("=")[0]] = e.split("=")[1];
    });
    sendResponse(params);
  }
});

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

function setComboFCT(combo) {
  const Checkbox1 = document.querySelectorAll(".bankerCheckbox input");
  const Checkbox2 = document.querySelectorAll(".legCheckbox input");
  const combos = combo.split("-").map((e) => Number(e) - 1);
  if (Checkbox1[combos[0]].disabled) {
    return false;
  }
  if (Checkbox2[combos[1]].disabled) {
    return false;
  }

  Checkbox1[combos[0]].click();
  Checkbox2[combos[1]].click();

  return true;
}

function setTypeSingle() {
  document.querySelector("#fctS").click();
}

let extClick = false;

function goToFCT() {
  document.querySelector("#oMenuODDS_FCT\\.ASPX").click();
  extClick = true;
}

function goToQin() {
  document
    .querySelector("#oMenuODDS_WPQ\\.ASPX\\,ODDS_WPQ_ALUP\\.ASPX")
    .click();
  extClick = true;
}
let prevURL = document.URL;

setInterval(function () {
  if (prevURL === document.URL) return;
  prevURL = document.URL;
  const query = document.URL.split("?")[1].split("&");
  let params = {};
  query.forEach(function (e) {
    params[e.split("=")[0]] = e.split("=")[1];
  });
  if (isFCT()) params.type = "fct";
  if (isQIN()) params.type = "qin";
  if (!extClick) {
    chrome.runtime.sendMessage({ message: "url", params });
  } else {
    extClick = false;
  }
}, 500);
