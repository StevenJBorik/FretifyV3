import numpy as np
import matplotlib.pyplot as plt
import IPython.display as ipd
import librosa
import librosa.display
import requests
import io

# Function to retrieve audio data from a Spotify URL
def get_audio_from_spotify_url(url):
    # Extract the Spotify track ID from the URL
    track_id = url.split('/')[-1].split('?')[0]
    # Construct the API endpoint to fetch the track details
    api_url = f"https://api.spotify.com/v1/tracks/{track_id}"
    # Make an authenticated request to the Spotify API to get track details
    headers = {
        'Authorization': 'Bearer {YOUR_ACCESS_TOKEN}'
    }
    response = requests.get(api_url, headers=headers)
    track_data = response.json()
    # Extract the preview URL from the track data
    preview_url = track_data['preview_url']
    # Make a request to the preview URL to get the audio data
    audio_response = requests.get(preview_url)
    return audio_response.content

# class that uses the librosa library to analyze the key that an audio waveform is in
# arguments:
#     waveform: an audio waveform array loaded by librosa
#     sr: sampling rate of the audio
#     tstart and tend: the range in seconds of the waveform to be analyzed; default to the beginning and end of waveform if not specified
class Tonal_Fragment(object):
    def __init__(self, waveform, sr, tstart=None, tend=None):
        self.waveform = waveform
        self.sr = sr
        self.tstart = tstart
        self.tend = tend
        
        if self.tstart is not None:
            self.tstart = librosa.time_to_samples(self.tstart, sr=self.sr)
        if self.tend is not None:
            self.tend = librosa.time_to_samples(self.tend, sr=self.sr)
        self.y_segment = self.waveform[self.tstart:self.tend]
        self.chromograph = librosa.feature.chroma_cqt(y=self.y_segment, sr=self.sr, bins_per_octave=24)
        
        # Remaining code remains the same...
