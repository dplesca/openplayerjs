import Native from '../components/native';
import { addEvent } from '../events';
import { HAS_MSE, SUPPORTS_NATIVE_HLS } from '../utils/constants';
import { loadScript } from '../utils/dom';

declare const Hls: any;

/**
 *
 * @class HlsMedia
 * @description Class that handles the hls.js API within the player
 */
class HlsMedia extends Native {
    private player: any;
    private events: object;
    private recoverDecodingErrorDate: number;
    private recoverSwapAudioCodecDate: number;

    /**
     * Creates an instance of HlsMedia.
     *
     * @param {HTMLMediaElement} element
     * @param {File} mediaFile
     * @memberof HlsMedia
     */
    constructor(element, mediaFile) {
        super(element, mediaFile);
        /**
         * @private
         */
        function createInstance() {
            this.player = new Hls();
        }
        this.element = element;
        this.media = mediaFile;
        this.player = null;
        this.events = null;
        this.promise = (typeof Hls === 'undefined') ?
            // Ever-green script
            loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest') :
            new Promise(resolve => {
                resolve();
            });

        this.promise.then(createInstance.bind(this));
        return this;
    }

    /**
     * Provide support via hls.js if browser does not have native support for HLS
     *
     * @param {string} mimeType
     * @returns {boolean}
     * @memberof HlsMedia
     */
    public canPlayType(mimeType) {
        return !SUPPORTS_NATIVE_HLS && HAS_MSE && mimeType === 'application/x-mpegURL';
    }

    /**
     *
     *
     * @memberof HlsMedia
     */
    public load() {
        this.player.detachMedia();
        this.player.loadSource(this.media.src);
        this.player.attachMedia(this.element);

        if (!this.events) {
            this.events = Hls.Events;
            Object.keys(this.events).forEach(event => {
                this.player.on(this.events[event], this._assign.bind(this));
            });
        }
    }

    public destroy() {
        this._revoke();
    }

    set src(media) {
        this._revoke();
        this.player = new Hls();
    }

    /**
     * Custom HLS events
     *
     * These events can be attached to the original node using addEventListener and the name of the event,
     * using or not Hls.Events object
     * @see https://github.com/video-dev/hls.js/blob/master/src/events.js
     * @see https://github.com/video-dev/hls.js/blob/master/src/errors.js
     * @see https://github.com/video-dev/hls.js/blob/master/doc/API.md#runtime-events
     * @see https://github.com/video-dev/hls.js/blob/master/doc/API.md#errors
     */
    private _assign(event, data) {
        if (name === 'hlsError') {
            console.warn(data);
            data = data[1];

            // borrowed from https://video-dev.github.io/hls.js/demo
            if (data.fatal) {
                switch (data.type) {
                    case 'mediaError':
                        const now = new Date().getTime();
                        if (!this.recoverDecodingErrorDate || (now - this.recoverDecodingErrorDate) > 3000) {
                            this.recoverDecodingErrorDate = new Date().getTime();
                            this.player.recoverMediaError();
                        } else if (!this.recoverSwapAudioCodecDate || (now - this.recoverSwapAudioCodecDate) > 3000) {
                            this.recoverSwapAudioCodecDate = new Date().getTime();
                            console.warn('Attempting to swap Audio Codec and recover from media error');
                            this.player.swapAudioCodec();
                            this.player.recoverMediaError();
                        } else {
                            const msg = 'Cannot recover, last media error recovery failed';
                            // mediaElement.generateError(message, node.src);
                            console.error(msg);
                        }
                        break;
                    case 'networkError':
                        const message = 'Network error';
                        // mediaElement.generateError(message, mediaFiles);
                        console.error(message);
                        break;
                    default:
                        this.player.destroy();
                        break;
                }
            }
        } else {
            const e = addEvent(event, data);
            this.element.dispatchEvent(e);
        }
    }
    /**
     *
     *
     * @memberof HlsMedia
     */
    private _revoke() {
        if (this.events) {
            Object.keys(this.events).forEach(event => {
                this.player.off(this.events[event], this._assign.bind(this));
            });
            this.events = null;
        }
        this.player.destroy();
    }
}

export default HlsMedia;