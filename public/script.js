const tabRadios = document.querySelectorAll('input[name="tabs"]');

function updateTabTextColor() {
  tabRadios.forEach((tab) => {
    const label = tab.nextElementSibling;
    if (tab.checked) {
      tab.classList.remove("text-white");
    } else {
      tab.classList.add("text-white");
    }
  });
}

updateTabTextColor();

tabRadios.forEach((tab) => {
  tab.addEventListener("change", () => {
    updateTabTextColor();
  });
});

const API_BASE = "https://api.frankfurter.dev/v1";
let currencies = {},
  conversionHistory = [];
let ratesData = {};
let currentPage = 1;
const perPage = 5;
let historyPage = 1;
const historyPerPage = 5;

function loadHistoryFromStorage() {
  const saved = localStorage.getItem("conversionHistory");
  conversionHistory = saved ? JSON.parse(saved) : [];
  renderHistory();
}
function saveHistoryToStorage() {
  localStorage.setItem("conversionHistory", JSON.stringify(conversionHistory));
}

const loadCurrencies = async () => {
  try {
    currencies = await (await fetch(`${API_BASE}/currencies`)).json();
    populateCurrencySelects();
    loadPopularRates();
  } catch (e) {
    console.error("Error loading currencies:", e);
  }
};

const populateCurrencySelects = () => {
  const from = document.getElementById("fromCurrency");
  const to = document.getElementById("toCurrency");
  const options = Object.entries(currencies)
    .map(([c, n]) => `<option value="${c}">${c} - ${n}</option>`)
    .join("");
  const vals = [from.value, to.value];
  [from.innerHTML, to.innerHTML] = [options, options];
  [from.value, to.value] = vals;
};

const updateConvertButtonState = () => {
  const amountInput = document.getElementById("amount");
  const convertBtn = document.getElementById("convertBtn");
  const amount = parseFloat(amountInput.value);

  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    convertBtn.disabled = true;
  } else {
    convertBtn.disabled = false;
  }
};

const convertCurrency = async () => {
  const btn = document.getElementById("convertBtn");
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `<span class="loading loading-spinner loading-xs"></span>`;

  const from = document.getElementById("fromCurrency").value;
  const to = document.getElementById("toCurrency").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount");
    btn.disabled = false;
    btn.innerHTML = originalText;
    updateConvertButtonState();
    return;
  }

  if (from === to) {
    document.getElementById("result").textContent = amount.toFixed(2);
    document.getElementById("rate").textContent = `Rate: 1 ${from} = 1 ${to}`;
    btn.innerHTML = originalText;
    updateConvertButtonState();
    return;
  }

  try {
    const data = await (
      await fetch(`${API_BASE}/latest?base=${from}&symbols=${to}`)
    ).json();
    const rate = data.rates?.[to];
    if (!rate) throw new Error("Rate not found");
    const result = (amount * rate).toFixed(2);

    document.getElementById("result").textContent = result;
    document.getElementById(
      "rate"
    ).textContent = `Rate: 1 ${from} = ${rate.toFixed(4)} ${to}`;

    addToHistory(from, to, amount, result, rate);
  } catch (e) {
    console.error("Error converting:", e);
    document.getElementById("result").textContent = "Error";
    document.getElementById("rate").textContent = "Unable to fetch rate";
    alert("Error converting currency. Please try again.");
  } finally {
    btn.innerHTML = originalText;
    updateConvertButtonState();
  }
};

const swapCurrencies = () => {
  const [from, to] = [
    document.getElementById("fromCurrency"),
    document.getElementById("toCurrency"),
  ];
  [from.value, to.value] = [to.value, from.value];
  const amount = document.getElementById("amount").value;
  if (amount && parseFloat(amount) > 0) {
    convertCurrency();
  }
};

const addToHistory = (from, to, amount, result, rate) => {
  conversionHistory.unshift({
    from,
    to,
    amount,
    result,
    rate,
    timestamp: new Date().toLocaleString(),
  });
  if (conversionHistory.length > 10) conversionHistory.pop();
  renderHistory();
  saveHistoryToStorage();
};

let sortOrder = "latest";

document.getElementById("historySort").addEventListener("change", (e) => {
  sortOrder = e.target.value;
  renderHistory();
});

