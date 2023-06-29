

//import fetch from './customFetch';
export type SpotifyArtistType = {
  id: string;
  name: string;
};

export type SpotifyTrackType = {
  artists: Array<SpotifyArtistType>;
  duration_ms: number;
  id: string;
  linked_from: SpotifyTrackType;
  name: string;
  uri: string;
  // TODO:  Do we need the location in the playlist 
  // in_playlists?: Array<{ url: SpotifyPlaylistType }>; // Originally planned to store inPlaylists within the track, now it is in the PlaylistModel 
};

export type SpotifyPlaylistType = {
  collaborative: boolean;
  id: string;
  images?: Array<{ url: string }>;
  name: string;
  owner: SpotifyUserType;
  snapshot_id?: string;
  tracks: {
    href: string;
  };
};

export type SpotifyPlaylistTrackType = {
  added_at: string;
  added_by: SpotifyUserType;
  is_local: boolean;
  track: SpotifyTrackType | null;
};

export type SpotifySavedTrackType = {
  added_at: string;
  track: SpotifyTrackType | null;
};

export type SpotifyUserType = {
  display_name?: string;
  href: string;
  id: string;
  type: 'user';
  uri: string;
};

const apiPrefix = 'https://api.spotify.com/v1';

function NetworkException(message: string, status: number) {
  this.message = message;
  this.status = status;
  this.name = 'NetworkException';
}

function ServerException(json: Object, status: number) {
  this.message = 'There was a Server Exception';
  this.json = json;
  this.status = status;
  this.name = 'ServerException';
}

function ApplicationException(json: Object, status: number) {
  this.message = 'There was an Application Exception';
  this.json = json;
  this.status = status;
  this.name = 'ApplicationException';
}

function InvalidJSONException(body: string, status: number) {
  this.message = 'There was an Invalid JSON Exception';
  this.body = body;
  this.status = status;
  this.name = 'InvalidJSONException';
}

const parseAPIResponse = (response: Response): Object =>
  new Promise((resolve) => resolve(response.text()))
    .catch((err) => {
      console.log('spotifyApi.ts:  parseAPIResponse network exception ' + err.message + ' ' + response.status);
      throw new NetworkException(err.message, response.status);
    })
    .then((responseBody: string) => {
      let parsedJSON: Object = null;
      try {
        parsedJSON = responseBody === '' ? null : JSON.parse(responseBody);
      } catch (e) {
        console.log('spotifyApi.ts:  parseAPIResponse invalid JSON exception ' + e.message + ' ' + responseBody);
        // We should never get these unless response is mangled
        // Or API is not properly implemented
        throw new InvalidJSONException(responseBody, response.status);
      }
      if (response.ok) {
        console.log('spotifyApi.ts:  parseAPIResponse response OK');
        return parsedJSON;
      }
      if (response.status >= 500) {
        console.log('spotifyApi.ts:  parseAPIResponse server exception ' + responseBody);
        throw new ServerException(parsedJSON, response.status);
      } else {
        console.log('spotifyApi.ts:  parseAPIResponse application exception ' + responseBody);
        throw new ApplicationException(parsedJSON, response.status);
      }
    });

export default class SpotifyWebApi {
  token: string;

  constructor() {
    this.token = null;
  }

  setAccessToken(token: string) {
    this.token = token;
  }

  async getMe() {
    // console.log('spotifyApi.ts:  Initial storage (getMe) is currently ' + JSON.stringify(localStorage))
    // console.log('spotifyApi.ts:  Adding test item to local storage:  simonkey:simonvalue')
    // localStorage.setItem('simonkey', 'simovalue');
    return await this.getGeneric(`${apiPrefix}/me`);
  }

  async getGeneric(url: string, options = {}) {
    // console.log('spotifyApi.ts:  getGeneric called with url ' + url + " and options " + JSON.stringify(options))
    const optionsString =
      Object.keys(options).length === 0
        ? ''  // If the length of Options is 0, return a blank string
        : `?${Object.keys(options) // Otherwise, create string starting with ?
          .map((k) => `${k}=${options[k]}`)
          .join('&')}`;

    try {
      const res = await fetch(`${url}${optionsString}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      //console.log('spotifyApi.ts:  getGeneric returning with response ' + JSON.stringify(res))
      return parseAPIResponse(res);
    } catch (e) {
      console.error('e', e);
      return Promise.reject(e);
    }
  }

  async getUserPlaylists(userId: string, options?: { limit?: number }) {
    console.log('spotifyApi.ts:  getUserPlaylists called')
    const url =
      typeof userId === 'string'
        ? `${apiPrefix}/users/${encodeURIComponent(userId)}/playlists`
        : `${apiPrefix}/me/playlists`;
    return await this.getGeneric(url, options);
  }

  async previewTrack(trackId: string) {
    console.log('spotifyApi.ts:  previewTrack called for track ' + trackId)

    let body = `{
                  "uris": ["spotify:track:${trackId}"],
                  "position_ms": 30000
                }`

    const res = await fetch(
      `${apiPrefix}/me/player/play`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: `${body}`
      },
    );
    return parseAPIResponse(res);
  }

  async removeTracksFromPlaylist(
    userId: string,
    playlistId: string,
    uris: Array<string | { uri: string; positions: number[] }>
  ) {

    let sabotage = false;
    let urislist = '';

    for (let i = 0; i < uris.length; i++) {
      if (typeof uris[0] == "string") {
        urislist += uris[i].toString + ', ';
      }
      else {
        let positions = '';
        for (let n = 0; n < uris[i].positions.length; n++) {
          positions += uris[i].positions[n] + ',';
        }
        urislist += uris[i].uri + ' (' + positions + '), ';
        // Fabricating failure on Britney Spears - Slumber party
        if (uris[i].uri == 'spotify:track:6lknMmJZALXxx7emwwZWLX') {
          //console.log('spotifyApi.ts:  removeTracksFromPlaylist FABRICATING FAIL with uri-positions ' + uris[i].uri + ' ' + uris[i].positions)
          //sabotage = true;
        }
      }
    }

    console.log('spotifyApi.ts:  removeTracksFromPlaylist called with data ' + urislist);

    let dataToBeSent = {
      tracks: uris.map((uri) => (typeof uri === 'string' ? { uri: uri } : uri)),
    };

    if (sabotage == true) {
      dataToBeSent = null;
    }

    console.log('spotifyApi.ts:  removeTracksFromPlaylist data to be sent to spotify is ' + dataToBeSent);

    const res = await fetch(
      `${apiPrefix}/users/${encodeURIComponent(
        userId
      )}/playlists/${playlistId}/tracks`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(dataToBeSent),
      }
    );
    return parseAPIResponse(res);
  }

  async getMySavedTracks(options?: { limit?: number }) {
    console.log('spotifyApi.ts:  getMySavedTracks called with options ' + JSON.stringify(options))
    return this.getGeneric(`${apiPrefix}/me/tracks`, options);
  }

  async removeFromMySavedTracks(trackIds: Array<string>) {
    for (let i = 0; i < trackIds.length; i++) {
      console.log('spotifyApi.ts:  removeFromMySavedTracks called with trackIds ' + trackIds[i])
    }
    const res = await fetch(`${apiPrefix}/me/tracks`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(trackIds),
    });
    return parseAPIResponse(res);
  }
}
