import { SpotifyPlaylistType } from './spotifyApi';
const SNAPSHOT_VERSION = 'v1';
export default class PlaylistCache {
  needsCheckForDuplicates(playlist: SpotifyPlaylistType) {
    console.log('playlistCache.ts:  needsCheckForDuplicates is called for playlist ' + playlist.name)
    if ('snapshot_id' in playlist) {
      try {
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
        localStorage.setItem(playlist.snapshot_id, SNAPSHOT_VERSION);
      } catch (e) { }
    }
  }
}
