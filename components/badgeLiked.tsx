import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

export const BadgeLiked = (props: { isLiked, onClick: () => void }) => {
    return (
        <span>
            {
                props.isLiked == true ?
                    <span className="all">
                        <div>
                            <span className="all is-liked" onClick={props.onClick} ><FontAwesomeIcon icon={faHeart} /></span>
                        </div>
                    </span>
                    :
                    <span className="all">
                        <div>
                            <span className="all is-not-liked" onClick={props.onClick} ><FontAwesomeIcon icon={faHeart} /></span>
                        </div>
                    </span>
            }
            <style jsx>
                {`
          
          .all {
            color: #ffffff;
            background-color: #e3e3e3;
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
          
          .is-not-liked {
            color: #ffffff;
            background-repeat: no-repeat;
            background-size: 50% 50%;
            background-position: center;
            cursor: pointer;
            padding: 0px;
          }

          .is-liked {
            color: #1db954;
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
