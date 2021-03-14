

import fetch from './customFetch';
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
  in_playlists?: Array<{ url: SpotifyPlaylistType }>;
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
      throw new NetworkException(err.message, response.status);
    })
    .then((responseBody: string) => {
      let parsedJSON: Object = null;
      try {
        parsedJSON = responseBody === '' ? null : JSON.parse(responseBody);
        console.log('spotifyApi.ts:  parseAPIResponse running with RESPONSE ')// + JSON.stringify(response) + " and RESPONSE BODY " + responseBody)
      } catch (e) {
        // We should never get these unless response is mangled
        // Or API is not properly implemented
        throw new InvalidJSONException(responseBody, response.status);
      }
      if (response.ok) return parsedJSON;
      if (response.status >= 500) {
        throw new ServerException(parsedJSON, response.status);
      } else {
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
    console.log('spotifyApi.ts:  Adding test item to local storage:  simonkey:simonvalue')
    localStorage.setItem('simonkey', 'simovalue');
    return await this.getGeneric(`${apiPrefix}/me`);
  }

  async getGeneric(url: string, options = {}) {
    console.log('spotifyApi.ts:  getGeneric called with url ' + url + " and options " + JSON.stringify(options))
    const optionsString =
      Object.keys(options).length === 0
        ? ''  // If the length of Options is 0, return a blank string
        : `?${Object.keys(options) // Otherwise, create string starting with ?
          .map((k) => `${k}=${options[k]}`)
          .join('&')}`;

    try {
      const res = await fetch({
        url: `${url}${optionsString}`,
        options: {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      });
      console.log('spotifyApi.ts:  getGeneric returning with response ' + JSON.stringify(res))
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

  async removeTracksFromPlaylist(
    userId: string,
    playlistId: string,
    uris: Array<string | { uri: string; positions: number[] }>
  ) {
    for (let i = 0; i < uris.length; i++) {
      console.log('spotifyApi.ts:  removeTracksFromPlaylist called with uris ' + uris[i])
    }
    const dataToBeSent = {
      tracks: uris.map((uri) => (typeof uri === 'string' ? { uri: uri } : uri)),
    };

    const res = await fetch({
      url: `${apiPrefix}/users/${encodeURIComponent(
        userId
      )}/playlists/${playlistId}/tracks`,
      options: {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(dataToBeSent),
      },
    });
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
    const res = await fetch({
      url: `${apiPrefix}/me/tracks`,
      options: {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(trackIds),
      },
    });
    return parseAPIResponse(res);
  }
}
