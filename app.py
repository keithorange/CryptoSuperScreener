from flask_cors import CORS
from tqdm.asyncio import tqdm
from collections import defaultdict
from flask import Flask, request
import ast
import os

import ccxt
from crypto_data import fetch_pairs, fetch_ohlcv_data_async, add_custom_properties
from flask import Flask, render_template, jsonify
from flask import Flask, render_template, request, session, redirect, url_for
from flask import jsonify, request, session
import asyncio
import ccxt.async_support as ccxt_async
import random
from flask import Flask, render_template

import pandas as pd
import plotly
import plotly.graph_objects as go
from plotly.utils import PlotlyJSONEncoder
import json

from crypto_data import fetch_ohlcv_data_async


from flask_session import Session  # Import Session

from cachelib.file import FileSystemCache

app = Flask(__name__)
app.secret_key = 'your_secret_key'
CORS(app)

# set flask app port not 5000 to 6969



# Ensure the directory for the session files exists
session_dir = os.path.join(os.getcwd(), 'sessions')
if not os.path.exists(session_dir):
    os.makedirs(session_dir)

# Configure Flask-Session
app.config['SESSION_TYPE'] = 'cachelib'
app.config['SESSION_SERIALIZATION_FORMAT'] = 'json'
app.config['SESSION_CACHELIB'] = FileSystemCache(threshold=0, cache_dir=session_dir)

# Initialize Session
Session(app)





from tqdm import tqdm
import logging




@app.route('/get_pairs')
async def get_pairs():

    pairs = fetch_pairs()
    session['pairs'] = pairs  # Cache the pairs in the session
    return jsonify(pairs)


@app.route('/')
async def index():
    favorites = session.get('favorites', [])
    enriched_data = session.get('enriched_data', {})
    filter_criteria = session.get('filter_criteria', '')

    try:
        # Construct the filter function from the stored criteria
        if filter_criteria:
            filter_func = eval("lambda x: " + filter_criteria)
            # Apply the filter function to the enriched_data
            filtered_data = {pair: list(filter(filter_func, data_list))
                             for pair, data_list in enriched_data.items()}
            # Remove pairs with no data
            filtered_data = {pair: data_list for pair,
                             data_list in filtered_data.items() if data_list}
        else:
            filtered_data = enriched_data
    except Exception as e:
        print(f"ERROR: {str(e)}")
        # If there's an error with the filter, fall back to unfiltered data
        filtered_data = enriched_data

    return render_template('index.html', favorites=favorites, enriched_data=filtered_data)



@app.route('/screener')
def screener():
    # Your existing logic to display screener page
    return render_template('index.html')


MAX_TRIES = 3  # Define a maximum number of retries for each pair

# Setup basic configuration for logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')


