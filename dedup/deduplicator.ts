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

  static findDuplicatedTracksInAllPlaylists(playlist: PlaylistModel, playlists: Array<PlaylistModel>) {
    const result = playlist.tracks.reduce((duplicates, track, index) => {
      if (track === null) return duplicates;
      if (track.id === null) return duplicates;
      let foundInPlaylists: Array<InPlaylistsModel> = []; // Build an array of all places the track is seen, as we iterate through all the user's playlists
      const seenNameAndArtistKey = `${track.name}:${track.artists[0].name}`.toLowerCase();
      playlists.forEach(function (playlistModel, playlistIndex) {
        if (playlist.playlist.name != playlistModel.playlist.name) { // Don't compare playlsit with itself
          //console.log('deduplicator.ts:  Comparing ' + playlist.playlist.name + ' with ' + playlistModel.playlist.name);
          playlistModel.tracks.forEach(function (spotifyTrackType, trackIndex) {
            let isDuplicate = '';
            //console.log('Comparing playlist ' + playlistItem.playlist.name + ' and track ' + trackItem.name)
            if (track.id === spotifyTrackType.id) {
              // console.log('Dupe of ' + spotifyTrackType.name + ' found in ' + playlistModel.playlist.name)
              isDuplicate = 'same-id';
            }
            else if (seenNameAndArtistKey === `${spotifyTrackType.name}:${spotifyTrackType.artists[0].name}`.toLowerCase()
              && Math.abs(track.duration_ms - spotifyTrackType.duration_ms) < 2000) {
              // console.log('Similar dupe of ' + spotifyTrackType.name + ' found in ' + playlistModel.playlist.name)
              isDuplicate = 'same-name-artist';
            }
            if (isDuplicate != '') {
              foundInPlaylists.push({
                index: playlistIndex + trackIndex, // Crude way of making a unique index number, think its needed for React though
                reason: isDuplicate,
                playlist: playlistModel.playlist
              })
            }
          });
        }
      });

      // Finally after iterating through all playlists, if track was found in 1 or more playlists (foundInPlaylists[] is not empty), add the duplicate
      if (foundInPlaylists.length > 0) {
        // console.log('deduplicator.ts:  Duplicates found for ' + track.name + ' and the foundInPlaylists array size is ' + foundInPlaylists.length)
        duplicates.push({
          index: index,
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
            //onsole.log('deduplicator.ts:  tracks.reduce found similar ' + track.id + ' ' + track.name)
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
            positions: [d.index],
          }))
          .reverse(); // reverse so we delete the last ones first
        const promises = [];
        do {
          const chunk = tracksToRemove.splice(0, 100);
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
