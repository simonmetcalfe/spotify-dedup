import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";

export const BadgeRemove3 = (props: { label, reason, onRemove: () => void }) => {
    return (
        <span>
            {
                props.reason === 'same-id' ?
                    <span className='all same-id'>
                        <div>
                            {props.label}
                            <span className="all close-button" onClick={props.onRemove}>
                                <FontAwesomeIcon icon={faTimesCircle} className="close-button" onClick={props.onRemove} />
                            </span>
                        </div>
                    </span>
                    : props.reason === 'same-name-artist' ?
                        <span className='all same-name-artist'>
                            <div>
                                {props.label}
                                <span className="all close-button" onClick={props.onRemove}>
                                    <FontAwesomeIcon icon={faTimesCircle} className="close-button" onClick={props.onRemove} />
                                </span>
                            </div>
                        </span>
                        :
                        <span className='all default'>
                            <div>
                                {props.label}
                                <span className="all close-button" onClick={props.onRemove}>
                                    <FontAwesomeIcon icon={faTimesCircle} className="close-button" onClick={props.onRemove} />
                                </span>
                            </div>
                        </span>
            }
            <style jsx>
                {`
          
          .all {
            color: #ffffff;
            border-radius: 10px;
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            line-height: 1;
            margin-left: 0.5em;
            margin-right: 0.5em;
            min-width: 10px;
            padding: 3px 0px 3px 7px;
            text-align: center;
            vertical-align: baseline;
            white-space: nowrap;
          }

          .same-id {
            background-color: #999;
          }

          .same-name-artist {
            background-color: #bbb;
          }

          .default {
            background-color: #0082C5;
          }

          .close-button {
            color: #ff0000;
            background-image: linear-gradient(#fff,#fff);
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
