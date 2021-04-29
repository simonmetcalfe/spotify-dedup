import promisesForPages from './promiseForPages';
import SpotifyWebApi, {
  SpotifyTrackType,
  SpotifyPlaylistType,
  SpotifyPlaylistTrackType,
  SpotifySavedTrackType,
} from './spotifyApi';
import { PlaylistModel, InPlaylistsModel } from './types';

class BaseDeduplicator {
  async removeDuplicates(model) {
    throw 'Not implemented';
  }

  async getTracks() {
    throw 'Not implemented';
  }

  static findDuplicatedTracksInAllPlaylists(currentPlaylist: PlaylistModel, allPlaylists: Array<PlaylistModel>) {
    const result = currentPlaylist.tracks.reduce((duplicates, track, index) => {
      if (track === null) return duplicates;
      if (track.id === null) return duplicates;
      let foundInPlaylists: Array<InPlaylistsModel> = []; // Build an array of all places the track is seen, as we iterate through all the user's playlists
      const seenNameAndArtistKey = `${track.name}:${track.artists[0].name}`.toLowerCase();
      allPlaylists.forEach(function (playlistToCompare, playlistToCompareIndex) {
        if (currentPlaylist.playlist.name != playlistToCompare.playlist.name) { // Don't compare playlist with itself
          //console.log('deduplicator.ts:  Comparing ' + playlist.playlist.name + ' with ' + playlistModel.playlist.name);
          playlistToCompare.tracks.forEach(function (trackToCompare, trackToCompareIndex) {
            let isDuplicate = '';
            let similarTrack = null;
            //console.log('Comparing playlist ' + playlistModel.playlist.name + ' and track ' + spotifyTrackType.name)
            if (track.id === trackToCompare.id) {
              //console.log('Dupe of ' + trackToCompare.name + ' (' + index + ') found in ' + playlistToCompare.playlist.name + ' (' + playlistToCompareIndex + ') at pos ' + trackToCompareIndex + ' when playlist ' + currentPlaylist.playlist.name + ' is compared with ' + playlistToCompare.playlist.name)
              isDuplicate = 'same-id';
            }
            else if (seenNameAndArtistKey === `${trackToCompare.name}:${trackToCompare.artists[0].name}`.toLowerCase()
              && Math.abs(track.duration_ms - trackToCompare.duration_ms) < 2000) {
              //console.log('Similar dupe of ' + trackToCompare.name + ' found in ' + playlistToCompare.playlist.name)
              isDuplicate = 'same-name-artist';
              similarTrack = trackToCompare; // Save similar track so we can find and delete it easily 
            }
            if (isDuplicate != '') {
              foundInPlaylists.push({
                trackIndex: trackToCompareIndex, // The location of the duplicate track in the foreign playlist 
                playlistIndex: playlistToCompareIndex, // The location of the foreign playlist in the store
                reason: isDuplicate,
                playlist: playlistToCompare.playlist,
                similarTrack: similarTrack
              })
            }
          });
        }
      });

      // Finally after iterating through all playlists, if track was found in 1 or more playlists (foundInPlaylists[] is not empty), add the duplicate
      if (foundInPlaylists.length > 0) {
        //console.log('deduplicator.ts:  Duplicates found for ' + track.name + ' and the foundInPlaylists array size is ' + foundInPlaylists.length)
        duplicates.push({
          trackIndex: index,
          track: track,
          inPlaylists: foundInPlaylists
        })
      } else {
        //console.log('deduplicator.ts:  NO duplicates found for ' + track.name)
      }

      return duplicates;
    }, []);
    return result;
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
      const seenNameAndArtistKey = `${track.name}:${track.artists[0].name}`.toLowerCase();
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
        .then((
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

  static async removeTrack(
    api: SpotifyWebApi,
    uri: string,
    index: number,
    playlistModel: PlaylistModel
  ) {
    return Promise.resolve().then(function () {
      console.log('Deduplicator.ts:  Removing track from playlist')
      if (playlistModel.playlist.id === 'starred') {
        return Promise.reject('It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.')
      }
      if (playlistModel.playlist.collaborative) {
        return Promise.reject('It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.')
      }
      else {
        let track = [uri];
        return api.removeTracksFromPlaylist(
          playlistModel.playlist.owner.id,
          playlistModel.playlist.id,
          track
        )
      }
    }).then(function (result) {
      // Do some processing if needed?
      return Promise.resolve()
    }).catch(function (e) {
      return Promise.reject('deduplicator.ts:  Could not remove track from playlist!!')
    })
  }

  static async removeDuplicates(
    api: SpotifyWebApi,
    playlistModel: PlaylistModel
  ) {
    return new Promise((resolve, reject) => {
      console.log('deduplicator.ts:  removeDuplicates for playlist tracks is called')
      if (playlistModel.playlist.id === 'starred') {
        reject(
          'It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
        );
      }
      if (playlistModel.playlist.collaborative) {
        reject(
          'It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
        );
      } else {
        const tracksToRemove = playlistModel.duplicates
          .map((d) => ({
            uri: d.track.linked_from ? d.track.linked_from.uri : d.track.uri,
            positions: [d.trackIndex],
          }))
          .reverse(); // reverse so we delete the last ones first
        const promises = [];
        do {
          const chunk = tracksToRemove.splice(0, 100); // Moves the first n items from tracksToRemove to the variable 'chunk'
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
            playlistModel.duplicates = [];
            resolve();
          })
          .catch((e) => {
            reject(e);
          });
      }
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
        .then((
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
    return new Promise((resolve, reject) => {
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