const renderHistory = () => {
  const history = document.getElementById("history");
  const pagination = document.getElementById("historyPagination");
  const pageIndicator = document.getElementById("historyPageIndicator");
  const prevBtn = document.getElementById("historyPrev");
  const nextBtn = document.getElementById("historyNext");

  if (!conversionHistory.length) {
    history.innerHTML =
      '<p class="text-gray-400 text-center py-8 text-sm sm:text-base">No conversion history yet</p>';
    pagination.classList.add("hidden");
    return;
  }

  const sortedHistory = [...conversionHistory];
  if (sortOrder === "latest") {
    sortedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    sortedHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  const totalPages = Math.ceil(sortedHistory.length / historyPerPage);
  if (historyPage > totalPages) historyPage = totalPages || 1;

  const start = (historyPage - 1) * historyPerPage;
  const end = start + historyPerPage;
  const pageItems = sortedHistory.slice(start, end);

  history.innerHTML = pageItems
    .map(
      (i) => `
        <div class="p-3 sm:p-4 bg-neutral-800 border-2 border-black
            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-200 ease-in-out
            hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            rounded-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
            
            <div class="flex items-start sm:items-center gap-3">
                <i data-lucide="arrow-right-left" class="w-5 h-5 text-white flex-shrink-0"></i>
                <div class="space-y-1">
                    <div class="font-semibold text-white break-words leading-tight">
                        ${i.amount} ${i.from} → ${i.result} ${i.to}
                    </div>
                    <div class="text-gray-300 text-[11px] sm:text-xs flex items-center gap-1">
                        <i data-lucide="clock" class="w-3 h-3"></i>${
                          i.timestamp
                        }
                    </div>
                </div>
            </div>

            <div class="text-gray-400 text-[11px] sm:text-sm text-left sm:text-right">
                Rate: ${i.rate.toFixed(4)}
            </div>
        </div>
    `
    )
    .join("");

  lucide.createIcons();

  if (totalPages > 1) {
    pagination.classList.remove("hidden");
    pageIndicator.textContent = `Page ${historyPage} / ${totalPages}`;
    prevBtn.disabled = historyPage === 1;
    nextBtn.disabled = historyPage === totalPages;
  } else {
    pagination.classList.add("hidden");
  }
};

document.getElementById("historyPrev").addEventListener("click", () => {
  if (historyPage > 1) {
    historyPage--;
    renderHistory();
  }
});

document.getElementById("historyNext").addEventListener("click", () => {
  const totalPages = Math.ceil(conversionHistory.length / historyPerPage);
  if (historyPage < totalPages) {
    historyPage++;
    renderHistory();
  }
});

const loadPopularRates = async () => {
  const base = "USD";
  try {
    const data = await (await fetch(`${API_BASE}/latest?base=${base}`)).json();
    ratesData = data.rates;
    currentPage = 1;
    renderPopularRates(base);
  } catch (e) {
    console.error("Error loading rates:", e);
    document.getElementById("popularRates").innerHTML =
      '<p class="text-red-500 text-sm text-center">Failed to load rates</p>';
  }
};

function renderPopularRates(base) {
  const container = document.getElementById("popularRates");
  const keys = Object.keys(ratesData);
  const totalPages = Math.ceil(keys.length / perPage);

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageKeys = keys.slice(start, end);

  container.innerHTML = pageKeys
    .map(
      (c) => `
        <div class="flex justify-between btn btn-sm text-xs items-center p-3 bg-neutral-800 border-2 border-black
            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-200 ease-in-out
            hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px] rounded-none"
            onclick="quickSetCurrency('${base}','${c}')">
            <div class="flex items-center gap-2">
                <i data-lucide="arrow-right" class="w-4 h-4 text-gray-400"></i>
                <span class="font-semibold text-gray-200">${base}/${c}</span>
            </div>
            <span class="text-white font-bold">${ratesData[c].toFixed(4)}</span>
        </div>
    `
    )
    .join("");

  document.getElementById(
    "pageIndicator"
  ).textContent = `Page ${currentPage} / ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
  lucide.createIcons();
}

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPopularRates("USD");
  }
});
document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(Object.keys(ratesData).length / perPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPopularRates("USD");
  }
});

const quickSetCurrency = (from, to) => {
  document.getElementById("fromCurrency").value = from;
  document.getElementById("toCurrency").value = to;
  const amount = document.getElementById("amount").value;
  if (amount && parseFloat(amount) > 0) {
    convertCurrency();
  }
  document.getElementById("tab-main").checked = true;
};

document
  .getElementById("convertBtn")
  .addEventListener("click", convertCurrency);
document.getElementById("swapBtn").addEventListener("click", swapCurrencies);

document
  .getElementById("amount")
  .addEventListener("input", updateConvertButtonState);

document.getElementById("amount").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const amount = parseFloat(e.target.value);
    if (amount && amount > 0) {
      convertCurrency();
    }
  }
});

document.getElementById("fromCurrency").addEventListener("change", () => {
  const amount = document.getElementById("amount").value;
  if (amount && parseFloat(amount) > 0) {
    convertCurrency();
  }
});

document.getElementById("toCurrency").addEventListener("change", () => {
  const amount = document.getElementById("amount").value;
  if (amount && parseFloat(amount) > 0) {
    convertCurrency();
  }
});

document.getElementById("clearHistory").addEventListener("click", () => {
  document.getElementById("confirmClearModal").showModal();
});

document.getElementById("confirmClearBtn").addEventListener("click", () => {
  conversionHistory = [];
  renderHistory();
  saveHistoryToStorage();

  document.getElementById("confirmClearModal").close();
});

window.quickSetCurrency = quickSetCurrency;
loadCurrencies();
loadHistoryFromStorage();
setInterval(loadPopularRates, 60000);
lucide.createIcons();

updateConvertButtonState();