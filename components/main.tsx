import React from 'react';

import { useTranslation, Translation, getI18n } from 'react-i18next';
import { PlaylistModel, TrackModel, DuplicatesCsvExportModel } from '../dedup/types';

import { SpotifyUserType, SpotifyTrackType } from '../dedup/spotifyApi';

import Process from '../dedup/process';

import { PlaylistDeduplicator } from '../dedup/deduplicator';

import BuyMeACoffee from './bmc';
import Panel from './panel';
import { DuplicateTrackList } from './duplicateTrackList';
import { DuplicateTrackListItem } from './duplicateTrackListItem';
import { Badge } from './badge';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { CSVLink, CSVDownload } from "react-csv";
import { Duplex } from 'stream';

const Status = ({ toProcess }) => {
  const { t } = useTranslation();
  return (
    <span>
      <h3>
        {toProcess > 0 || toProcess === null
          ? 'FINDING!!!'  // TODO:  Investigate and resinstate translation function, and add downloading status  -  t('process.status.finding')
          : 'COMPLETE!!!'  // TODO:  Investigate and resinstate translation function, and add downloading status  -  t('process.status.complete')
        }
      </h3>
      <style jsx>
        {`
          h3 {
            font-size: 24px;
          }
        `}
      </style>
    </span>
  );
};

type StateType = {
  toProcess?: number;
  toDownload?: number;
  playlists: Array<PlaylistModel>;
  savedTracks: {
    status?: string;
    tracks: Array<TrackModel>;
  };
};

