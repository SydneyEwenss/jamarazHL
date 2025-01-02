from flask import Flask, render_template, request, session, redirect, url_for, make_response
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import os
import random
from flask_caching import Cache
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()

# Flask app setup
app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Ensure you use a strong secret key

# Spotify API credentials from .env
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

# Authenticate with Spotify
auth_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
spotify = Spotify(auth_manager=auth_manager)

# Set up Flask-Caching to use file-based cache
app.config['CACHE_TYPE'] = 'filesystem'
app.config['CACHE_DIR'] = 'cache'  # Cache storage directory
app.config['CACHE_DEFAULT_TIMEOUT'] = 86400  # Cache expiration (24 hours)
cache = Cache(app)

# Hardcoded artist ID (e.g., Taylor Swift)
ARTIST_ID = '4DiZJ3Gg7B1EWeKoQO36Ae'

def get_songs_for_artist():
    """Fetch all songs and their popularity for the hardcoded artist using the artist ID, with caching."""
    
    # Try to get the songs from cache
    cached_songs = cache.get('songs_cache')
    if cached_songs:
        return cached_songs  # Return cached songs if available
    
    # Fetch albums by the artist
    albums = []
    results = spotify.artist_albums(ARTIST_ID, album_type='album', limit=50)  # You can change the 'limit'
    while results:
        albums.extend(results['items'])
        if results['next']:
            results = spotify.next(results)
        else:
            break
    
    songs = []
    for album in albums:
        album_tracks = spotify.album_tracks(album['id'])
        for track in album_tracks['items']:
            track_data = spotify.track(track['id'])
            songs.append({
                'name': track['name'],
                'popularity': track_data['popularity'],
                'album_cover': album['images'][0]['url']
            })
    
    # Cache songs for future use
    cache.set('songs_cache', songs)
    return songs

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game', methods=['GET', 'POST'])
def game():
    songs = session.get('songs', [])
    score = session.get('score', 0)
    high_score = session.get('high_score', 0)

    if len(songs) < 2:
        return redirect(url_for('index'))

    if request.method == 'POST':
        # Retrieve the current song pair from the session
        current_pair = session.get('current_pair')
        if not current_pair:
            return redirect(url_for('index'))  # Restart the game if session is invalid

        song1, song2 = current_pair['song1'], current_pair['song2']
        guess = request.form.get('guess')

        # Check if the guess is correct
        if (guess == '1' and song1['popularity'] > song2['popularity']) or \
           (guess == '2' and song2['popularity'] > song1['popularity']):
            session['score'] += 1  # Update score in session
            score = session['score']
            message = "✅ Correct!"
            game_over = False
        else:
            message = "❌ Incorrect! Game Over."
            game_over = True
            # Update high score if necessary
            if score > high_score:
                session['high_score'] = score  # Save new high score to session
                high_score = score
            # Pass the popularity of the songs to the template
            session['score'] = 0
            return render_template(
                'game.html',
                song1=song1,
                song2=song2,
                score=score,
                game_over=game_over,
                message=message,
                song1_popularity=song1['popularity'],
                song2_popularity=song2['popularity'],
                high_score=high_score  # Pass high score to the template
            )
            

        # Select a new pair of songs for the next round
        song1, song2 = random.sample(songs, 2)
        session['current_pair'] = {'song1': song1, 'song2': song2}

        return render_template('game.html', song1=song1, song2=song2, score=session['score'], game_over=False, high_score=high_score)

    # If no POST, just show the initial songs
    song1, song2 = random.sample(songs, 2)
    session['current_pair'] = {'song1': song1, 'song2': song2}

    return render_template('game.html', song1=song1, song2=song2, score=score, game_over=False, high_score=high_score)

@app.route('/restart', methods=['POST'])
def restart_game():
    session['score'] = 0  # Reset the score in the session
    session['current_pair'] = None  # Reset the current song pair
    return redirect(url_for('game'))  # Redirect to game page to restart the game




if __name__ == '__main__':
    app.run(debug=True)
