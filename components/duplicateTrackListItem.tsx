import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Badge from './badge';
import { BadgeRemove } from './badgeRemove';

export const DuplicateTrackListItem = ({
  reason,
  trackName,
  trackArtistName,
  id
}) => {
  const { t, i18n } = useTranslation();

  return (
    <li>
      <Trans i18nKey="result.duplicate.track">
        <span>{{ trackName }}</span> <span className="gray">by</span>{' '}
        <span>{{ trackArtistName }}</span>
      </Trans>
      <BadgeRemove id={id} />
      {reason === 'same-id' && (
        <Badge>{t('result.duplicate.reason-same-id')}</Badge>
      )}
      {reason === 'same-name-artist' && (
        <Badge>{t('result.duplicate.reason-same-data')}</Badge>
      )}

      <style jsx>
        {`
          .gray {
            color: #999;
          }
        `}
      </style>
    </li>
  );
};
