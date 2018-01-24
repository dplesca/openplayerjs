import {loadScript} from '../utils/dom';
import Native from '../components/native';

declare const google: any;

class Ads extends Native {
    events: object;
    adUrl: string;
    adsManager: any;
    adsLoader: any;
    adsContainer: HTMLDivElement;
    adDisplayContainer: any;
    adsRequest: any;

    /**
     * Creates an instance of Google IMA SDK.
     *
     * @param {HTMLMediaElement} element
     * @param {object} mediaFile
     * @param {string} adUrl
     * @returns {Ads}
     * @memberof Ads
     */
    constructor(element, mediaFile, adUrl) {
        super(element, mediaFile);
        this.adUrl = adUrl;
        this.adsManager = null;
        this.events = null;

        this.promise = (typeof google === 'undefined' || typeof google.ima === 'undefined') ?
            loadScript('https://imasdk.googleapis.com/js/sdkloader/ima3.js') :
            new Promise(resolve => {
                resolve();
            });

        return this;
    }

    canPlayType(mimeType) {
        return this.adsLoader !== null && /\.(mp[34]|m3u8|mpd)/.test(mimeType);
    }

    load() {
        this.adsContainer = document.createElement('div');
        this.adsContainer.id = 'om-ads';
        this.element.parentNode.insertBefore(this.adsContainer, this.element.nextSibling);
        this.element.classList.add('om-ads--active');

        google.ima.settings.setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.INSECURE);
        this.adDisplayContainer =
            new google.ima.AdDisplayContainer(
                this.adsContainer,
                this.element
            );

        this.adDisplayContainer.initialize();

        this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

        const loaded = google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED;
        const error = google.ima.AdErrorEvent.Type.AD_ERROR;

        this.adsLoader.addEventListener(error, this._error.bind(this));
        this.adsLoader.addEventListener(loaded, this._loaded.bind(this));
        this.element.onended = this._contentEndedListener.bind(this);
        this.adsRequest = new google.ima.AdsRequest();
        this.adsRequest.adTagUrl = this.adUrl;
        // Specify the linear and nonlinear slot sizes. This helps the SDK to
        // select the correct creative if multiple are returned.
        this.adsRequest.linearAdSlotWidth = this.element.offsetWidth;
        this.adsRequest.linearAdSlotHeight = this.element.offsetHeight;
        this.adsRequest.nonLinearAdSlotWidth = this.element.offsetWidth;
        this.adsRequest.nonLinearAdSlotHeight = 150;
    }

    play() {
        this.adsLoader.requestAds(this.adsRequest);
    }

    pause() {
        this.element.pause();
    }

    destroy() {
    }

    set src(media) {
    }

    get src() {
        return 'aaaaa';
    }

    set volume(value) {
        this.element.volume = value;
    }

    get volume() {
        return this.element.volume;
    }

    set muted(value) {
        this.element.muted = value;
    }

    get muted() {
        return this.element.muted;
    }

    _assign(event) {
        if (event.type === google.ima.AdEvent.Type.CLICK) {
            // this.application_.adClicked();
        } else if (event.type === google.ima.AdEvent.Type.LOADED) {
            const ad = event.getAd();
            if (!ad.isLinear()) {
                // this.onContentResumeRequested_();
            }
        }
    }

    _error(e) {
        console.error(`Ad error: ${e.getError().toString()}`);
        if (this.adsManager) {
            this.adsManager.destroy();
        }
        // this.application_.resumeAfterAd();
    }

    _loaded(adsManagerLoadedEvent) {
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        // Get the ads manager.
        this.adsManager = adsManagerLoadedEvent.getAdsManager(this.element, adsRenderingSettings);
        // Add listeners to the required events.
        this.adsManager.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            this._error.bind(this));
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
            this._onContentPauseRequested.bind(this));
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            this._onContentResumeRequested.bind(this));

        try {
            // Initialize the ads manager. Ad rules playlist will start at this time.
            this.adsManager.init(
                this.element.offsetWidth, 
                this.element.offsetHeight, 
                google.ima.ViewMode.NORMAL
            );
            // Call start to show ads. Single video and overlay ads will
            // start at this time; this call will be ignored for ad rules, as ad rules
            // ads start when the adsManager is initialized.
            this.adsManager.start();
        } catch (adError) {
            // An error may be thrown if there was a problem with the VAST response.
            // Play content here, because we won't be getting an ad.
            this.element.play();
        }
    }

    // _revoke() {
    //
    // }

    _start(manager) {
        // Attach the pause/resume events.
        manager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
            // this.onContentPauseRequested_,
            false
        );
        manager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            // this.onContentResumeRequested_
        );
        // Handle errors.
        manager.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            this._error.bind(this)
        );

        this.events = [
            google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
            google.ima.AdEvent.Type.CLICK,
            google.ima.AdEvent.Type.COMPLETE,
            google.ima.AdEvent.Type.FIRST_QUARTILE,
            google.ima.AdEvent.Type.LOADED,
            google.ima.AdEvent.Type.MIDPOINT,
            google.ima.AdEvent.Type.PAUSED,
            google.ima.AdEvent.Type.STARTED,
            google.ima.AdEvent.Type.THIRD_QUARTILE
        ];

        Object.keys(this.events).forEach(event => {
            manager.addEventListener(this.events[event], this._assign.bind(this));
        });

        manager.init(
            (<HTMLElement>this.element.parentNode).offsetWidth,
            (<HTMLElement>this.element.parentNode).offsetHeight,
            google.ima.ViewMode.NORMAL
        );

        manager.start();
    }

    _contentEndedListener() {
        this.adsLoader.contentComplete();
    }

    _onContentPauseRequested() {
        // This function is where you should setup UI for showing ads (e.g.
        // display ad timer countdown, disable seeking, etc.)
        this.element.removeEventListener('ended', this._contentEndedListener.bind(this));
        this.element.pause();
    }

    _onContentResumeRequested() {
        // This function is where you should ensure that your UI is ready
        // to play content.
        this.element.addEventListener('ended', this._contentEndedListener.bind(this));
        this.element.play();
    }
}

export default Ads;
