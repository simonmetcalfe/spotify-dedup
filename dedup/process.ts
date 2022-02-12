import { fetchUserOwnedPlaylists } from './library';
import { PlaylistDeduplicator, SavedTracksDeduplicator } from './deduplicator';
import PlaylistCache from './playlistCache';
import { PlaylistModel, DuplicatesModel, InPlaylistsModel } from './types';
import SpotifyWebApi, {
  SpotifyUserType,
  SpotifyPlaylistType,
  SpotifyTrackType,
} from './spotifyApi';

const playlistCache = new PlaylistCache();

// Sleep helper function used to ensur React UI will update during plalist processing
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Converts the SpotifyPlaylistType array (returned by fetchUserOwnedPlaylists) to a PlaylistModel array
// Used to populate currentState.playlists (an array of PlaylistModel) with an entry for each playlist in Spotify (stored in playlistsToCheck - an array of SportifyPlaylistType) 
// All the properties of PlaylistModel are blank/false, except for the playlist itself.  The other properties are added when each PlaylistModel element is processed 
const playlistToPlaylistModel = (
  playlist: SpotifyPlaylistType,
  index: number
): PlaylistModel => ({
  playlistIndex: index,
  playlist: playlist,
  duplicates: new Array<DuplicatesModel>(),
  tracks: new Array<SpotifyTrackType>(),
  status: '',
  processed: false,
  downloaded: false, // Added because we are handling downloading separately
});


// Concerts the SpotifyTrackType we receive from getTracks (saved tracks) into the DuplicatesModel
// We manage the entire saved/liked songs library within the duplicates model - they are only removed if unliked
const spotifyTrackTypeToDuplicatesModel = (
  track: SpotifyTrackType,
  index: number
): DuplicatesModel => ({
  trackIndex: index,
  track: track,
  inPlaylists: new Array<InPlaylistsModel>()
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
    // console.log('process.ts:  process async running')
    // const is used to fix the model of currentState, but each object inside is modifyable
    const currentState: {
      toProcess?: number;
      toDownload?: number;
      playlists?: Array<PlaylistModel>;
      savedTracks?: {
        status?: string; //TODO: Not sure if this is used, but it exists in the model in main.tsx
        duplicates?: Array<DuplicatesModel>; // We consider all liked songs a 'duplicate' even if they don't appear in playlists
      };

    } = {};

    const dispatch = this.dispatch.bind(this);

    function onPlaylistDownloaded(playlist: PlaylistModel) {
      // console.log('process.ts:  onPlaylistDownloaded running for ' + playlist.playlist.name) // Model is just SportifyPlaylistType and duplicates array
      /*
      var tracklist = '';
      for (let i = 0; i < playlist.tracks.length; i++) {
        tracklist += '(' + i + ') ' + playlist.tracks[i].name + '\n'
      }
      console.log('process.ts:  onPlaylistDownloaded tracks in ' + playlist.playlist.name + ' are ' + tracklist)
      */

      playlist.downloaded = true;
      currentState.toDownload -= 1;
      if (currentState.toDownload === 0) {
        processAllPlaylists(); // Run the processing ONLY if all playlists are downloaded
      }
      dispatch('updateState', currentState);
    }

    function processAllPlaylists() {
      // console.log('process.ts:  processAllPlaylists running')
      for (const playlistModel of currentState.playlists) {
        //console.log('process.ts:  process func about to find duplicate tracks  ' + playlistModel.playlist.name)
        sleep(1).then(() => {
          playlistModel.duplicates = PlaylistDeduplicator.findDuplicatedTracksInAllPlaylists(playlistModel, currentState.playlists, currentState.savedTracks.duplicates);
          onPlaylistProcessed(playlistModel);
          // console.log('process.ts:  Contents of playlistModel.duplicates for ' + playlistModel.playlist.name + ' is ' + JSON.stringify(playlistModel.duplicates))
        })
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
      // console.log('process.ts:  onPlaylistProcessed running for ' + playlist.playlist.name + ' with currentState.toProcess at ' + currentState.toProcess) // Model is just SportifyPlaylistType and duplicates array
      playlist.processed = true;
      currentState.toProcess -= 1;
      dispatch('updateState', currentState);
    }

    let playlistsToCheck = [];
    const ownedPlaylists: Array<SpotifyPlaylistType> = await fetchUserOwnedPlaylists(
      api,
      user.id
    ).catch((e) => {
      console.error("Process.ts:  There was an error fetching user's playlists", e);
    });

    if (ownedPlaylists) {
      playlistsToCheck = ownedPlaylists;
      currentState.playlists = playlistsToCheck.map((playlist, index) => // Create a new array with the result of the playlistToPlaylistModel
        playlistToPlaylistModel(playlist, index)
      );
      // console.log('process.ts:  currentState.toProcess and currentState.toDownload set to ' + currentState.playlists.length)

      //TODO:   Remove hacky speedup for a large Spotify account - TESTING ONLY
      currentState.playlists.length = 8;

      currentState.toDownload = currentState.playlists.length + 1 // +1 accounts for downloading liked tracks 
      currentState.toProcess = currentState.playlists.length + 1
      currentState.savedTracks = {};

      // Get saved tracks
      const savedTracks = await SavedTracksDeduplicator.getTracks(
        api,
        api.getMySavedTracks({ limit: 50 })
      );
      currentState.toDownload--; // Decriment when the saved tracks have been downloaded

      currentState.savedTracks.duplicates = savedTracks.map((playlist, index) => // Migrate saved tracks to the duplicates model without processing
        spotifyTrackTypeToDuplicatesModel(playlist, index)
      );
      currentState.toProcess--;

      this.dispatch('updateState', currentState);

      // Download tracks for each playlist
      for (const playlistModel of currentState.playlists) {
        if (playlistCache.needsTracksDownloading(playlistModel.playlist)) {
          try {
            //console.log('process.ts:  process func Downloading tracks for playlist ' + playlistModel.playlist.name)
            const playlistTracks = await PlaylistDeduplicator.getTracks(
              api,
              playlistModel.playlist
            );

            playlistModel.tracks = playlistTracks;
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


