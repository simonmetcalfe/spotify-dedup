import React from 'react';
import { useTranslation, Translation } from 'react-i18next';
import { PlaylistModel, InPlaylistsModel } from '../dedup/types';
import { SpotifyUserType, SpotifyTrackType } from '../dedup/spotifyApi';

import Process from '../dedup/process';
import { PlaylistDeduplicator, SavedTracksDeduplicator } from '../dedup/deduplicator';

import BuyMeACoffee from './bmc';
import Panel from './panel';
import { DuplicateTrackList } from './duplicateTrackList';
import { DuplicateTrackListItem } from './duplicateTrackListItem';
import { BadgeRemove3 } from './badgeRemove3';


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
    duplicates: Array<{
      index: number;
      reason: string;
      track: SpotifyTrackType;
    }>;
  };
};

export default class Main extends React.Component<{
  api: any;
  user: SpotifyUserType;
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

  // TODO:  id:string ??
  playTrack = (id) => {
    console.log('main.tsx:  playTrack playing ' + id)
    this.props.api.previewTrack(id);
  }

  removeFromPlaylist = (playlist: PlaylistModel, index: number, inPlaylistsIndex: number) => {
    (async () => {
      let trackName: string;
      let trackId: string;
      let basePlaylist: PlaylistModel;
      let basePlaylistIndex: number; // Location of the basePlaylist in the playlist store
      let trackIndex: number; // New calc method of the track index
      let similarTrack: SpotifyTrackType;
      // Determine if basePlaylist (where track was removed from) is current playlist or a foreign playlist, and get the PlaylistModel
      console.log('inPlaylistsIndex is  curently ' + inPlaylistsIndex)
      if (inPlaylistsIndex == null) {
        // Track removed from the current playlist
        trackName = playlist.duplicates[index].track.name;
        trackId = playlist.duplicates[index].track.id;
        basePlaylistIndex = playlist.playlistIndex;
        basePlaylist = playlist;
        trackIndex = index;
      } else {
        // Track removed from the foreign playlist - search its duplicates list to find the trackIndex of the removed file
        similarTrack = playlist.duplicates[index].inPlaylists[inPlaylistsIndex].similarTrack;
        trackName = similarTrack == null ? playlist.duplicates[index].track.name : similarTrack.name;
        trackId = similarTrack == null ? playlist.duplicates[index].track.id : similarTrack.id;
        basePlaylistIndex = playlist.duplicates[index].inPlaylists[inPlaylistsIndex].playlistIndex;
        basePlaylist = this.state.playlists[basePlaylistIndex];
        trackIndex = this.state.playlists[basePlaylistIndex].duplicates.findIndex((duplicate) =>
          duplicate.trackIndex == playlist.duplicates[index].inPlaylists[inPlaylistsIndex].trackIndex
        );

      }

      // List occurences in foreign playlists
      let foreignPlaylistOccurences = basePlaylist.duplicates[trackIndex].inPlaylists.map((inPlaylist) => {
        return `        ${inPlaylist.playlist.name} (${inPlaylist.playlist.id}) pos ${inPlaylist.trackIndex}` +
          `${inPlaylist.similarTrack == null ? '' : '\n' + '          Similar ' + inPlaylist.similarTrack.name + ' (' + inPlaylist.similarTrack.id + ')'}`
      }).join('\n');

      // Log the delete
      console.log(`main.tsx:
      Removing ${trackName} (${trackId})
        Similar ${similarTrack == null ? '' : similarTrack.name + ' (' + similarTrack.id + ')'}
      From playlist ${basePlaylist.playlist.name} (${basePlaylist.playlist.id}) pos ${trackIndex}
      Duplicates  \n${foreignPlaylistOccurences} `)

      // Check playlist is not starred or collaborative
      if (basePlaylist.playlist.id === 'starred') {
        global['alert'] &&
          global['alert'](
            'It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
          );
      }
      else if (basePlaylist.playlist.collaborative) {
        global['alert'] &&
          global['alert'](
            'It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
          );
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
        global['alert'] &&
          global['alert'](
            'It is not possible to delete duplicates from your Starred playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
          );
      }
      if (playlistModel.playlist.collaborative) {
        global['alert'] &&
          global['alert'](
            'It is not possible to delete duplicates from a collaborative playlist using this tool since this is not supported in the Spotify Web API. You will need to remove these manually.'
          );
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

  removeDuplicatesInSavedTracks() {
    (async () => {
      await SavedTracksDeduplicator.removeDuplicates(
        this.props.api,
        this.state.savedTracks
      );
      this.setState({
        ...this.state,
        savedTracks: {
          duplicates: [],
          status: 'process.items.removed',
        },
      });

    })();
  }

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
        <BadgeRemove3
          label='Print state'
          reason=''
          onRemove={() => console.log(this.state)}
        />
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
              <BuyMeACoffee />
            </span>
          )}
        </Panel>

        <ul className="playlists-list">

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
                              onPlay={() => this.playTrack(duplicate.track.id)}
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
