
// Example of storing fetched data
let chartDataStore = {}; // A global variable to store fetched chart data


// Assume this function is called when data is initially fetched
function storeChartData(pair, ohlcvData) {

    chartDataStore[pair] = ohlcvData;
}


function generateSimpleLiteChart(pair, ohlcvData) {
    const chartDiv = document.getElementById(`screener_chart_${pair}`);

    const timestamps = ohlcvData.map(entry => new Date(entry.timestamp));
    const closes = ohlcvData.map(entry => entry.close);

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

function generateFullChart(pair, ohlcvData, smaPeriod = null, emaPeriod = null){
    smaPeriod = smaPeriod || parseInt(document.getElementById('smaPeriodInput').value, 10) || 5;
    emaPeriod = emaPeriod || parseInt(document.getElementById('emaPeriodInput').value, 10) || 20;



    const chartDiv = document.getElementById(`watcher_chart_${pair}`);

    // Convert timestamps to index for x-axis
    const xData = ohlcvData.map((_, index) => index);
    
    const opens = ohlcvData.map(entry => entry.open);
    const highs = ohlcvData.map(entry => entry.high);
    const lows = ohlcvData.map(entry => entry.low);
    const closes = ohlcvData.map(entry => entry.close);

    

    // Simple Moving Average calculations
    const sma = calculateSMA(closes, smaPeriod);

    // Exponential Moving Average calculation
    const ema = calculateEMA(closes, emaPeriod); // Using 20 periods for EMA

    const candlestickTrace = {
        type: 'candlestick',
        x: xData, // Use indexing instead of timestamps
        open: opens,
        high: highs,
        low: lows,
        close: closes
    };

    const smaTrace = {
        x: xData, // Use indexing
        y: sma,
        mode: 'lines',
        name: 'SMA',
        line: { color: 'orange', width: 1 }
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

    Plotly.newPlot(chartDiv, [candlestickTrace, smaTrace, emaTrace], layout);
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



