import React from 'react';

export const BadgePlay = (props: { onClick: () => void }) => {
    return (
        <span>
            <div onClick={props.onClick} >Play</div>
            <style jsx>
                {`
          
          span {
            color: #fff;
            cursor: pointer;
            background-color: #1db954;
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
