import promisesForPages from './promiseForPages';
import SpotifyWebApi, {
  SpotifyTrackType,
  SpotifyPlaylistType,
  SpotifyPlaylistTrackType,
  SpotifySavedTrackType,
} from './spotifyApi';
import { PlaylistModel, InPlaylistsModel, TrackModel } from './types';

class BaseDeduplicator {
  async removeDuplicates(model) {
    throw 'Not implemented';
  }

  async getTracks() {
    throw 'Not implemented';
  }

  static findDuplicatedTracksInAllPlaylists(currentPlaylist: PlaylistModel, allPlaylists: Array<PlaylistModel>, savedTracks: Array<TrackModel>) {
    currentPlaylist.tracks.forEach((track, index) => {
      if (track === null) return;
      if (track.track.id === null) return;
      let foundInPlaylists: Array<InPlaylistsModel> = []; // Build an array of all places the track is seen, as we iterate through all the user's playlists
      const seenNameAndArtistKey = `${track.track.name}:${track.track.artists[0].name}`.toLowerCase();
      allPlaylists.forEach(function (playlistToCompare, playlistToCompareIndex) {
        if (currentPlaylist.playlist.id != playlistToCompare.playlist.id) { // Don't compare playlist with itself //TODO:  Was previously .name, needs testing
          //console.log('deduplicator.ts:  Comparing ' + playlist.playlist.name + ' with ' + playlistModel.playlist.name);
          playlistToCompare.tracks.forEach(function (trackToCompare, trackToCompareIndex) {
            let isDuplicate = '';
            //console.log('Comparing playlist ' + playlistModel.playlist.name + ' and track ' + spotifyTrackType.name)
            if (track.track.id === trackToCompare.track.id) {
              //console.log('Dupe of ' + trackToCompare.name + ' (' + index + ') found in ' + playlistToCompare.playlist.name + ' (' + playlistToCompareIndex + ') at pos ' + trackToCompareIndex + ' when playlist ' + currentPlaylist.playlist.name + ' is compared with ' + playlistToCompare.playlist.name)
              isDuplicate = 'same-id';
            }
            else if (seenNameAndArtistKey === `${trackToCompare.track.name}:${trackToCompare.track.artists[0].name}`.toLowerCase()
              && Math.abs(track.track.duration_ms - trackToCompare.track.duration_ms) < 2000) {
              //console.log('Similar dupe of ' + trackToCompare.name + ' found in ' + playlistToCompare.playlist.name)
              isDuplicate = 'same-name-artist';
            }
            if (isDuplicate != '') {
              foundInPlaylists.push({
                foreignPlaylistIndex: playlistToCompare.origIndex, // The location of the foreign playlist in the store
                foreignTrackIndex: trackToCompare.origIndex, // The location of the duplicate track in the foreign playlist 
                reason: isDuplicate,
                playlist: playlistToCompare.playlist,
                trackToRemove: trackToCompare // Save the the track that needs to be removed, whether it be identical or similar
              })
            }
          });
        }
      });

      // Check if it is a liked song, and if so marked as liked + set inPlaylists for the liked song so it knows it is in a playlist
      savedTracks.forEach(function (savedTrackToCompare) {
        let isDuplicate = '';
        if (track.track.id === savedTrackToCompare.track.id) {
          isDuplicate = 'same-id';
        }
        else if (seenNameAndArtistKey === `${savedTrackToCompare.track.name}:${savedTrackToCompare.track.artists[0].name}`.toLowerCase()
          && Math.abs(track.track.duration_ms - savedTrackToCompare.track.duration_ms) < 2000) {
          isDuplicate = 'same-name-artist';
        }
        if (isDuplicate != '') {
          // Tell track it is in the saved/liked list
          track.isLiked = true;
          // Tell saved/liked entry which playlist(s) it also appears in
          savedTrackToCompare.inPlaylists.push({
            foreignPlaylistIndex: currentPlaylist.origIndex, // The location of the playlist in the store
            foreignTrackIndex: track.origIndex, // Index of the current track in its playlist
            reason: isDuplicate,
            playlist: currentPlaylist.playlist,
            trackToRemove: track // Save the the track that needs to be removed, whether it be identical or similar
          })
        }
      })

      track.inPlaylists = foundInPlaylists; // Update the track with its found locations.  
      return track;
    }, []);
  }

