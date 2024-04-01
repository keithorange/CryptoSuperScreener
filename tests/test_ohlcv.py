import requests
import json


def test_enriched_ohlcv():
    
    # get /get_pairs for a list of pairs
    url = 'http://localhost:6969/get_pairs'
    response = requests.get(url)
    pairs = response.json()
    print(f"Pairs: {pairs}")
    
    url = 'http://localhost:6969/get_enriched_ohlcv'
    headers = {'Content-Type': 'application/json'}
    data = {
        "pairs": pairs,
        "length": 5
    }
    response = requests.post(url, headers=headers, json=data)

    print(f"Status Code: {response.status_code}")
    print("Headers:")
    print(response.headers)
    print("Response Body:")
    try:
        print(response.json())
    except json.JSONDecodeError:
        print(response.text)


if __name__ == "__main__":
    test_enriched_ohlcv()
