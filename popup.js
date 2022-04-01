let state = {};
let filterData = [];

function getApiParams() {
  const apiParams = document.getElementById("apiParams");
  const date = apiParams?.querySelector('input[name="date"]').value;
  const venue = apiParams?.querySelector('input[name="venue"]').value;
  const raceno = apiParams?.querySelector('input[name="raceno"]').value;
  const type = apiParams?.querySelector('input[name="type"]').value;

  let params = { date, venue, raceno, type };
  state = {...state, ...params}
  chrome.storage.local.set({ state });

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
  chrome.storage.local.set({ state });
  return {
    datatype,
    total,
    threshold,
  };
}

function constructApiUrl() {
  let params = getApiParams();
  return `https://bet.hkjc.com/racing/getJSON.aspx?type=${params.type}&date=${params.date}&venue=${params.venue}&raceno=${params.raceno}`;
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

async function getJSON() {
  const url = constructApiUrl();
  const res = await fetch(url);
  const textData = await res.text();
  const data = JSON.parse(textData);
  state = { ...state, data };
  chrome.storage.local.set({ state });
  return data;
}

async function init() {
  chrome.storage.local.get(null, (e) => {
    state = e ? e["state"] : {};

    const apiParams = document.getElementById("apiParams");
    apiParams.querySelector('input[name="date"]').value = state?.date;

    apiParams.querySelector('input[name="venue"]').value = state?.venue;

    apiParams.querySelector('input[name="raceno"]').value = state?.raceno;
    apiParams.querySelector('input[name="type"]').value = state?.type;

    const filterDiv = document.getElementById("filter");

    filterDiv.querySelector('input[name="dataType"]').value = state?.datatype;

    filterDiv.querySelector('input[name="total"]').value = state?.total;

    filterDiv.querySelector('input[name="threshold"]').value = state?.threshold;

    mapData();
  });
}

async function filter() {
  let dtFilter = state.datatype;
  let data = state.data;
  if (data) {
    data = parseData(data);
    console.log(data);
    filterData = data.filter((e) => e.datatype == state.datatype);
    console.log(filterData);
    filterData = filterData.map((e) => {
      let amount = Math.round(state.total / e.value);
      amount = amount - (amount % 10);
      e.amount = amount?amount:0;
      e.pool = state.type;
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
  filterDiv.querySelector('input[name="index"]').value = Math.round(
    state.total / sum
  );
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

init();
