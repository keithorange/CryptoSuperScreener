
// Updates the sort indicator based on the current sort direction
function updateSortIndicator(columnIndex, direction) {
    var indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach(function(indicator, index) {
        indicator.innerHTML = index === columnIndex ? (direction === 'asc' ? '▼' : '▲') : '▼';
    });
}
// Sorts table columns
function sortTable(n) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("cryptoTable");
    switching = true;
    dir = "asc";

    while (switching) {
        switching = false;
        rows = table.rows;

        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];

            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }
        }

        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else if (switchcount == 0 && dir == "asc") {
            dir = "desc";
            switching = true;
        }
        updateSortIndicator(n, dir); // Update sort indicator direction
    }
}



function generateSimpleLiteChart(pair, ohlcvData) {
    const chartDiv = document.getElementById(`screener_chart_${pair}`);
    console.log('chartDiv', chartDiv);
    console.log('ohlcvData', ohlcvData);
    const timestamps = ohlcvData.map(entry => new Date(entry.timestamp));
    const closes = ohlcvData.map(entry => entry.close);
    console.log('timestamps', timestamps);
    console.log('closes', closes);
    const trace = {
        x: timestamps,
        y: closes,
        mode: 'lines',
        line: {color: '#17BECF'}, // Set line color
    };

    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 }, // Remove margin
        xaxis: { visible: false }, // Hide X axis
        yaxis: { visible: false }, // Hide Y axis
        showlegend: false, // Hide legend
    };

    Plotly.newPlot(chartDiv, [trace], layout);
}
function generateFullChart(pair, ohlcvData) {
    const chartDiv = document.getElementById(`watcher_chart_${pair}`);

    // Convert timestamps to index for x-axis
    const xData = ohlcvData.map((_, index) => index);
    
    const opens = ohlcvData.map(entry => entry.open);
    const highs = ohlcvData.map(entry => entry.high);
    const lows = ohlcvData.map(entry => entry.low);
    const closes = ohlcvData.map(entry => entry.close);

    // Simple Moving Average calculations
    const sma5 = calculateSMA(closes, 5);
    const sma20 = calculateSMA(closes, 20);

    // Exponential Moving Average calculation
    const ema = calculateEMA(closes, 20); // Using 20 periods for EMA

    const candlestickTrace = {
        type: 'candlestick',
        x: xData, // Use indexing instead of timestamps
        open: opens,
        high: highs,
        low: lows,
        close: closes
    };

    const sma5Trace = {
        x: xData, // Use indexing
        y: sma5,
        mode: 'lines',
        name: 'SMA 5',
        line: { color: 'orange', width: 1 }
    };

    const sma20Trace = {
        x: xData, // Use indexing
        y: sma20,
        mode: 'lines',
        name: 'SMA 20',
        line: { color: 'green', width: 1 }
    };

    const emaTrace = {
        x: xData, // Use indexing
        y: ema,
        mode: 'lines',
        name: 'EMA',
        line: { color: 'purple', width: 2 }
    };

    const layout = {
        margin: { l: 40, r: 40, b: 30, t: 30 }, // Adjusted margins
        xaxis: {
            visible: true,
            showgrid: false,
            showticklabels: false, // Turn off tick labels for x-axis
            tickfont: {
                size: 8 // Smaller font size for tick labels
            },
            rangeslider: { visible: false } // Hide the range slider
        },
        yaxis: {
            visible: true,
            showgrid: true,
            showticklabels: true,
            tickfont: {
                size: 8 // Smaller font size for tick labels
            },
            //tickformat: '$,.2f' // Format for currency, two decimal places
        },
        showlegend: false, // Hide legend
        dragmode: 'zoom', // Allow users to zoom
        plot_bgcolor: '#f3f3f3', // Background color for the plot
        paper_bgcolor: '#f3f3f3', // Background color for the outside area
    };

    Plotly.newPlot(chartDiv, [candlestickTrace, sma5Trace, sma20Trace, emaTrace], layout);
}

// Utility function to calculate SMA
function calculateSMA(data, window) {
    let sma = data.map((_, idx, arr) => {
        if (idx < window - 1) return null; // not enough data points
        return arr.slice(idx - window + 1, idx + 1).reduce((acc, val) => acc + val, 0) / window;
    });
    return sma;
}

// Utility function to calculate EMA
// Note: This is a simplified version and might not be as accurate as more complex implementations
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let emaArray = [data[0]]; // Starting EMA value is the first price

    for (let i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }

    return emaArray;
}



