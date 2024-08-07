import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

export const BadgePlay2 = (props: { onPlay: () => void }) => {
    return (
        <span>
            {
                <span className="all">
                    <div>
                        <span className="all play-button" onClick={props.onPlay} ><FontAwesomeIcon icon={faPlay} /></span>
                    </div>
                </span>
            }
            <style jsx>
                {`
          
          .all {
            color: #ffffff;
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
            cursor: pointer;
          }
          
          .play-button {
            color: #ffffff;
            background-repeat: no-repeat;
            background-size: 50% 50%;
            background-position: center;
            cursor: pointer;
            padding: 0px;
          }

        `}
            </style>
        </span>
    )
}
