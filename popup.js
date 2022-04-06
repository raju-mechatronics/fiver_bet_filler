let state = { type: "qin", threshold: "2.5", total: 1000, datatype: 0 };
let filterData = [];

async function getapiParamsfromPage() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const response = await chrome.tabs.sendMessage(tab.id, { message: "url" });
  state = { ...state, ...response };
  init();
}

getapiParamsfromPage();

function getApiParams() {
  const apiParams = document.getElementById("apiParams");
  const date = apiParams?.querySelector('input[name="date"]').value;
  const venue = apiParams?.querySelector('input[name="venue"]').value;
  const raceno = apiParams?.querySelector('input[name="raceno"]').value;
  const type = apiParams?.querySelector('input[name="type"]').value;

  let params = { date, venue, raceno, type };
  state = { ...state, ...params };

  return {
    date,
    venue,
    raceno,
    type,
  };
}

function getFilterParams() {
  const filterDiv = document.getElementById("filter");
  const datatype = filterDiv?.querySelector('input[name="dataType"]').value;
  const total = filterDiv?.querySelector('input[name="total"]').value;
  const threshold = filterDiv?.querySelector('input[name="threshold"]').value;

  state = { ...state, datatype, total, threshold };
  return {
    datatype,
    total,
    threshold,
  };
}

function constructApiUrl(type) {
  let params = getApiParams();
  return `https://bet.hkjc.com/racing/getJSON.aspx?type=${
    type ? type : params.type
  }&date=${
    params.date
  }&venue=${params.venue.toUpperCase()}&raceno=${params.raceno.toLowerCase()}`;
}

function parseData({ OUT }) {
  let lines = OUT.split(";");
  lines.shift();
  return lines.map((line) => {
    const spline = line.split("=");
    const combo = spline[0];
    const value = spline[1];
    const datatype = spline[2];
    return { combo, value, datatype };
  });
}

function hasher() {
  return `${state.date}_${state.type}_${state.venue}_${state.raceno}`;
}

async function getJSON(type) {
  const url = constructApiUrl(type);
  let textData;
  try {
    const res = await fetch(constructApiUrl(), {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "cross-site",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrerPolicy: "same-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    });
    textData = await res.text();
  } catch (e) {
    textData = '{"OUT":""}';
  }
  let data = JSON.parse(textData);
  data = parseData(data);
  data = data.map((e) => {
    e.pool = type ? type : state.type;
    return e;
  });
  const typeset = [...new Set(data.map((e) => e.datatype))];
  if (typeset.length) {
    document.querySelector("#filterType").innerHTML = typeset
      .map(
        (e) =>
          `<button class="btn btn-sm btn-light fw-bold px-3 mx-2">${e}</button>`
      )
      .join("\n");
  }
  console.log(typeset);
  state = { ...state, data };
  if (data.length > 0) {
    chrome.storage.local.set({ [hasher()]: data });
  } else {
    data = await chrome.storage.local.get(hasher());
    data = data[hasher()];
    data = data?.length ? data : [];
  }
  console.log(data);
  state = { ...state, data };
  return data;
}

async function init() {
  const apiParams = document.getElementById("apiParams");

  apiParams.querySelector('input[name="date"]').value = state.date
    ? state.date
    : "";

  apiParams.querySelector('input[name="venue"]').value = state.venue
    ? state.venue
    : "";

  apiParams.querySelector('input[name="raceno"]').value = state.raceno
    ? state.raceno
    : "";
  apiParams.querySelector('input[name="type"]').value = state.type
    ? state.type
    : "";

  const filterDiv = document.getElementById("filter");

  filterDiv.querySelector('input[name="dataType"]').value = state.datatype
    ? state.datatype
    : 0;

  filterDiv.querySelector('input[name="total"]').value = state.total
    ? state.total
    : "";

  filterDiv.querySelector('input[name="threshold"]').value = state.threshold
    ? state.threshold
    : "";

  mapData();
}

async function filter() {
  let dtFilter = state.datatype;
  let data = state.data;
  if (data) {
    console.log(data);
    filterData = data.filter((e) => {
      if (!Number(e.value)) return false;
      return e.datatype == state.datatype;
    });
    console.log(filterData);
    filterData = filterData.map((e) => {
      let amount = Math.round(state.total / e.value);
      if (amount % 10) {
        amount = amount + 10;
      }
      amount = amount - (amount % 10);
      e.amount = amount ? amount : 10;
      return e;
    });
    return filterData;
  }
}

async function mapData() {
  console.log(await filter());
  let tableBody = filterData.map(
    (e) => `<tr>
            <td>${e.pool}</td>
            <td>${e.combo}</td>
            <td>${e.value}</td>
            <td>${e.datatype}</td>
            <td>${e.amount}</td>
          </tr>`
  );
  let sum = 0;
  filterData.forEach((c) => {
    sum += c.amount;
  });
  // @ts-ignore
  document.querySelector("tbody").innerHTML = tableBody.join("");

  const filterDiv = document.getElementById("filter");
  filterDiv.querySelector('input[name="sum"]').value = sum;
  filterDiv.querySelector('input[name="index"]').value = (
    state.total / sum
  ).toFixed(2);
  try {
    if (state.total / sum > state.threshold) {
      filterDiv.querySelector('input[name="index"]').style.background = "green";
    } else {
      filterDiv.querySelector('input[name="index"]').style.background =
        "lightgray";
    }
  } catch (e) {}
}

//event listners
document.querySelectorAll("input").forEach((e) => {
  e.addEventListener("input", (ev) => {
    getApiParams();
    getFilterParams();
    init();
  });
});

document.getElementById("apiStart").addEventListener("click", async (e) => {
  getJSON().then((e) => {
    init();
  });
});

document.getElementById("apiDel").addEventListener("click", async (e) => {
  await chrome.storage.local.remove(hasher());
  state.data = [];
  init();
});

document.getElementById("apiAdd").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      message: "fillForm",
      data: filterData,
    });
  });
});

document.getElementById("send").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: "send" });
  });
});

document.querySelector("#filterType").addEventListener("click", (e) => {
  console.log(e);
  if (e.target.nodeName === "BUTTON") state.datatype = e.target.innerText;
  init();
});

init();

document.getElementById("quick").addEventListener("click", async (event) => {
  let d1 = await getJSON("qin");
  let d2 = await getJSON("fct");
  state.data = [...d1, ...d2];
  console.log(state.data);
  const typeset = [...new Set(state.data.map((e) => e.datatype))];
  if (typeset.length) {
    document.querySelector("#filterType").innerHTML = typeset
      .map(
        (e) =>
          `<button class="btn btn-sm btn-light fw-bold px-3 mx-2">${e}</button>`
      )
      .join("\n");
  }
  init();
});
