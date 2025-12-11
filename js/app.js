const API_URL =
  "https://getcandles-702357866222.northamerica-northeast1.run.app/";

let chartInitialized = false;
let lastCandleTime = null;

async function loadCandles() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return;

    const last60 = data.slice(-60);

    const times = last60.map(d => new Date(d.time || d.ts));
    const opens = last60.map(d => d.open);
    const highs = last60.map(d => d.high);
    const lows = last60.map(d => d.low);
    const closes = last60.map(d => d.close);

    lastCandleTime = times[times.length - 1];

    const nextTime = new Date(lastCandleTime.getTime() + 60 * 1000);

    const xTickVals = [...times, nextTime];
    const xTickTexts = [
      ...times.map(t =>
        t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      ),
      "current"
    ];

    const candleTrace = {
      x: times,
      open: opens,
      high: highs,
      low: lows,
      close: closes,
      type: "candlestick",
      increasing: { line: { color: "#22c55e" } },
      decreasing: { line: { color: "#ef4444" } },
      name: "BTC"
    };

    const liveTrace = {
      x: [nextTime],
      y: [closes[closes.length - 1]],
      text: [`$${closes[closes.length - 1].toLocaleString()}`],
      textposition: "top center",
      textfont: { color: "#ffffff", size: 12 },
      mode: "markers+text",
      marker: { size: 9, color: "#eab308" },
      name: "Live",
      showlegend: false
    };

    const layout = {
      paper_bgcolor: "#020617",
      plot_bgcolor: "#020617",
      xaxis: {
        title: "Last 60 minutes + current",
        tickmode: "array",
        tickvals: xTickVals,
        ticktext: xTickTexts,
        tickangle: -45,
        tickfont: { color: "#e5e7eb", size: 10 },
        gridcolor: "#1e293b",
        rangeslider: { visible: false }
      },
      yaxis: {
        title: "Price",
        tickfont: { color: "#e5e7eb" },
        gridcolor: "#1e293b"
      },
      margin: { l: 50, r: 20, t: 40, b: 80 },
      showlegend: false
    };

    const config = { responsive: true, displaylogo: false };

    if (!chartInitialized) {
      Plotly.newPlot("chart", [candleTrace, liveTrace], layout, config);
      chartInitialized = true;
    } else {
      Plotly.update(
        "chart",
        {
          x: [times],
          open: [opens],
          high: [highs],
          low: [lows],
          close: [closes]
        },
        {},
        [0]
      );

      Plotly.update(
        "chart",
        {
          x: [[nextTime]],
          y: [[closes[closes.length - 1]]],
          text: [[`$${closes[closes.length - 1].toLocaleString()}`]]
        },
        {},
        [1]
      );

      Plotly.relayout("chart", {
        "xaxis.tickvals": xTickVals,
        "xaxis.ticktext": xTickTexts
      });
    }

    const first = times[0];
    const last = times[times.length - 1];

    const startStr = first.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const endStr = last.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });

    document.getElementById("timeframe").textContent =
      `· window: ${startStr} – ${endStr} (60m)`;

    const dateFmt = last.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    document.getElementById("last-updated").textContent =
      `· last update: ${dateFmt} ${endStr}`;
  } catch (err) {
    console.error("Error loading candles:", err);
  }
}

loadCandles();
setInterval(loadCandles, 60000);

const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

ws.onmessage = (event) => {
  if (!chartInitialized || !lastCandleTime) return;

  const data = JSON.parse(event.data);
  const price = parseFloat(data.p);
  if (!Number.isFinite(price)) return;

  const nextTime = new Date(lastCandleTime.getTime() + 60 * 1000);

  Plotly.restyle(
    "chart",
    {
      x: [[nextTime]],
      y: [[price]],
      text: [[`$${price.toLocaleString()}`]],
      textfont: [{ color: "#ffffff", size: 12 }]
    },
    [1]
  );
};

ws.onerror = (e) => {
  console.error("WebSocket error:", e);
};

