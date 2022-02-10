import React from 'react';

import { useTranslation, Translation, getI18n } from 'react-i18next';
import { PlaylistModel, DuplicatesModel, PlaylistCsvExportModel, DuplicatesCsvExportModel } from '../dedup/types';

import { SpotifyUserType, SpotifyTrackType } from '../dedup/spotifyApi';

import Process from '../dedup/process';

import { PlaylistDeduplicator, SavedTracksDeduplicator } from '../dedup/deduplicator';

import BuyMeACoffee from './bmc';
import Panel from './panel';
import { DuplicateTrackList } from './duplicateTrackList';
import { DuplicateTrackListItem } from './duplicateTrackListItem';
import { Badge } from './badge';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { CSVLink, CSVDownload } from "react-csv";

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
    duplicates: Array<DuplicatesModel>;
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
      duplicates: [],
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

  getPlaylistsCsv() {
    const csv: Array<PlaylistCsvExportModel> = [];
    // Saved/liked
    for (let i = 0; i < this.state.savedTracks.duplicates.length; i++) {
      csv.push({
        playlist_id: 'liked',
        playlist_name: 'liked',
        playlist_owner: this.props.user.display_name,
        track_id: this.state.savedTracks.duplicates[i].track.id,
        track_name: this.state.savedTracks.duplicates[i].track.name,
        liked: true,
        track_artist: this.state.savedTracks.duplicates[i].track.artists[0].name,
        track_duration: this.state.savedTracks.duplicates[i].track.duration_ms,
      })
    }
    // Playlists
    for (let i = 0; i < this.state.playlists.length; i++) {
      for (let n = 0; n < this.state.playlists[i].tracks.length; n++) {
        csv.push({
          playlist_id: this.state.playlists[i].playlist.id,
          playlist_name: this.state.playlists[i].playlist.name,
          playlist_owner: this.state.playlists[i].playlist.owner.display_name,
          track_id: this.state.playlists[i].tracks[n].id,
          track_name: this.state.playlists[i].tracks[n].name,
          liked: this.state.playlists[i].tracks[n].isLiked,
          track_artist: this.state.playlists[i].tracks[n].artists[0].name,
          track_duration: this.state.playlists[i].tracks[n].duration_ms,
        })
      }
    }
    return csv;
  }

  getDuplicatesCsv() {
    const csv: Array<DuplicatesCsvExportModel> = [];
    // Saved/liked (NOTE:  Exports all tracks and not just those which are 'duplicated' in playlists)
    for (let i = 0; i < this.state.savedTracks.duplicates.length; i++) {
      var inPlaylists = '';
      var similarInPlaylists = '';
      for (let o = 0; o < this.state.savedTracks.duplicates[i].inPlaylists.length; o++) {
        if (this.state.savedTracks.duplicates[i].inPlaylists[o].reason === 'same-id') {
          if (inPlaylists !== '') { inPlaylists += ',' }
          inPlaylists += this.state.savedTracks.duplicates[i].inPlaylists[o].playlist.name
        } else {
          if (similarInPlaylists !== '') { similarInPlaylists += ',' }
          similarInPlaylists += this.state.savedTracks.duplicates[i].inPlaylists[o].playlist.name
        }

        csv.push({
          playlist_id: 'liked',
          playlist_name: 'liked',
          playlist_owner: this.props.user.display_name,
          track_id: this.state.savedTracks.duplicates[i].track.id,
          track_name: this.state.savedTracks.duplicates[i].track.name,
          liked: true,
          track_artist: this.state.savedTracks.duplicates[i].track.artists[0].name,
          track_duration: this.state.savedTracks.duplicates[i].track.duration_ms,
          in_playlists: inPlaylists,
          similar_in_playlists: similarInPlaylists
        })
      }
    }
    // Playlists
    for (let i = 0; i < this.state.playlists.length; i++) {
      for (let n = 0; n < this.state.playlists[i].duplicates.length; n++) {
        var inPlaylists = '';
        var similarInPlaylists = '';
        for (let o = 0; o < this.state.playlists[i].duplicates[n].inPlaylists.length; o++) {
          if (this.state.playlists[i].duplicates[n].inPlaylists[o].reason === 'same-id') {
            if (inPlaylists !== '') { inPlaylists += ',' }
            inPlaylists += this.state.playlists[i].duplicates[n].inPlaylists[o].playlist.name
          } else {
            if (similarInPlaylists !== '') { similarInPlaylists += ',' }
            similarInPlaylists += this.state.playlists[i].duplicates[n].inPlaylists[o].playlist.name
          }
        }

        csv.push({
          playlist_id: this.state.playlists[i].playlist.id,
          playlist_name: this.state.playlists[i].playlist.name,
          playlist_owner: this.state.playlists[i].playlist.owner.display_name,
          track_id: this.state.playlists[i].duplicates[n].track.id,
          track_name: this.state.playlists[i].duplicates[n].track.name,
          liked: this.state.playlists[i].duplicates[n].track.isLiked,
          track_artist: this.state.playlists[i].duplicates[n].track.artists[0].name,
          track_duration: this.state.playlists[i].duplicates[n].track.duration_ms,
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


  // TODO:  id:string ??
  playTrack = (id) => {
    (async () => {
      console.log('main.tsx:  playTrack playing ' + id)
      try {
        await this.props.api.previewTrack(id);
      }
      catch (e) {
        toast.warn('Could not play track.   Make sure you have a Premium subscription and try waking up Spotify by playing a track from the Spotify client.')
        console.log('main.tsx:  playTrack failed to play track ' + id + '.  ' + e.message + ' ' + e.stack)
        global['Raven'] &&
          global['Raven'].captureMessage(
            `Exception trying to play a track`,
            {},
          );
      }
    })();
  }

  toggleLiked(id, likedCurrentStatus) {
    console.log('main.tsx:  toggleLiked pressed for ' + id + ' with Liked current status as ' + likedCurrentStatus)
  }

  removeFromPlaylist = (playlist: PlaylistModel, index: number, inPlaylistsIndex: number) => {
    (async () => {

      let basePlaylistIndex: number;        // Location of basePlaylist in the playlist store
      let basePlaylist: PlaylistModel;      // Playlist to remove the track from
      let trackIndex: number;               // Location of track in basePlaylist's duplicates list
      let trackToRemove: SpotifyTrackType;  // Track to be removed from Spotify

      if (inPlaylistsIndex == null) {
        // Track removed from the current playlist
        basePlaylistIndex = playlist.playlistIndex;
        basePlaylist = playlist;
        trackIndex = index;
        trackToRemove = playlist.duplicates[index].track;
      } else {
        // Track removed from the foreign playlist using a pill icon
        basePlaylistIndex = playlist.duplicates[index].inPlaylists[inPlaylistsIndex].playlistIndex;
        basePlaylist = this.state.playlists[basePlaylistIndex];
        trackIndex = this.state.playlists[basePlaylistIndex].duplicates.findIndex((duplicate) => // We must for location of track in dupes list (using track's original trackIndex)
          duplicate.trackIndex == playlist.duplicates[index].inPlaylists[inPlaylistsIndex].trackIndex
        );
        trackToRemove = playlist.duplicates[index].inPlaylists[inPlaylistsIndex].trackToRemove;

      }

      // List occurences in foreign playlists
      let foreignPlaylistOccurences = basePlaylist.duplicates[trackIndex].inPlaylists.map((inPlaylist) => {
        return `        ${inPlaylist.playlist.name} (${inPlaylist.playlist.id}) pos ${inPlaylist.trackIndex} ${inPlaylist.reason == 'same-id' ? '' : '(similar: ' + inPlaylist.trackToRemove.id + ')'}`
      }).join('\n');


      // Log the delete
      console.log(`main.tsx:
      Removing ${trackToRemove.name} (${trackToRemove.id})
      From playlist ${basePlaylist.playlist.name} (${basePlaylist.playlist.id}) pos ${trackIndex}
      Duplicates  \n${foreignPlaylistOccurences} `)

      // Check playlist is not starred or collaborative
      if (basePlaylist.playlist.id === 'starred') {
        toast.warn('It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.', {});
      }
      else if (basePlaylist.playlist.collaborative) {
        toast.warn('It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.', {});
      } else {


        /*
        // Delete the track
        try {
          await PlaylistDeduplicator.removeTrack(
            this.props.api,
            playlistModel
          );
          console.log('Making a copy of all playlists (this.state.playlists')
          const playlistsCopy = [...this.state.playlists];
          playlistsCopy[index].duplicates = []; // For the copy of all playlists, find the current playlist in the copy, and clear the duplicates
          playlistsCopy[index].status = 'process.items.removed'; // Status is 'Duplicates removed'
          this.setState({ ...this.state, playlists: [...playlistsCopy] }); // State is updated with the copy
        } catch (e) {
          global['Raven'] &&
            global['Raven'].captureMessage(
              `Exception trying to remove duplicates from playlist`,
              {
                extra: {
                  duplicates: playlistModel.duplicates,
                },
              }
            );
        }
        */
        /*
                api: SpotifyWebApi,
                uri: string,
                index: number,
                playlistModel: PlaylistModel
        */




      }
    })();
  }


  removeDuplicates = (playlist: PlaylistModel) => {
    (async () => {
      // console.log('this.state.playlists is ' + JSON.stringify(this.state.playlists))

      // Get the playlists index within the store of playlists
      const index = this.state.playlists.findIndex(
        (p) => p.playlist.id === playlist.playlist.id
      );
      console.log('Removing duplicates from playlist ' + playlist.playlist.name + ' with index ' + index)
      const playlistModel = this.state.playlists[index];
      console.log('The duplicates for playlist ' + playlistModel.playlist.name + ' are ' + JSON.stringify(playlistModel.duplicates))
      if (playlistModel.playlist.id === 'starred') {
        toast.warn('It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.', {});
      }
      if (playlistModel.playlist.collaborative) {
        toast.warn('It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.', {});
      } else {
        try {
          console.log('PlaylistDeduplicator.removeDuplicates being called for ' + playlistModel.playlist.name)
          await PlaylistDeduplicator.removeDuplicates(
            this.props.api,
            playlistModel
          );
          console.log('Making a copy of all playlists (this.state.playlists')
          const playlistsCopy = [...this.state.playlists];
          playlistsCopy[index].duplicates = []; // For the copy of all playlists, find the current playlist in the copy, and clear the duplicates
          playlistsCopy[index].status = 'process.items.removed'; // Status is 'Duplicates removed'
          this.setState({ ...this.state, playlists: [...playlistsCopy] }); // State is updated with the copy
        } catch (e) {
          toast.error('Could not remove duplicates from playlist.  Check your internet connection and reload the page if necessary.')
          global['Raven'] &&
            global['Raven'].captureMessage(
              `Exception trying to remove duplicates from playlist`,
              {
                extra: {
                  duplicates: playlistModel.duplicates,
                },
              }
            );
        }
      }
    })();
  };

  render() {
    const totalDuplicates = //totalDuplicats will either be 0 or the result of the reduce function
      this.state.playlists.length === 0
        ? 0
        : this.state.playlists.reduce( // .reduce(initialValue,currentValue), adds the number of duplicates up for each playlist in the array
          (prev, current) => prev + current.duplicates.length,
          0
        ) // Commented because not working with saved tracks + this.state.savedTracks.duplicates.length; // and adds the number of saved tracks duplicates to the number
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
            { label: 'playlist_id', key: 'playlist_id' },
            { label: 'playlist_name', key: 'playlist_name' },
            { label: 'playlist_owner', key: 'playlist_owner' },
            //{ label: 'playlist_url', key: 'playlist_url' },
            { label: 'track_id', key: 'track_id' },
            { label: 'track_name', key: 'track_name' },
            { label: 'liked', key: 'liked' },
            { label: 'track_artist', key: 'track_artist' },
            { label: 'track_duration', key: 'track_duration' },
            //{ label: 'track_url', key: 'track_url' }
          ]}
          data={this.getPlaylistsCsv()}
          filename={"spotify-dedup-playlists.csv"}
          className="btn btn-primary"
          target="_blank"
        >
          Download Playlists CSV
        </CSVLink>
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

          {(this.state.toProcess === 0 && this.state.savedTracks.duplicates.length ||
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
                  {this.state.savedTracks.duplicates.length != 0 && (
                    <span>
                      <span>
                        <Translation>
                          {(t) =>
                            t('process.saved.duplicates', {
                              count: this.state.savedTracks.duplicates.length,
                            })
                          }
                        </Translation>
                      </span>
                      <DuplicateTrackList>
                        {this.state.savedTracks.duplicates.map((duplicate, index) => (
                          <span key={index}>
                            <DuplicateTrackListItem
                              key={index}
                              trackName={duplicate.track.name}
                              trackArtistName={duplicate.track.artists[0].name}
                              thisPlaylistName={''}
                              inPlaylists={duplicate.inPlaylists}
                              isLiked={true}
                              onPlay={() => this.playTrack(duplicate.track.id)}
                              onLiked={(likedCurrentStatus) => this.toggleLiked(duplicate.track.id, likedCurrentStatus)}
                              onRemove={(inPlaylistsIndex) => this.removeFromPlaylist(null, null, inPlaylistsIndex)} // TODO:  Needs review - for liked/saved songs the pills only remove them from a foreign playlist
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
            .filter((p) => p.duplicates.length || p.status != '')
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
                  {playlist.duplicates.length != 0 && (
                    <span>
                      <span>
                        <Translation>
                          {(t) =>
                            t('process.playlist.duplicates', {
                              count: playlist.duplicates.length,
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
                        {playlist.duplicates.map((duplicate, index) => (
                          <span key={index}>
                            <DuplicateTrackListItem
                              key={index}
                              trackName={duplicate.track.name}
                              trackArtistName={duplicate.track.artists[0].name}
                              thisPlaylistName={playlist.playlist.name}
                              inPlaylists={duplicate.inPlaylists}
                              isLiked={duplicate.track.isLiked}
                              onPlay={() => this.playTrack(duplicate.track.id)}
                              onLiked={(likedCurrentStatus) => this.toggleLiked(duplicate.track.id, likedCurrentStatus)}
                              onRemove={(inPlaylistsIndex) => this.removeFromPlaylist(playlist, index, inPlaylistsIndex)}
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
