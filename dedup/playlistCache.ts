import { SpotifyPlaylistType } from './spotifyApi';
const SNAPSHOT_VERSION = 'v1';
export default class PlaylistCache {
  needsTracksDownloading(playlist: SpotifyPlaylistType) {
    console.log('playlistCache.ts:  needsTracksDownloading is called for playlist ' + playlist.name)
    if ('snapshot_id' in playlist) {
      try {
        console.log('playlistCache.ts:  Getting item from localStorage:  ' + playlist.snapshot_id + ':' + SNAPSHOT_VERSION)
        if (localStorage.getItem(playlist.snapshot_id) === SNAPSHOT_VERSION) {
          return false;
        }
      } catch (e) {
        return true;
      }
    }
    return true;
  }

  storePlaylistWithoutDuplicates(playlist: SpotifyPlaylistType) {
    console.log('playlistCache.ts:  storePlaylistWithoutDuplicates is called for playlist ' + playlist.name)
    if ('snapshot_id' in playlist) {
      try {
        console.log('playlistCache.ts:  Setting item to localStorage:  ' + playlist.snapshot_id + ':' + SNAPSHOT_VERSION)
        localStorage.setItem(playlist.snapshot_id, SNAPSHOT_VERSION);
      } catch (e) { }
    }
  }
}