async def process_in_batches(task_func, items, batch_size, MAX_TRIES=10):
    results = []
    errors = defaultdict(int)  # Dictionary to keep track of retries per item
    pending_items = items[:]  # Copy of items to maintain a pending list
    total_batches = (len(items) + batch_size - 1) // batch_size

    # Initialize the progress bar
    progress_bar = tqdm(total=total_batches)

    while pending_items:
        batch = pending_items[:batch_size]  # Get the current batch
        pending_items = pending_items[batch_size:]  # Update the pending list

        tasks = [task_func(item) for item in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and errors
        for item, result in zip(batch, batch_results):
            if isinstance(result, Exception):
                errors[item] += 1
                if errors[item] < MAX_TRIES:
                    logging.error(f"Error processing {item}: {result}, retrying ({errors[item]}/{MAX_TRIES})...")
                    # Retry this item in the next iteration
                    pending_items.append(item)
                else:
                    logging.error(f"Max retries exceeded for {item}: {result}")
            else:
                results.append((item ,result[1]))

        # Update the progress bar after each batch
        progress_bar.update(1)

    # Close the progress bar when done
    progress_bar.close()


    #print(results)  # Add this for debugging
    return results

@app.route('/get_enriched_ohlcv', methods=['POST'])
async def get_enriched_ohlcv():
    data = request.get_json()
    pairs = data.get('pairs', [])
    timeframe = data.get('timeframe', '5m')
    if timeframe not in ['1m', '5m', '15m', '30m', '1h', '4h', '1d']:
        return jsonify({'error': 'Invalid timeframe'}), 400
    
    length = data.get('length', 120)

    if not pairs:
        return jsonify({'error': 'No pairs provided'}), 400

    enriched_data = {}

    async def fetch_and_process(pair):
        async with ccxt_async.kraken() as exchange:
            ohlcv_df = await fetch_ohlcv_data_async(pair, exchange, timeframe, length)
            return pair, add_custom_properties(ohlcv_df).to_dict('records')

    try:
        # Use the updated 'process_in_batches' with retry logic
        results = await process_in_batches(fetch_and_process, pairs, batch_size=300)
        
        for pair, ohlcv_data in results:
            enriched_data[pair] = ohlcv_data  # Directly assign the OHLCV data here
            
    except Exception as e:
        return jsonify({'error': f"{str(e)} and enriched_data {enriched_data} and results = {results}" }), 400

    
    session['enriched_data'] = enriched_data
    # Before returning, construct the final dictionary correctly
    
    # return jsonify(enriched_data)
    return jsonify({'message': 'Data fetched and enriched successfully IN SESSION.'}), 200


@app.route('/add_favorites', methods=['POST'])
def add_favorites():
    pairs = request.json.get('pairs', [])  # Expecting a list of pairs
    if 'favorites' not in session:
        session['favorites'] = []
    for pair in pairs:
        if pair not in session['favorites']:
            session['favorites'].append(pair)
    session.modified = True
    return jsonify({"message": "Favorites added successfully.", "favorites": session['favorites']}), 200


@app.route('/remove_favorites', methods=['POST'])
def remove_favorites():
    pairs = request.json.get('pairs', [])  # Expecting a list of pairs
    if 'favorites' in session:
        session['favorites'] = [
            pair for pair in session['favorites'] if pair not in pairs]
    session.modified = True
    return jsonify({"message": "Favorites removed successfully.", "favorites": session['favorites']}), 200


@app.route('/remove_all_favorites', methods=['POST'])
def remove_all_favorites():
    session['favorites'] = []  # Clear all favorites
    session.modified = True
    return jsonify({"message": "All favorites removed successfully."}), 200


@app.route('/get_current_favorites')
def get_current_favorites():
    return jsonify(session.get('favorites', []))

@app.route('/toggle_favorite', methods=['POST'])
def toggle_favorite():
    pair = request.args.get('pair')
    if 'favorites' not in session:
        session['favorites'] = []
    if pair in session['favorites']:
        session['favorites'].remove(pair)
    else:
        session['favorites'].append(pair)
    session.modified = True
    return jsonify({"message": "Favorite toggled successfully."}), 200


@app.route('/watcher')
async def watcher():
    page = request.args.get('page', 1, type=int)
    grid_rows = request.args.get('grid_rows', 2, type=int)
    grid_cols = request.args.get('grid_cols', 2, type=int)

    favorite_pairs = session.get('favorites', [])
    total_favorites = len(favorite_pairs)
    favorites_per_page = grid_rows * grid_cols
    total_pages = (total_favorites + favorites_per_page -
                   1) // favorites_per_page

    favorite_pairs_data = []

    if 'enriched_data' in session:
        enriched_data = session['enriched_data']
        favorite_pairs_data = [
            {'pair': pair, 'ohlcv': enriched_data.get(pair)}
            for pair in favorite_pairs if pair in enriched_data
        ]

    return render_template(
        'watcher.html',
        favorites=favorite_pairs,
        favorite_pairs_data=favorite_pairs_data,
        page=page,
        total_pages=total_pages,
        grid_rows=grid_rows,
        grid_cols=grid_cols
    )

@app.route('/filter_data', methods=['POST'])
def filter_data():
    data = request.json
    filter_string = data.get('filter', '')

    # FILTERING IS DONE IN INDEX/SCREENER PASSED INTO FLASK (REFRESH!)

    # Store the filter criteria in the session
    session['filter_criteria'] = filter_string
    return jsonify({'message': 'Filter criteria updated successfully'})


# # Configure logging
# logging.basicConfig(level=logging.DEBUG)

# # Define a handler which writes INFO messages or higher to sys.stderr
# console = logging.StreamHandler()
# console.setLevel(logging.DEBUG)

# # Set a format which is simpler for console use
# formatter = logging.Formatter(
#     '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# console.setFormatter(formatter)

# # Add the handler to the root logger
# logging.getLogger('').addHandler(console)


# Existing Flask setup code...


# @app.before_request
# def log_request_info():
#     if request.method == 'POST':
#         app.logger.debug('Headers: %s', request.headers)
#         #app.logger.debug('Body: %s', request.get_data())


# @app.after_request
# def log_response_info(response):
#     if request.method == 'POST':
#         #app.logger.debug('Response status: %s', response.status)
#         app.logger.debug('Response headers: %s', response.headers)
#         #app.logger.debug('Response body: %s', response.get_data())
#     return response

# # Existing Flask app routes...



if __name__ == '__main__':
    app.run(debug=True, port=6969)