  //TODO:  This is not used, consider removing
  static findDuplicatedTracks(tracks: Array<SpotifyTrackType>) {
    var tracklist = '';
    for (let i = 0; i < tracks.length; i++) {
      tracklist += tracks[i].name + ', '
    }
    // console.log('deduplicator.ts:  findDuplicatedTracks running for tracks ' + tracklist)

    const seenIds: { [key: string]: boolean } = {};
    const seenNameAndArtist: { [key: string]: Array<number> } = {};

    const result = tracks.reduce((duplicates, track, index) => {
      if (track === null) return duplicates;
      if (track.id === null) return duplicates;
      let isDuplicate = false;
      const seenNameAndArtistKey =
        `${track.name}:${track.artists[0].name}`.toLowerCase();
      if (track.id in seenIds) {
        // if the two tracks have the same Spotify ID, they are duplicates
        isDuplicate = true;
        //console.log('deduplicator.ts:  tracks.reduce found duplicate ' + track.id + ' ' + track.name)
      } else {
        // if they have the same name, main artist, and roughly same duration
        // we consider tem duplicates too
        if (seenNameAndArtistKey in seenNameAndArtist) {
          // we check if _any_ of the previous durations is similar to the one we are checking
          if (
            seenNameAndArtist[seenNameAndArtistKey].filter(
              (duration) => Math.abs(duration - track.duration_ms) < 2000
            ).length !== 0
          ) {
            isDuplicate = true;
            //console.log('deduplicator.ts:  tracks.reduce found similar ' + track.id + ' ' + track.name)
          }
        }
      }
      if (isDuplicate) {
        duplicates.push({
          index: index,
          track: track,
          reason: track.id in seenIds ? 'same-id' : 'same-name-artist',
        });
      } else {
        seenIds[track.id] = true;
        seenNameAndArtist[seenNameAndArtistKey] =
          seenNameAndArtist[seenNameAndArtistKey] || [];
        seenNameAndArtist[seenNameAndArtistKey].push(track.duration_ms);
      }
      return duplicates;
    }, []);

    var tracklist = '';
    for (let i = 0; i < result.length; i++) {
      tracklist += result[i].track.name + ', ' + result[i].index + ', ' + result[i].track.id + ', '
    }
    console.log('deduplicator.ts:  findDuplicatedTracks array after reduce is ' + tracklist)
    return result;
  }
}

export class PlaylistDeduplicator extends BaseDeduplicator {
  static async getTracks(
    api: SpotifyWebApi,
    playlist: SpotifyPlaylistType
  ): Promise<Array<SpotifyTrackType>> {
    return new Promise((resolve, reject) => {
      const tracks = [];
      //console.log('deduplicator.ts:  PlaylistDeduplicator getTracks running for playlist ' + playlist.name)
      promisesForPages(
        api,
        api.getGeneric(playlist.tracks.href) // 'https://api.spotify.com/v1/users/11153223185/playlists/0yygtDHfwC7uITHxfrcQsF/tracks'
      )
        .then(
          (
            pagePromises // todo: I'd love to replace this with
          ) =>
            // .then(Promise.all)
            // à la http://www.html5rocks.com/en/tutorials/es6/promises/#toc-transforming-values
            Promise.all(pagePromises)
        )
        .then((pages) => {
          pages.forEach((page) => {
            page.items.forEach((item: SpotifyPlaylistTrackType) => {
              tracks.push(item && item.track);
            });
          });
          for (let i = 0; i < tracks.length; i++) {
            // console.log('deduplicator.ts:  getTracks got track ' + tracks[i].name)
          }
          resolve(tracks);
        })
        .catch(reject);
    });
  }


