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


// Converts the SpotifyPlaylistType array (returned by fetchUserOwnedPlaylists) to a PlaylistModel array
// Used to populate currentState.playlists (an array of PlaylistModel) with an entry for each playlist in Spotify (stored in playlistsToCheck - an array of SportifyPlaylistType) 
// All the properties of PlaylistModel are blank/false, except for the playlist itself.  The other properties are added when each PlaylistModel element is processed 
const playlistToPlaylistModel = (
  playlist: SpotifyPlaylistType
): PlaylistModel => ({
  playlist: playlist,
  duplicates: [], // Does it matter that duplicates in this model coverter does not follow the new design of PlaylistModel (which now has an array within an array)?
  tracks: [], // Not sure if this is correct, should be an array of SpotifytrackType
  status: '',
  processed: false,
  downloaded: false, // Added because we are handling downloading separately
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
    // const is used to fix the model of currentState, but each object inside is modifyable
    const currentState: {
      playlists?: Array<PlaylistModel>;
      savedTracks?: {
        duplicates?: Array<any>;
      };
      toProcess?: number;
      toDownload?: number;
    } = {};

    const dispatch = this.dispatch.bind(this);

    function onPlaylistDownloaded(playlist: PlaylistModel) {
      console.log('process.ts:  onPlaylistDownloaded running for ' + playlist.playlist.name) // Model is just SportifyPlaylistType and duplicates array
      console.log('process.ts:  onPlaylistDownloaded remaing playlists is ' + currentState.toDownload) // Model is just SportifyPlaylistType and duplicates array
      // console.log('process.ts:  Local storage is currently ' + JSON.stringify(localStorage))
      playlist.downloaded = true;
      var remaining = currentState.toDownload - 1;
      currentState.toDownload -= 1;
      if (remaining === 0) {
        if (global['ga']) {
          global['ga']('send', 'event', 'spotify-dedup', 'library-processed');
        }
        if (global['fbq']) {
          global['fbq']('trackCustom', 'dedup-library-processed');
        }
        processAllPlaylists(); // Run the processing ONLY if all playlists are downloaded
      }
      dispatch('updateState', currentState);
    }

    function processAllPlaylists() {
      console.log('process.ts:  processAllPlaylists running')
      for (const playlistModel of currentState.playlists) {

        // Old dedup routine, here for testing
        //playlistModel.duplicates = PlaylistDeduplicator.findDuplicatedTracks(playlistModel.tracks);

        // New dedup routine
        console.log('process.ts:  process func about to find duplicate tracks  ' + playlistModel.playlist.name)
        playlistModel.duplicates = PlaylistDeduplicator.findDuplicatedTracksInAllPlaylists(playlistModel, currentState.playlists);

        console.log('process.ts:  Contents of playlistModel.duplicates for ' + playlistModel.playlist.name + ' is ' + JSON.stringify(playlistModel.duplicates))

        onPlaylistProcessed(playlistModel);

        // Do not see the value in storing playlists that don't contain any duplicates - appears to work without it
        /*
        if (playlistModel.duplicates.length === 0) {
          console.log('process.ts:  Storing playlist without duplicates for playlist ' + playlistModel.playlist.name)
          playlistCache.storePlaylistWithoutDuplicates(
            playlistModel.playlist
          );
        }
        */
      }
    }


    function onPlaylistProcessed(playlist: PlaylistModel) {
      console.log('process.ts:  onPlaylistProcessed running for ' + playlist.playlist.name) // Model is just SportifyPlaylistType and duplicates array
      console.log('process.ts:  onPlaylistProcessed remaing playlists is ' + currentState.toProcess) // Model is just SportifyPlaylistType and duplicates array
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
      currentState.playlists = playlistsToCheck.map((p) => // Create a new array with the result of the playlistToPlaylistModel
        playlistToPlaylistModel(p)                         // 
      );
      console.log('process.ts:  currentState.toProcess is being updated to ' + currentState.playlists.length)
      currentState.toProcess = currentState.playlists.length // Removed because don't care about saved tracks + 1 /* saved tracks */;
      currentState.toDownload = currentState.playlists.length // Separate counter for downloading
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

      currentState.toDownload--;

      this.dispatch('updateState', currentState);

      for (const playlistModel of currentState.playlists) {
        if (playlistCache.needsTracksDownloading(playlistModel.playlist)) {
          try {
            console.log('process.ts:  process func Downloading tracks for playlist ' + playlistModel.playlist.name)
            const playlistTracks = await PlaylistDeduplicator.getTracks(
              api,
              playlistModel.playlist
            );

            playlistModel.tracks = playlistTracks;

            // The old code to find duplicate tracks, we have now moved this to processAllPlaylists() so that the de-dupe only runs after all playlists are downloaded
            /*
            console.log('process.ts:  process func about to find duplicate tracks  ' + playlistModel.playlist.name)
            playlistModel.duplicates = PlaylistDeduplicator.findDuplicatedTracks(
              playlistTracks
            );
            if (playlistModel.duplicates.length === 0) {
              playlistCache.storePlaylistWithoutDuplicates(
                playlistModel.playlist
              );
            }
            */
            onPlaylistDownloaded(playlistModel);

          } catch (e) {
            console.error(
              'There was an error fetching tracks for playlist',
              playlistModel.playlist,
              e
            );
            onPlaylistDownloaded(playlistModel);
          }
        } else {
          onPlaylistDownloaded(playlistModel);
        }
      }
    }
  };
}


