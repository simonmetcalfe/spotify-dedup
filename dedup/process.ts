import { fetchUserOwnedPlaylists } from './library';
import { PlaylistDeduplicator, SavedTracksDeduplicator } from './deduplicator';
import PlaylistCache from './playlistCache';
import { PlaylistModel } from './types';
import SpotifyWebApi, {
  SpotifyUserType,
  SpotifyPlaylistType,
  SpotifyTrackType,
} from './spotifyApi';

const playlistCache = new PlaylistCache();

const playlistToPlaylistModel = (
  playlist: SpotifyPlaylistType
): PlaylistModel => ({
  playlist: playlist,
  duplicates: [],
  status: '',
  processed: false,
});

export default class {
  listeners: {};
  constructor() {
    this.listeners = {};
  }

  on(event: string, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }

  dispatch(event: string, params) {
    const callbacks = this.listeners[event];
    callbacks.forEach((callback) => callback(params));
  }

  // The main function that reads and indentifies duplicates
  process = async (api: SpotifyWebApi, user: SpotifyUserType) => {
    console.log('process.ts:  process async running')
    const currentState: {
      playlists?: Array<PlaylistModel>;
      savedTracks?: {
        duplicates?: Array<any>;
      };
      toProcess?: number;
    } = {};

    // This method should still be fine, but we will want to call it for all playlists at the end
    const dispatch = this.dispatch.bind(this);
    function onPlaylistProcessed(playlist: PlaylistModel) {
      console.log('process.ts:  onPlaylistProcessed running for ' + playlist.playlist.name) // Model is just SportifyPlaylistType and duplicates array
      console.log('process.ts:  onPlaylistProcessed remaing playlists is ' + currentState.toProcess) // Model is just SportifyPlaylistType and duplicates array
      // console.log('process.ts:  Local storage is currently ' + JSON.stringify(localStorage))
      playlist.processed = true;
      var remaining = currentState.toProcess - 1;
      currentState.toProcess -= 1;
      if (remaining === 0) {
        if (global['ga']) {
          global['ga']('send', 'event', 'spotify-dedup', 'library-processed');
        }
        if (global['fbq']) {
          global['fbq']('trackCustom', 'dedup-library-processed');
        }
      }
      dispatch('updateState', currentState);
    }

    let playlistsToCheck = [];
    let playlistsLibrary = []; // A copy of playlistsToCheck so that we iterate through all playlists
    const ownedPlaylists: Array<SpotifyPlaylistType> = await fetchUserOwnedPlaylists(
      api,
      user.id
    ).catch((e) => {
      if (global['ga']) {
        global['ga'](
          'send',
          'event',
          'spotify-dedup',
          'error-fetching-user-playlists'
        );
      }
      console.error("There was an error fetching user's playlists", e);
    });

    if (ownedPlaylists) {
      playlistsToCheck = ownedPlaylists;
      playlistsLibrary = ownedPlaylists;
      currentState.playlists = playlistsToCheck.map((p) =>
        playlistToPlaylistModel(p)
      );
      currentState.toProcess =
        currentState.playlists.length + 1 /* saved tracks */;
      currentState.savedTracks = {};

      // TODO:  Remove this if we decide we don't want to get and process saved tracks
      const savedTracks = await SavedTracksDeduplicator.getTracks(
        api,
        api.getMySavedTracks({ limit: 50 })
      );

      // Instead of de-duplication, this could be used to allow the user to add or remove any track from their saved tracks
      /*
      currentState.savedTracks.duplicates = SavedTracksDeduplicator.findDuplicatedTracks(
        savedTracks
      );


      if (currentState.savedTracks.duplicates.length && global['ga']) {
        global['ga'](
          'send',
          'event',
          'spotify-dedup',
          'saved-tracks-found-duplicates'
        );
      }
      */

      currentState.toProcess--;

      this.dispatch('updateState', currentState);

      for (const playlistModel of currentState.playlists) {
        if (playlistCache.needsTracksDownloading(playlistModel.playlist)) {
          try {
            const playlistTracks = await PlaylistDeduplicator.getTracks(
              api,
              playlistModel.playlist
            );
            playlistModel.duplicates = PlaylistDeduplicator.findDuplicatedTracks(
              playlistTracks
            );
            if (playlistModel.duplicates.length === 0) {
              playlistCache.storePlaylistWithoutDuplicates(
                playlistModel.playlist
              );
            }
            onPlaylistProcessed(playlistModel);
          } catch (e) {
            console.error(
              'There was an error fetching tracks for playlist',
              playlistModel.playlist,
              e
            );
            onPlaylistProcessed(playlistModel);
          }
        } else {
          onPlaylistProcessed(playlistModel);
        }
      }
    }
  };
}