export default class Main extends React.Component<{
  api: any;
  user: SpotifyUserType;
  accessToken: string;
}> {
  state: StateType = {
    toProcess: null,
    toDownload: null,
    playlists: [],
    savedTracks: {
      status: null,
      tracks: [],
    },
  };


  // updateState is set inside Process, by using the dispatch function
  componentDidMount() {
    const process = new Process();
    process.on('updateState', (state) => {
      this.setState(state);
      //console.log('main.tsx:  componentDidMount() has setState, contents now is ' + this.state)
    });
    // Starts the process function inside of Process
    // Where does this.props come from?
    process.process(this.props.api, this.props.user);
  }

  getDuplicatesCsv() {
    const csv: Array<DuplicatesCsvExportModel> = [];
    // Saved/liked (NOTE:  Exports all tracks and not just those which are 'duplicated' in playlists)
    for (let i = 0; i < this.state.savedTracks.tracks.length; i++) {
      var inPlaylists = '';
      var similarInPlaylists = '';
      for (let o = 0; o < this.state.savedTracks.tracks[i].inPlaylists.length; o++) {
        if (this.state.savedTracks.tracks[i].inPlaylists[o].reason === 'same-id') {
          if (inPlaylists !== '') { inPlaylists += ',' }
          inPlaylists += this.state.savedTracks.tracks[i].inPlaylists[o].playlist.name
        } else {
          if (similarInPlaylists !== '') { similarInPlaylists += ',' }
          similarInPlaylists += this.state.savedTracks.tracks[i].inPlaylists[o].playlist.name
        }

        csv.push({
          playlist_id: 'liked',
          playlist_name: 'liked',
          playlist_owner: this.props.user.display_name,
          track_id: this.state.savedTracks.tracks[i].track.id,
          track_name: this.state.savedTracks.tracks[i].track.name,
          liked: true,
          track_artist: this.state.savedTracks.tracks[i].track.artists[0].name,
          track_duration: this.state.savedTracks.tracks[i].track.duration_ms,
          in_playlists: inPlaylists,
          similar_in_playlists: similarInPlaylists
        })
      }
    }
    // Playlists
    for (let i = 0; i < this.state.playlists.length; i++) {
      for (let n = 0; n < this.state.playlists[i].tracks.length; n++) {
        var inPlaylists = '';
        var similarInPlaylists = '';
        for (let o = 0; o < this.state.playlists[i].tracks[n].inPlaylists.length; o++) {
          if (this.state.playlists[i].tracks[n].inPlaylists[o].reason === 'same-id') {
            if (inPlaylists !== '') { inPlaylists += ',' }
            inPlaylists += this.state.playlists[i].tracks[n].inPlaylists[o].playlist.name
          } else {
            if (similarInPlaylists !== '') { similarInPlaylists += ',' }
            similarInPlaylists += this.state.playlists[i].tracks[n].inPlaylists[o].playlist.name
          }
        }

        csv.push({
          playlist_id: this.state.playlists[i].playlist.id,
          playlist_name: this.state.playlists[i].playlist.name,
          playlist_owner: this.state.playlists[i].playlist.owner.display_name,
          track_id: this.state.playlists[i].tracks[n].track.id,
          track_name: this.state.playlists[i].tracks[n].track.name,
          liked: this.state.playlists[i].tracks[n].isLiked,
          track_artist: this.state.playlists[i].tracks[n].track.artists[0].name,
          track_duration: this.state.playlists[i].tracks[n].track.duration_ms,
          in_playlists: inPlaylists,
          similar_in_playlists: similarInPlaylists
        })
      }
    }
    return csv;
  }

  saveFile(filename, data) {
    const blob = new Blob([data], { type: 'text/csv' });
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }

  saveState() {
    this.saveFile('spotify-dedup-store.txt', JSON.stringify(this.state))
  }


  playTrack = (id: string) => {
    (async () => {
      console.log('main.tsx:  playTrack playing ' + id)
      await this.props.api.previewTrack(id)
        .then(function (result) {
          // Nothing to do
        }).catch(function (err) {
          global['Raven'] &&
            global['Raven'].captureMessage(
              `Exception trying to play a track`,
              {},
            );
          console.log(`main.tsx ERROR ${err.status != undefined && err.status} ${err.name != undefined && err.name} ${err.message != undefined && err.message} ${err.json != undefined && JSON.stringify(err.json)}`)
          err.name == 'TypeError' ?
            toast.error('Cannot play track.  Check your internet connection.')
            : err.name == 'ApplicationException' && err.json.error.reason == 'NO_ACTIVE_DEVICE' ?
              toast.warn('Cannot play track.  Wake up Spotify by playing a song from your Spotify player.')
              : err.name == 'ApplicationException' && err.json.error.reason == 'PREMIUM_REQUIRED' ?
                toast.warn('Cannot play track.  You need a premium subscription.')
                : err.name == 'ApplicationException' && err.status == 401 ?
                  toast.error('Connection to Spotify expired.  Reload the page to connect again.')
                  :
                  toast.error('Cannot play track.  An unknown error occurred.')
        })
    })();
  }

  toggleLiked(id, likedCurrentStatus) {
    console.log('main.tsx:  toggleLiked pressed for ' + id + ' with Liked current status as ' + likedCurrentStatus)
  }

  removeTracks = (basePlaylist: PlaylistModel, dupeIndex?: number) => {
    const self = this; // Needed for functions inside to access other functions
    (async () => {

      let filteredBasePlaylist = Object.create(basePlaylist); // Make a copy of the base playlist so we can filter it

      if (dupeIndex == undefined) {
        // Removing multiple tracks - filter to contain only items with duplicates
        console.log('ALL DUPE TRACKS REMOVAL');
        filteredBasePlaylist.tracks = basePlaylist.tracks.filter((t) =>
          t.inPlaylists.length > 0
        )
      } else {
        // Removing single track - filter the array to contain 1 item
        console.log('SINGLE TRACKS REMOVAL');
        filteredBasePlaylist.tracks = basePlaylist.tracks.filter((t) =>
          t.origIndex == dupeIndex
        )
      }

      console.log(`filtered base playlist size is ${filteredBasePlaylist.tracks.length}`)
      console.log(`filtered base playlist inPlaylists size is ${filteredBasePlaylist.tracks[0].inPlaylists.length}`)

      printTrackToRemove(filteredBasePlaylist);

      self.updateUi(filteredBasePlaylist);

      /*
      await PlaylistDeduplicator.removeDuplicates(
        null, // this.props.api,
        null // filteredBasePlaylist // Filtered playlist contains only the dupplicate tracks
      ).then(function (result) {
        console.log('Main dupes removed, doing children');
        // Update UI 
         self.updateUi(filteredBasePlaylist); 
        return Promise.resolve('megacunt');
      }).catch(function (err) {
        //TODO:  Merge all error handling into a single place
        console.log(`main.tsx ERROR ${err.status != undefined && err.status} ${err.name != undefined && err.name} ${err.message != undefined && err.message} ${err.json != undefined && JSON.stringify(err.json)}`)
        err.message == 'cannot_remove_track_starrred_playlist' ?
          toast.warn('Cannot remove duplicate(s) from your starred playlist!  Please remove them manually.')
          : err.message == 'cannot_remove_track_collaborative_playlist' ?
            toast.warn('Cannot remove duplicate(s) from collaborative playlists!  Please remove them manually.')
            : err.name == 'TypeError' && err.message == 'Failed to fetch' ?
              toast.error('Cannot remove duplicate(s).  Check your internet connection.')
              : err.name == 'ApplicationException' && err.status == 400 ?
                toast.error('Cannot remove duplicate(s).  Track already removed or app out of sync with Spotify.  Try reloading the page.')
                : err.name == 'ApplicationException' && err.status == 401 ?
                  toast.error('Connection to Spotify expired.  Reload the page to connect again.')
                  :
                  toast.error('Cannot remove duplicate(s).  An unknown error occurred.')
        global['Raven'] &&
          global['Raven'].captureMessage(
            `Exception trying to remove duplicates from playlist`,
            {
              extra: {
                duplicates: filteredBasePlaylist.tracks,
              },
            }
          );
      });

      */


      // Print the remove request to the console
      function printTrackToRemove(pl: PlaylistModel) {
        pl.tracks.forEach((track) => {
          const tName = track.track.name;
          const tId = track.track.id;
          const pName = pl.playlist.name;
          const pId = pl.playlist.id;
          const foreignPlOccurencesAsString = track.inPlaylists.map((inPlaylist) => {
            return `  Tr${inPlaylist.foreignTrackIndex} ${inPlaylist.playlist.name} (${inPlaylist.foreignPlaylistIndex}) (${inPlaylist.playlist.id}) ${inPlaylist.reason == 'same-id' ? '' : '(similar: ' + inPlaylist.trackToRemove.track.id + ')'}`
          }).join('\n');
          console.log(`main.tsx:
            Removing ${tName} 
            (${tId})
            from ${pName} (${pl.origIndex}) (${pId}) 
            Pos ${track.origIndex}/${track.arrayIndex}
            Duplicates  \n${foreignPlOccurencesAsString} 
            `);
        })
      }
    })();


  }

  // UpdateUI is expected to be used with a filtered playlist containing only dupliated tracks.
  // The filtered playlist is used to update the state, which in turn updates the UI
  updateUi = (playlist: PlaylistModel) => {
    (async () => {
      const playlistsCopy = [...this.state.playlists];  // Make a copy of all playlists for deleting records

      // Iterate through each dupe track, removing for from foreign playlists and then deleting the track completely
      playlist.tracks.forEach((t, ind) => {
        console.log(` PROCESS ${t.track.name} in ${playlist.playlist.name} (${playlist.origIndex}) (dupe ${ind} of ${playlist.tracks.length})`)
        removeInPlaylistItems(t);

        console.log(`Pl array size before delete ${playlistsCopy[playlist.origIndex].tracks.length}`)
        let arrayIndexToDelete = playlistsCopy[playlist.origIndex].tracks.findIndex((tr) => tr.origIndex == t.origIndex);
        console.log(`Attempting to delete array index ${arrayIndexToDelete} (previously ${ind}) from array size ${playlistsCopy[playlist.origIndex].tracks.length}`)
        playlistsCopy[playlist.origIndex].tracks.splice(arrayIndexToDelete, 1); //Track deletion uses array index as array index is kept in sync with Spotify
        console.log(`Pl array size after delete ${playlistsCopy[playlist.origIndex].tracks.length}`)
      })

      // Mark basePlaylist as done if it has no more duplicates
      if (playlistsCopy[playlist.origIndex].tracks.reduce((total, tCount) => total + (tCount.inPlaylists.length > 0 ? 1 : 0), 0) == 0) {
        console.log(`Playlist ${playlist.playlist.name} pos ${playlist.origIndex} has no more dupes! Removing`)
        playlistsCopy[playlist.origIndex].status = 'process.items.removed';
      }



      this.setState({ ...this.state, playlists: [...playlistsCopy] }); // State is updated with the copy



      function removeInPlaylistItems(
        track: TrackModel) {
        track.inPlaylists.forEach((ipEntry) => {

          // Find the array index of the dupe track in the foreign playlist
          let foreignArrayIndex = playlistsCopy[ipEntry.foreignPlaylistIndex].tracks.findIndex((tr) => tr.origIndex == ipEntry.foreignTrackIndex);
          console.log(`  SEARCH inPL ${ipEntry.playlist.name} (${ipEntry.foreignPlaylistIndex}) pos ${ipEntry.foreignTrackIndex}/${foreignArrayIndex} reason ${ipEntry.reason == 'same-id' && '(similar: ' + ipEntry.trackToRemove.track.id + ')'}`)

          // Filter the foreign track's inPlaylist array so the matching entry is removed
          let result = playlistsCopy[ipEntry.foreignPlaylistIndex].tracks[foreignArrayIndex].inPlaylists.filter((foreignIpEntry) => {
            let match = foreignIpEntry.foreignPlaylistIndex != playlist.origIndex || foreignIpEntry.foreignTrackIndex != track.origIndex;
            if (match) {
              console.log(`   - ${foreignIpEntry.playlist.name} (${foreignIpEntry.foreignPlaylistIndex}) pos ${foreignIpEntry.foreignTrackIndex}/${foreignArrayIndex} reason ${foreignIpEntry.reason == 'same-id' && '(similar: ' + foreignIpEntry.trackToRemove.track.id + ')'} Fpl ${foreignIpEntry.foreignPlaylistIndex} Bpl ${playlist.origIndex} Ftr ${foreignIpEntry.foreignTrackIndex} Btr ${track.origIndex}`)
            } else {
              console.log(`   + ${foreignIpEntry.playlist.name} (${foreignIpEntry.foreignPlaylistIndex}) pos ${foreignIpEntry.foreignTrackIndex}/${foreignArrayIndex} reason ${foreignIpEntry.reason == 'same-id' && '(similar: ' + foreignIpEntry.trackToRemove.track.id + ')'} Fpl ${foreignIpEntry.foreignPlaylistIndex} Bpl ${playlist.origIndex} Ftr ${foreignIpEntry.foreignTrackIndex} Btr ${track.origIndex}`)
            }
            return match; // foreignIpEntry.foreignPlaylistIndex != playlist.origIndex || foreignIpEntry.foreignTrackIndex != track.origIndex;
          })
          let resultToString = '';

          console.log(`    REMAIN ${result.length} ${result.reduce((red, res) => red + res.playlist.name + ', ', '')}`)

          // Replace the array with filtered version
          playlistsCopy[ipEntry.foreignPlaylistIndex].tracks[foreignArrayIndex].inPlaylists = result;

          // If the foreign playlist no longer has any duplicates, mark it as done
          if (playlistsCopy[ipEntry.foreignPlaylistIndex].tracks.reduce((total, tCount) => total + (tCount.inPlaylists.length > 0 ? 1 : 0), 0) == 0) {
            console.log(`Foreign playlist ${ipEntry.playlist.name} pos ${playlistsCopy[ipEntry.foreignPlaylistIndex].origIndex} has no more dupes! Removing`)
            playlistsCopy[ipEntry.foreignPlaylistIndex].status = 'process.items.removed';
          }
        })
      }
      return Promise.resolve();
    })();
  }



  removeSingleDuplicate(playlist: PlaylistModel, index: number, inPlaylistsIndex: number) {
    let basePlaylistIndex: number;       // Index of playlist in the .playlists array
    let basePlaylist: PlaylistModel;     // Playlist to remove the track from
    let dupeIndex: number;               // Location of track in basePlaylist's duplicates array (may change when dupes are removed)

    if (inPlaylistsIndex == null) {
      // Track removed from the current playlist (blue pill)
      basePlaylistIndex = playlist.origIndex;
      basePlaylist = playlist;
      dupeIndex = index; // The index passed to removeSingleDuplicate() is already the dupeIndex (the location of track in duplicates array)
    } else {
      // Track removed from the foreign playlist (grey pills)
      basePlaylistIndex = playlist.tracks[index].inPlaylists[inPlaylistsIndex].foreignPlaylistIndex; // We use the playlistIndex to find the pl in the 'playlists' array - it works because we never delete playlists and the indexes do not change
      basePlaylist = this.state.playlists[basePlaylistIndex]; // This also works because we never remove playlists
      dupeIndex = basePlaylist.tracks.findIndex((track) => // We must find location of track in the base playlists dupes list (using track's original trackIndex)
        track.origIndex == playlist.tracks[index].inPlaylists[inPlaylistsIndex].foreignTrackIndex // The matching works because the trackIndex is based on the .playlists array, and has not relation to the index within duplicates
      );
    }
    this.removeTracks(basePlaylist, dupeIndex);
  }

  removeDuplicates = (playlist: PlaylistModel) => {
    this.removeTracks(playlist);
  };

  render() {
    const totalDuplicates = //totalDuplicats will either be 0 or the result of the reduce function
      this.state.playlists.length === 0
        ? 0
        : this.state.playlists.reduce( // Adds the number of duplicates up for each playlist in the array
          (total, p) => total + p.tracks.reduce(
            (total2, t) => total2 + t.inPlaylists.length, 0), 0) // Removed saved tracks from the count // + this.state.savedTracks.tracks.length; 
    return (

      <div>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar
          newestOnTop={false}
          pauseOnFocusLoss
          closeOnClick
          draggable
          pauseOnHover
          theme="colored"
        />

        <CSVLink
          headers={[
            //TODO - Don't duplicate the header map
            { label: 'playlist_id', key: 'playlist_id' },
            { label: 'playlist_name', key: 'playlist_name' },
            { label: 'playlist_owner', key: 'playlist_owner' },
            //{ label: 'playlist_url', key: 'playlist_url' },
            { label: 'track_id', key: 'track_id' },
            { label: 'track_name', key: 'track_name' },
            { label: 'liked', key: 'liked' },
            { label: 'track_artist', key: 'track_artist' },
            { label: 'track_duration', key: 'track_duration' },
            // { label: 'track_url', key: 'track_url' },
            { label: 'in_playlists', key: 'in_playlists' },
            { label: 'similar_in_playlists', key: 'similar_in_playlists' }
          ]}
          data={this.getDuplicatesCsv()}
          filename={"spotify-dedup-duplicates.csv"}
          className="btn btn-primary"
          target="_blank"
        >
          Download Duplicates CSV
        </CSVLink>

        <button onClick={() => this.saveState()}>
          Print state
        </button>

        <Status toProcess={this.state.toProcess} />
        <Panel>
          {this.state.toProcess === null && (
            <Translation>{(t) => t('process.reading-library')}</Translation>
          )}
          {this.state.toDownload > 0 && (
            'Downloading ' + this.state.toDownload + ' playlist(s)...'
            // TODO:  Reinstate translations here
            // <Translation>{(t) => t('process.reading-library')}</Translation>
          )}

          {this.state.toDownload === 0 && this.state.toProcess > 0 && (
            'All playlists downloaded.  Crunching ' + this.state.toProcess + ' playlist(s)...'
            // TODO:  Reinstate translations here
            /*
            <Translation>
              {(t) => t('process.processing', { count: this.state.toProcess })}
            </Translation>
            */
          )}
          {this.state.toProcess === 0 && totalDuplicates > 0 && (
            <span>
              <Translation>
                {(t) => t('process.status.complete.body')}
              </Translation>{' '}
              <Translation>
                {(t) => (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t('process.status.complete.dups.body', {
                        strongOpen: '<strong>',
                        strongClose: '</strong>',
                      }),
                    }}
                  />
                )}
              </Translation>
              <BuyMeACoffee />
            </span>
          )}
          {this.state.toProcess === 0 && totalDuplicates === 0 && (
            <span>
              <Translation>
                {(t) => t('process.status.complete.body')}
              </Translation>
              <br />
              <Translation>
                {(t) => t('process.status.complete.nodups.body')}
              </Translation>
            </span>
          )}
        </Panel>

        <ul className="playlists-list">
          {/* LIKED/SAVED TRACKS */}

          {(this.state.toProcess === 0 && this.state.savedTracks.tracks.length ||
            this.state.savedTracks.status) && (
              <li className="playlists-list-item media">
                <div className="img">
                  <img
                    width="100"
                    height="100"
                    className="playlists-list-item__img"
                    src={'./placeholder.png'}
                  />
                </div>
                <div className="bd">
                  <span className="playlists-list-item__name">
                    <Translation>{(t) => t('process.saved.title')}</Translation>
                  </span>
                  {this.state.savedTracks.status && (
                    <Badge>
                      <Translation>
                        {(t) => t(this.state.savedTracks.status)}
                      </Translation>
                    </Badge>
                  )}
                  {this.state.savedTracks.tracks.length != 0 && (
                    <span>
                      <span>
                        <Translation>
                          {(t) =>
                            t('process.saved.duplicates', {
                              count: this.state.savedTracks.tracks.length,
                            })
                          }
                        </Translation>
                      </span>
                      <DuplicateTrackList>
                        {this.state.savedTracks.tracks.map((savedTrack, stIndex) => (
                          <span key={stIndex}>
                            <DuplicateTrackListItem
                              key={stIndex}
                              trackName={savedTrack.track.name}
                              trackArtistName={savedTrack.track.artists[0].name}
                              thisPlaylistName={''}
                              inPlaylists={savedTrack.inPlaylists}
                              isLiked={true}
                              onPlay={() => this.playTrack(savedTrack.track.id)}
                              onLiked={(likedCurrentStatus) => this.toggleLiked(savedTrack.track.id, likedCurrentStatus)}
                              onRemove={(inPlaylistsIndex) => this.removeSingleDuplicate(null, null, inPlaylistsIndex)} // TODO:  Needs review - for liked/saved songs the pills only remove them from a foreign playlist
                            />
                          </span>
                        ))}
                      </DuplicateTrackList>
                    </span>
                  )}
                </div>
              </li>
            )}


          {/* PLAYLISTS */}

          {this.state.toProcess === 0 && this.state.playlists
            .filter((p) => p.tracks.length || p.status != '' || p.tracks.reduce((total, t) => total + (t.inPlaylists.length > 0 ? 1 : 0), 0))
            .map((playlist: PlaylistModel, index) => (
              <li className="playlists-list-item media" key={index}>
                <div className="img">
                  <img
                    width="100"
                    height="100"
                    className="playlists-list-item__img"
                    src={
                      playlist.playlist.images &&
                      playlist.playlist.images[0] &&
                      playlist.playlist.images[0].url
                    }
                  />
                </div>
                <div className="bd">
                  <span className="playlists-list-item__name">
                    {playlist.playlist.name}
                  </span>
                  {playlist.status && (
                    <Badge>
                      <Translation>{(t) => t(playlist.status)}</Translation>
                    </Badge>
                  )}
                  {playlist.tracks.reduce((total, t) => total + (t.inPlaylists.length > 0 ? 1 : 0), 0) != 0 && (
                    <span>
                      <span>
                        <Translation>
                          {(t) =>
                            t('process.playlist.duplicates', {
                              count: playlist.tracks.reduce((total, t) => total + (t.inPlaylists.length > 0 ? 1 : 0), 0),
                            })
                          }
                        </Translation>
                      </span>
                      <button
                        className="btn btn-primary btn-sm playlist-list-item__btn"
                        onClick={() => this.removeDuplicates(playlist)}
                      >
                        <Translation>
                          {(t) => t('process.playlist.remove-button')}
                        </Translation>
                      </button>
                      <DuplicateTrackList>
                        {playlist.tracks.filter((t, arrayIndex) => {
                          t.arrayIndex = arrayIndex;
                          //todo:  del console.log(`UPDATING array from ${t.arrayIndex} to ${arrayIndex} for ${t.origIndex} ${t.track.name}`);
                          return t.inPlaylists.length > 0
                        })
                          .map((track, index) => (
                            <span key={index}>
                              <DuplicateTrackListItem
                                trackName={track.track.name}
                                trackArtistName={track.track.artists[0].name}
                                thisPlaylistName={playlist.playlist.name}
                                inPlaylists={track.inPlaylists}
                                isLiked={track.isLiked}
                                onPlay={() => this.playTrack(track.track.id)}
                                onLiked={(likedCurrentStatus) => this.toggleLiked(track.track.id, likedCurrentStatus)}
                                onRemove={(inPlaylistsIndex) => this.removeSingleDuplicate(playlist, track.arrayIndex, inPlaylistsIndex)}
                              />
                            </span>
                          ))}
                      </DuplicateTrackList>
                    </span>
                  )}
                </div>
              </li>
            ))}
        </ul>
        <style jsx>
          {`
        .bd {
        position: relative;
      }

            .media,
            .bd {
        overflow: hidden;
        _overflow: visible;
        zoom: 1;
      }

            .media.img {
        float: left;
        margin - right: 20px;
      }

      img {
        vertical - align: middle;
      }

            .playlists - list - item {
        margin - bottom: 2rem;
      }

            .playlists - list - item__img {
        width: 100px;
      }

            .btn {
        background - image: none;
        border: 1px solid transparent;
        border - radius: 4px;
        cursor: pointer;
        display: inline - block;
        font - size: 14px;
        font - weight: 400;
        line - height: 1.428571429;
        margin - bottom: 0;
        padding: 6px 12px;
        text - align: center;
        vertical - align: middle;
        white - space: nowrap;
      }

            .btn - primary {
        background - color: #428bca;
        border - color: #357ebd;
        color: #fff;
      }

            .btn - primary: hover {
        background - color: #5094ce;
      }

            .playlist - list - item__btn {
        max - width: 50 %;
        position: absolute;
        right: 0;
        top: 0;
      }

      @media(max - width: 700px) {
              .playlist - list - item__btn {
          max - width: 100 %;
          position: relative;
        }
      }

            .playlists - list - item__name {
        display: block;
        font - weight: bold;
        max - width: 50 %;
      }

      ul {
        padding: 0;
      }
      `}
        </style>
      </div>
    );
  }
}
