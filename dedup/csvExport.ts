import { PlaylistModel } from './types';


// Sleep helper function used to ensur React UI will update during plalist processing
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export default class {
    listeners: {};
    constructor() {
        this.listeners = {};
    }

    on(event: string, fn) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(fn);
    }

    dispatch(event: string, params) {
        const callbacks = this.listeners[event];
        callbacks.forEach((callback) => callback(params));
    }

    // The main function that reads and indentifies duplicates
    process = async () => {
        console.log('csvExport.ts:  process async running')


        // const is used to fix the model of currentState, but each object inside is modifyable
        const currentState: {
            playlists?: Array<PlaylistModel>;
            savedTracks?: {
                duplicates?: Array<any>;
            };
            toProcess?: number;
            toDownload?: number;
        } = {};


        const dispatch = this.dispatch.bind(this);

        function onExportToCsv() {

            dispatch('updateState', currentState);
        }

        this.dispatch('updateState', currentState);

    }
}