  static async removeDuplicates(
    api: SpotifyWebApi,
    playlistModel: PlaylistModel,
  ) {
    return new Promise<void>((resolve, reject) => {

      if (playlistModel.playlist.id === 'starred') {
        reject(new Error('cannot_remove_track_starrred_playlist')); // Might be obsolete now 
      }
      if (playlistModel.playlist.collaborative) {
        reject(new Error('cannot_remove_track_collaborative_playlist')); // Removal from collaboative playlists IS supported (probs only if owned) but is rejected for safety 
      }

      let tracksToRemove;

      tracksToRemove = playlistModel.tracks
        .map((d) => ({
          uri: d.track.linked_from ? d.track.linked_from.uri : d.track.uri,
          positions: [d.arrayIndex],
        }))
        .reverse(); // reverse so we delete the last ones first


      tracksToRemove.forEach(function () {
        console.log('TTR ' + JSON.stringify(tracksToRemove))
      })

      const promises = [];
      do {
        //TODO:  Chunk size reduced from 100 to 10 for testing
        const chunk = tracksToRemove.splice(0, 100); // Moves the first n items from tracksToRemove to the variable 'chunk'
        console.log('deduplicator.ts:  removeDuplicates running splice of tracksToRemove.');
        (function (playlistModel, chunk, api) {
          promises.push(() =>
            api.removeTracksFromPlaylist(
              playlistModel.playlist.owner.id,
              playlistModel.playlist.id,
              chunk
            )
          );
        })(playlistModel, chunk, api);
      } while (tracksToRemove.length > 0);

      promises
        .reduce(
          (promise, func) => promise.then(() => func()),
          Promise.resolve(null)
        )
        .then(() => {
          console.log('EVERYTHING DONE?  Promises.length is ' + promises.length)
          // playlistModel.duplicates = [];  // pointless
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}

export class SavedTracksDeduplicator extends BaseDeduplicator {
  static async getTracks(
    api: SpotifyWebApi,
    initialRequest
  ): Promise<Array<SpotifyTrackType>> {
    return new Promise((resolve, reject) => {
      const tracks = [];
      //console.log('deduplicator.ts:  SavedTracksDeduplicator getTracks running for saved tracks ')
      promisesForPages(api, initialRequest)
        .then(
          (
            pagePromises // todo: I'd love to replace this with
          ) =>
            // .then(Promise.all)
            // à la http://www.html5rocks.com/en/tutorials/es6/promises/#toc-transforming-values
            Promise.all(pagePromises)
        )
        .then((pages) => {
          pages.forEach((page) => {
            page.items.forEach((item: SpotifySavedTrackType) => {
              tracks.push(item.track);
            });
          });

          for (let i = 0; i < tracks.length; i++) {
            // console.log('deduplicator.ts:  getTracks for SAVED TRACKS got track ' + tracks[i].name)
          }
          resolve(tracks);
        })
        .catch((e) => {
          console.error(
            `There was an error fetching the tracks from playlist ${initialRequest.href}`,
            e
          );
          reject(e);
        });
    });
  }

  static async removeDuplicates(
    api: SpotifyWebApi,
    model: {
      duplicates: Array<{
        index: number;
        reason: string;
        track: SpotifyTrackType;
      }>;
    }
  ) {
    return new Promise<void>((resolve, reject) => {
      console.log('deduplicator.ts:  removeDuplicates for saved tracks is called')
      const tracksToRemove: Array<string> = model.duplicates.map((d) =>
        d.track.linked_from ? d.track.linked_from.id : d.track.id
      );
      do {
        (async () => {
          const chunk = tracksToRemove.splice(0, 50);
          await api.removeFromMySavedTracks(chunk);
        })();
      } while (tracksToRemove.length > 0);
      model.duplicates = [];
      resolve();
    });
  }
}
