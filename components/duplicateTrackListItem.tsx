import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { BadgePlay2 } from './badgePlay2';
import { BadgeRemove3 } from './badgeRemove3';
import { BadgeLiked } from './badgeLiked';

export const DuplicateTrackListItem = (props: { key, trackName, trackArtistName, thisPlaylistName, inPlaylists, isLiked, onPlay: () => void, onLiked: (likedCurrentStatus) => void, onRemove: (inPlaylistsIndex) => void }) => {
  // TODO: Translations are breaking the component, fix them later
  /*const { t, i18n } = useTranslation();*/

  return (
    <li>
      <BadgePlay2
        onPlay={() => props.onPlay()}
      />
      <BadgeLiked
        onClick={() => props.onLiked(props.isLiked)}
        isLiked={props.isLiked}
      />
      {/* <Trans i18nKey="result.duplicate.track"> */}
      <span>{props.trackName}</span> <span className="gray">by</span>{' '}
      <span>{props.trackArtistName}</span>
      {/* </Trans> */}
      {
        props.thisPlaylistName !== '' ?  // This is a playlist and not the saved/liked songs list
          <span>
            <BadgeRemove3
              label={props.thisPlaylistName}
              reason=''
              onRemove={() => props.onRemove(null)}
            />
          </span>
          :
          <span></span> //TODO - We only show the remove from own playlist badge when it is a playlist, but there must be a better way of doing this
      }
      {
        props.inPlaylists != undefined ?
          props.inPlaylists.map((inPlaylist, index) => (
            <span key={index}>
              <BadgeRemove3
                label={inPlaylist.playlist.name}
                reason={inPlaylist.reason}
                onRemove={() => props.onRemove(index)}
              />
            </span>
          ))

          :
          <span></span> //TODO - Same as above

      }

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
