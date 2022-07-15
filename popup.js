let state = {
  type: "qin",
  threshold: "2.5",
  total: 1000,
  datatype: ["0", "1"],
  qin: 60,
  fct: 80,
};

let excludeAdded = false;

let filterData = [];

async function getapiParamsfromPage() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const response = await chrome.tabs.sendMessage(tab.id, { message: "url" });
  state = { ...state, ...response };
  chrome.storage.local.get(hasher()).then((data) => {
    data = data[hasher()];
    data = data?.length ? data : [];
    state = { ...state, data };
    init();
  });
}

getapiParamsfromPage();

function getApiParams() {
  const apiParams = document.getElementById("apiParams");
  const date = apiParams?.querySelector('input[name="date"]').value;
  const venue = apiParams?.querySelector('input[name="venue"]').value;
  const raceno = apiParams?.querySelector('input[name="raceno"]').value;
  const type = apiParams?.querySelector('input[name="type"]').value;

  let params = { date, venue, raceno, type };
  chrome.storage.local.set({ raceno });
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
  let t = filterDiv?.querySelector('input[name="dataType"]').value;
  t = t.split(",").filter((e) => e);

  let datatype = t;
  const total = filterDiv?.querySelector('input[name="total"]').value;
  const threshold = filterDiv?.querySelector('input[name="threshold"]').value;
  const qin = document.getElementById("qin_filter").value;
  const fct = document.getElementById("fct_filter").value;

  state = { ...state, datatype, total, threshold, qin, fct };

  return {
    datatype,
    total,
    threshold,
    qin,
    fct,
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
    e.id = makeId();
    return e;
  });
  state = { ...state, data };
  if (data.length > 0) {
    chrome.storage.local.set({ [hasher()]: data });
  } else {
    data = await chrome.storage.local.get(hasher());
    data = data[hasher()];
    data = data?.length ? data : [];
  }

  state = { ...state, data };
  return data;
}

function markSelectedBtn() {
  let el = document.querySelector("#filterType").children;
  for (let i = 0; i < el.length; i++) {
    if (state.datatype.includes(el[i].innerText)) {
      el[i].className = "btn bg-success";
    } else {
      el[i].className = "btn";
    }
  }
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

  filterDiv.querySelector('input[name="dataType"]').value =
    state.datatype.join(",");

  filterDiv.querySelector('input[name="total"]').value = state.total
    ? state.total
    : "";

  filterDiv.querySelector('input[name="threshold"]').value = state.threshold
    ? state.threshold
    : "";
  document.querySelector("#qin_filter").value = state.qin;
  document.querySelector("#fct_filter").value = state.fct;

  let len = filterData.length ? filterData.length : 0;
  document.querySelector("#apiAdd").innerText = "Add(" + len.toString() + ")";

  mapData();
  markSelectedBtn();
}

async function filter() {
  let dtFilter = state.datatype;
  let data = state.data;
  if (data) {
    filterData = data.filter((e) => {
      if (!Number(e.value)) return false;
      let typematch = state.datatype.includes(e.datatype);
      let qinMatch = e.pool === "qin" && Number(e.value) <= Number(state.qin);
      let fctMatch = e.pool === "fct" && Number(e.value) <= Number(state.fct);

      return (
        typematch && (qinMatch || fctMatch) && (excludeAdded ? !e.added : true)
      );
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

document.querySelector("table").addEventListener("click", function (e) {
  if (e.target.type === "checkbox") {
    if (e.target.id === "exclude") {
      excludeAdded = e.target.checked;
      filter().then((e) => init());
    } else {
      chrome.storage.local.get(hasher()).then((d) => {
        let datas = d[hasher()].map((c) => {
          if (c.id === e.target.id) {
            c.added = e.target.checked;
          }
          return c;
        });
        chrome.storage.local.set({ [hasher()]: datas });
      });
    }
  }
});

async function mapData() {
  let tableBody = filterData.map(
    (e) => `<tr>
            <td><input type="checkbox" ${e.added ? "checked" : ""} id=${
      e.id
    } ></td>
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
    chrome.storage.local.get(hasher()).then((data) => {
      data = data[hasher()];
      data = data?.length ? data : [];
      state = { ...state, data };
      filter().then((e) => init());
    });
  });
});

document.getElementById("apiStart").addEventListener("click", async (e) => {
  getJSON().then((e) => {
    filter().then((e) => init());
  });
});

document.getElementById("apiDel").addEventListener("click", async (e) => {
  await chrome.storage.local.remove(hasher());
  state.data = [];
  filter().then((e) => init());
});

document.getElementById("apiAdd").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let data = filterData.splice(0, 30);

    init();
    chrome.tabs.sendMessage(tabs[0].id, {
      message: "fillForm",
      data: data,
    });
    chrome.storage.local.get(hasher()).then((d) => {
      let rows = d[hasher()];
      let dataid = data.map((p) => p.id);
      rows = rows.map((o) => {
        if (dataid.includes(o.id)) {
          o.added = true;
        }
        return o;
      });
      chrome.storage.local.set({ [hasher()]: rows });
    });
  });
});

document.getElementById("send").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: "send" });
  });
});

document.querySelector("#filterType").addEventListener("click", (e) => {
  if (e.target.nodeName === "BUTTON") {
    if (state.datatype.includes(e.target.innerText)) {
      state.datatype = state.datatype.filter((h) => h !== e.target.innerText);
    } else {
      state.datatype = [...new Set([...state.datatype, e.target.innerText])];
    }
  }
  filter().then((e) => init());
});

init()
  .then((e) => filter())
  .then((e) => init());

document.getElementById("quick").addEventListener("click", async (event) => {
  document.querySelector('[name="type"]').value = "qin";
  let d1 = await getJSON();
  document.querySelector('[name="type"]').value = "fct";
  let d2 = await getJSON();
  document.querySelector('[name="type"]').value = "qin";
  state.data = [...d1, ...d2];
  filter().then((e) => init());
});

chrome.runtime.onMessage.addListener((req, c, d) => {
  if (req.message === "url") {
    state = { ...state, ...req.params };
    chrome.storage.local.get(hasher()).then((data) => {
      data = data[hasher()];
      data = data?.length ? data : [];
      state = { ...state, data };
      filter().then((e) => init());
    });
  }
  d();
});

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function makeId() {
  return "id" + Math.random().toString(16).slice(2);
}

wait(1000).then((e) => {
  getApiParams();
  getFilterParams();
  chrome.storage.local.get(hasher()).then((data) => {
    data = data[hasher()];
    data = data?.length ? data : [];
    state = { ...state, data };
    filter().then((e) => init());
  });
});
// chrome.storage.local.get(null, (e) => {
//   for (let s in e) {
//     try {
//       for (let p of e[s]) {
//         p.id = makeId();
//       }
//     } catch (t) {}
//   }
//   chrome.storage.local.set(e);
// });
