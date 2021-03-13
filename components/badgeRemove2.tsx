import React from 'react';

export const BadgeRemove2 = (props: { playlistName, onClick: () => void }) => {
    return (
        <span>
            <div onClick={props.onClick} >{props.playlistName}</div>
            <style jsx>
                {`
          
          span {
            color: #fff;
            cursor: pointer;
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
