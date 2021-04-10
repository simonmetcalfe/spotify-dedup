import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { BadgePlay2 } from './badgePlay2';
import { BadgeRemove3 } from './badgeRemove3';

export const DuplicateTrackListItem = (props: { key, trackName, trackArtistName, thisPlaylistName, thisPlaylistId, inPlaylists, onPlay: () => void, onRemove: (playlistName, playlistId) => void }) => {
  // TODO: Translations are breaking the component, fix them later
  /*const { t, i18n } = useTranslation();*/

  return (
    <li>
      <BadgePlay2
        onPlay={() => props.onPlay()}
      />
      {/* <Trans i18nKey="result.duplicate.track"> */}
      <span>{props.trackName}</span> <span className="gray">by</span>{' '}
      <span>{props.trackArtistName}</span>
      {/* </Trans> */}
      <BadgeRemove3
        label={props.thisPlaylistName}
        reason=''
        onRemove={() => props.onRemove(props.thisPlaylistName, props.thisPlaylistId)}
      />
      {props.inPlaylists.map((inPlaylist, index) => (
        <span key={index}>
          <BadgeRemove3
            label={inPlaylist.playlist.name}
            reason={inPlaylist.reason}
            onRemove={() => props.onRemove(inPlaylist.playlist.name, inPlaylist.playlist.id)}
          />
        </span>
      ))}

      <style jsx>
        {`
          li {
            padding:4px
          }
          
          .gray {
            color: #999;
          }
        `}
      </style>
    </li>
  );
};
