# crypto_data.py

from bidask import edge  # Make sure to install the bidask package
import ccxt
import pandas as pd
import random

# Initialize CCXT Kraken exchange
kraken = ccxt.kraken({
    'enableRateLimit': True
})


async def fetch_ohlcv_data_async(symbol, exchange, timeframe, limit):
    ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    df = pd.DataFrame(
        ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])

    # # Convert timestamp to datetime for readability (optional)
    # df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

    return df


def fetch_pairs(stake_currency='USD'):
    pairs = [str(x['symbol']) for x in kraken.load_markets(
    ).values() if str(x['symbol']).endswith(stake_currency)]
    return pairs#[:500]  # Limiting to 10 pairs for demonstration


# Import necessary modules
# Base Property class

class Property:
    def __init__(self, name):
        self.name = name

    def calculate(self, ohlcv_data):
        raise NotImplementedError(
            "Each property must implement a calculate method.")

# Close Property


# class CloseProperty(Property):
#     def calculate(self, ohlcv_data):
#         # Using .iloc to access the last element
#         return ohlcv_data['close'].iloc[-1]


# Bid-Ask Spread Property

class BidAskSpreadProperty(Property):
    def calculate(self, ohlcv_data):
        # Ensure that each parameter is a Series
        open_prices = ohlcv_data['open']
        high_prices = ohlcv_data['high']
        low_prices = ohlcv_data['low']
        close_prices = ohlcv_data['close']

        # Calculate bid-ask spread using the 'edge' function
        bid_ask_spread = edge(open_prices, high_prices,
                              low_prices, close_prices)
        return bid_ask_spread


def add_custom_properties(df) -> pd.DataFrame:
    # Define the properties you want to calculate
    properties = [
        # CloseProperty("close"),
        BidAskSpreadProperty("bid_ask_spread")
    ]

    # Apply each property's calculation method to the OHLCV data
    for prop in properties:
        # Assign the calculated property to a new column in the DataFrame
        df[prop.name] = prop.calculate(df)

        # Add Heikin Ashi calculations
        df['HA_Close'] = (df['open'] + df['high'] + df['low'] + df['close']) / 4
        df['HA_Open'] = df['open'].copy()
        for i in range(1, len(df)):
            df.loc[df.index[i], 'HA_Open'] = (df['HA_Open'].iloc[i-1] + df['HA_Close'].iloc[i-1]) / 2
        df['HA_High'] = df[['high', 'HA_Open', 'HA_Close']].max(axis=1)
        df['HA_Low'] = df[['low', 'HA_Open', 'HA_Close']].min(axis=1)


    # Return the modified DataFrame with all original columns and new properties
    return df
