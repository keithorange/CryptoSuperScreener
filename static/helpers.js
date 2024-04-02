

function generateSimpleLiteChart(pair, ohlcvData) {
    const chartDiv = document.getElementById(`screener_chart_${pair}`);

    const timestamps = ohlcvData.map(entry => new Date(entry.timestamp));
    const closes = ohlcvData.map(entry => entry.close);

    const trace = {
        x: timestamps,
        y: closes,
        mode: 'lines', // Keep it simple with just lines, no markers
        line: {
            color: 'orange', // Set line color to orange
            width: 2, // Increase line width for better visibility
        },
        hoverinfo: 'none' // Disable hover tooltips
    };

    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 }, // Remove margin
        xaxis: { visible: false }, // Hide X axis
        yaxis: { visible: false }, // Hide Y axis
        showlegend: false, // Hide legend
        plot_bgcolor: 'rgba(0,0,0,0)', // Set plot background to transparent
        paper_bgcolor: 'rgba(0,0,0,0)', // Set paper background to transparent
    };

    Plotly.newPlot(chartDiv, [trace], layout);
}

async function calculateIndicators(closes, hmaPeriod, emaPeriod) {
    const library = indicators;
    const ta = new library.Indicators();

    // THEIR IMPLEMENTATION IS BROKEN! CUSTOM IMPLEMENTATION BELOW
    // const hma = await ta.hma(closes, hmaPeriod);
    // console.log(hma);
    const hma = calculateHMA(closes, hmaPeriod);

    const ema = await ta.ema(closes, emaPeriod);
    console.log(ema);

    // Continue your chart generation logic here using `hma` and `ema`
    return { hma, ema };
}

function generateFullChart(pair, ohlcvData, hmaPeriod = null, emaPeriod = null) {
    // Default period values are set
    hmaPeriod = hmaPeriod || parseInt(document.getElementById('hmaPeriodInput').value, 10) || 12;
    emaPeriod = emaPeriod || parseInt(document.getElementById('emaPeriodInput').value, 10) || 42;

    const chartDiv = document.getElementById(`watcher_chart_${pair}`);

    // Convert timestamps to index for x-axis
    const xData = ohlcvData.map((_, index) => index);

    const opens = ohlcvData.map(entry => entry.open);
    const highs = ohlcvData.map(entry => entry.high);
    const lows = ohlcvData.map(entry => entry.low);
    const closes = ohlcvData.map(entry => entry.close);

    // Calculate indicators and plot the chart
    calculateIndicators(closes, hmaPeriod, emaPeriod).then(({ hma, ema }) => {
        const candlestickTrace = {
            type: 'candlestick',
            x: xData,
            open: opens,
            high: highs,
            low: lows,
            close: closes
        };

        const hmaTrace = {
            x: xData,
            y: hma,
            mode: 'lines',
            name: 'HMA',
            line: { color: 'orange', width: 3}
        };

        const emaTrace = {
            x: xData,
            y: ema,
            mode: 'lines',
            name: 'EMA',
            line: { color: 'lightblue', width: 3 }
        };

        const layout = {
            margin: { l: 10, r: 10, b: 10, t: 10 },
            xaxis: {
                visible: true,
                showgrid: false,
                showticklabels: false,
                tickfont: { size: 8 },
                rangeslider: { visible: false }
            },
            yaxis: {
                visible: true,
                showgrid: false,
                showticklabels: false,
                tickfont: { size: 8 }
            },
            showlegend: false,
            dragmode: 'zoom',
            plot_bgcolor: 'rgba(0,0,0,0)', // Set plot background to transparent
            paper_bgcolor: 'rgba(0,0,0,0)', // Set paper background to transparent
        };

        Plotly.newPlot(chartDiv, [candlestickTrace, hmaTrace, emaTrace], layout);
    }); // Corrected the syntax here
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
// Utility function to calculate WMA
function calculateWMA(data, period) {
    let weightedSum = 0;
    let weightSum = 0;

    return data.map((value, index) => {
        if (index < period - 1) {
            return null; // not enough data points to calculate WMA
        }
        weightedSum = data.slice(index - period + 1, index + 1)
                           .reduce((sum, value, idx) => {
                               const weight = idx + 1;
                               return sum + value * weight;
                           }, 0);

        weightSum = data.slice(index - period + 1, index + 1)
                        .reduce((sum, _, idx) => {
                            const weight = idx + 1;
                            return sum + weight;
                        }, 0);

        return weightedSum / weightSum;
    });
}

// Utility function to calculate HMA
function calculateHMA(data, period) {
    const halfLength = Math.floor(period / 2);
    const sqrtLength = Math.floor(Math.sqrt(period));

    // Calculate the first WMA for half period
    const halfWMA = calculateWMA(data, halfLength);

    // Calculate the second WMA for the full period
    const fullWMA = calculateWMA(data, period);

    // Calculate the difference between the 2x halfWMA and fullWMA
    const rawHMA = halfWMA.map((value, index) => {
        return value !== null && fullWMA[index] !== null
               ? 2 * value - fullWMA[index]
               : null;
    }).filter(v => v !== null); // Remove nulls for the next WMA calculation

    // Calculate the WMA of the rawHMA
    const hmaWMA = calculateWMA(rawHMA, sqrtLength);

    // Shift the HMA to align with the original data array
    const hma = Array(halfLength + sqrtLength - 2).fill(null).concat(hmaWMA);

    return hma;
}

// Use this function in your charting logic by passing in the closing prices array and the desired period for the HMA.
