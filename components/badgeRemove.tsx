import React from 'react';

export const BadgeRemove = ({
  id
}) => {
  return (
    <span>
      <a href='https://dddddd'>{id}</a>
      {/* <a onClick={() => removeDuplicatesFromPlaylist()}>{id}</a> */}
      <style jsx>
        {`
          a:link{
            color: #fff;
            cursor: pointer;
          }
          
          span {
            background-color: #0082C5;
            border-radius: 10px;
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            line-height: 1;
            margin-left: 0.5em;
            margin-right: 0.5em;
            min-width: 10px;
            padding: 3px 7px;
            text-align: center;
            vertical-align: baseline;
            white-space: nowrap;
          }
        `}
      </style>
    </span>
  )
}
