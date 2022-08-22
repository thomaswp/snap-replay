
const $ = require('../../node_modules/jquery');
const { ScriptLoader } = require('./loader');
const { Slides } = require('./slides');
const { Script } = require('./script');
const { rpcClient } = require('./rpc');

window.Trace = {
    log: (message, data) => {
        console.info('Logging:', message, data);
    }
}

export class Playback {

    static DB_LOG = false;
    static PROGRESS_TRACKING = false;

    // 0 because we do this in the script itself now
    static BUFFER_MS = 0;

    constructor(path) {
        try {
            Playback.DB_LOG = (process.env.DB_LOG === 'true');
            Playback.PROGRESS_TRACKING =
                (process.env.PROGRESS_TRACKING === 'true');
            $('#moodle-link').attr('href', process.env.MOODLE_LINK);
            $('#piazza-link').attr('href', process.env.PIAZZA_LINK);
        } catch (e) {
            console.error("Error reading .env file");
            console.error(e)
        }

        this.path = path;
        this.snapWindow = document.getElementById('isnap').contentWindow;
        this.loader = new ScriptLoader(path);
        this.loader.loadAudio('#audio');
        this.loader.onLoaded = (script) => {
            this.script = script;
            this.events = script.getEvents();
            console.log(this.events);
            this.addScript();
            this.restart();
            this.createSlides();
        }
        $('#isnap').on('load', () => {
            let interactionListener = (e) => {
                // console.log(e);
                // console.trace();
                if (e.isTrusted) this.snapFocused();
            };
            this.snapWindow.addEventListener('click', interactionListener);
            this.snapWindow.addEventListener('mousedown', interactionListener);
            if (this.snapWindow.recorder) {
                this.restart();
            } else {
                this.snapWindow.onWorldLoaded = () => {
                    this.restart();
                };
            }
        });
        this.audio = $('#audio')[0];
        this.$scrubber = $('#scrubber');
        this.$scrubber.on("change input", () => this.setDuration());
        this.$scrubber.on("change", () => this.finishSettingDuration());
        this.$script = $('#script');
        this.time = 0;
        this.playing = false;
        this.snapEdits = 0;
        this.duration = 0;
        this.highlightedBlocks = [];
        this.highlights = [];
        this.playingAction = false;
        this.answeredQs = [];
        this.maxDuration = this.getCachedMaxDuration();

        $('body').keyup((e) => {
            if (e.keyCode == 32) {
                this.togglePlay();
            }
        });

        // Playback.getDuration(this.loader.audioPath, (duration) => {
        //     this.duration = Math.max(this.duration, duration * 1000);
        //     this.$scrubber.attr('max', Math.round(this.duration));
        //     this.update();
        // });

        let noop = () => { };
        navigator.mediaSession.setActionHandler('play', noop);
        navigator.mediaSession.setActionHandler('pause', noop);
        navigator.mediaSession.setActionHandler('seekbackward', noop);
        navigator.mediaSession.setActionHandler('seekforward', noop);
        navigator.mediaSession.setActionHandler('previoustrack', noop);
        navigator.mediaSession.setActionHandler('nexttrack', noop);

        this.createClickHighlight();

        $('#question-reset').on('click', () => this.loadCheckpoint());
        $('#question-hint').on('click', () => this.slides.showHint(this.askingQuestion));
        $('#question-finished').on('click', () => this.setCheckWorkVisible(true));
        $('#q-modal-finished').on('click', () => this.answerReceived(this.askingQuestion, true, true));
        $('#q-modal-solution').on('click', () => this.answerReceived(this.askingQuestion, true));
        $('#q-modal-hint').on('click', () => this.slides.showHint(this.askingQuestion));


        $('#issuesLink').on('click', () => this.showIssuesModal());
        // HACK: TODO: Make this actually configurable
        const videoTable = {
            'media/csc110/loops/repeat/': 'https://drive.google.com/file/d/1bDNN6rAlNwcl-nNHlwgHCHB0o5jwXsln/view?usp=sharing',
            'media/csc110/procedures/basics/': 'https://drive.google.com/open?id=1-ILgfur1TOnO2FpoIilWKHmYV8IcKMaB&authuser=twprice%40ncsu.edu&usp=drive_fs',
        };
        let link = videoTable[path]
        if (link) {
            $('#video-link').attr('href', link);
            $('#video-link-line').removeClass('hidden');
        }

        setInterval(() => {
            if (!this.playing) return;
            Trace.log('Playback.updatePlaying', this.getCurrentDuration());
        }, 2000);

        // console.log('sending echo to', rpcClient);
        // rpcClient
        //     .request("echo", { text: "Hello, World!" })
        //     .then((result) => console.log(result));

        // rpcClient
        //     .request("double", { x: 3 })
        //     .then((result) => console.log(result));

        // rpcClient
        //     .request("getSnapshots", { userID: 3, videoID: path })
        //     .then((result) => console.log(result));

        if (!this.isChromeDesktop() || this.isMobile()) {
            alert(
                'This video is best viewed on a computer with the Chrome ' +
                'browser.\nIf you encounter problems, please use the backup ' +
                'video link below.'
            );
        }
    }

    isChromeDesktop() {
        // please note,
        // that IE11 now returns undefined again for window.chrome
        // and new Opera 30 outputs true for window.chrome
        // but needs to check if window.opr is not undefined
        // and new IE Edge outputs to true now for window.chrome
        // and if not iOS Chrome check
        // so use the below updated condition
        var isChromium = window.chrome;
        var winNav = window.navigator;
        var vendorName = winNav.vendor;
        var isOpera = typeof window.opr !== "undefined";
        var isIEedge = winNav.userAgent.indexOf("Edg") > -1;
        var isIOSChrome = winNav.userAgent.match("CriOS");

        if (isIOSChrome) {
            // is Google Chrome on IOS
            return false;
        } else if(
            isChromium !== null &&
            typeof isChromium !== "undefined" &&
            vendorName === "Google Inc." &&
            isOpera === false &&
            isIEedge === false
            ) {
            return true;
        } else {
            return false;
        }
    }

    isMobile() {
        let check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    };

    createSlides() {
        if (!this.script.slidesMD) return;
        this.slides = new Slides(this.path, false);
        this.slides.loadMarkdown(this.script.slidesMD);
        this.slides.onQStarted = (id, userControlled) => this.waitForAnswer(id, userControlled);
        this.slides.onQFinished = (id) => this.answerReceived(id, false);
    }

    waitForAnswer(id, userControlled) {
        Trace.log('Playback.startingQuestion', {
            id: id,
            type: userControlled ? 'programming' : 'MCQ',
        })
        if (this.answeredQs.includes(id)) {
            // console.log("Skipping answered", id);
            if (!userControlled) {
                this.slides.setSlideByID(id);
            }
            return;
        }
        // console.log("Asking", id);
        this.askingQuestion = id;
        this.pause();
        if (userControlled) {
            this.setConstructQuestionPanelVisible(true);
            let ide = this.snapWindow.ide;
            this.checkpoint = ide.serializer.serialize(ide.stage);
        }
    }

    loadCheckpoint() {
        Trace.log('Playback.userResetCode');
        if (this.checkpoint) {
            this.recorder.constructor.resetSnap(this.checkpoint);
        }
    }

    setConstructQuestionPanelVisible(visible) {
        $('#script').toggleClass('hidden', visible);
        $('#question').toggleClass('hidden', !visible);
        $('body').toggleClass('bigbar', visible);
        $('#slides-toggle').toggleClass('blinking', visible);
        if (visible) {
            $('#question-hint,#q-modal-hint').toggleClass('hidden',
                !this.slides.hasHint(this.askingQuestion));
            let imagePath = this.path + 'img/' + this.askingQuestion;
            let $img = $('#solution-image');
            $img.attr('src', imagePath + '.png');
            // If we fail to load the .png...
            let once = true;
            $img.on('error', () => {
                // Try a .gif
                if (once) $img.attr('src', imagePath + '.gif');
                once = false;
            });
            $('.q-modal-solution-wrapper').attr('data-bs-original-title', 'Try the problem first.');
            $('.enabled-on-try').attr('disabled', true);
        }
    }

    checkEnableShowSolution() {
        if (this.snapEdits < 2) return;
        $('.q-modal-solution-wrapper').attr('data-bs-original-title', '');
        $('.enabled-on-try').attr('disabled', false);
    }

    setCheckWorkVisible(visible) {
        $('#question-check-work').toggleClass('hidden', !visible);
    }

    answerReceived(id, resetSnap, skipSolution) {
        if (!this.askingQuestion) return;
        Trace.log('Playback.answerReceived', {
            id: id,
            resetSnap: resetSnap,
            skipSolution: skipSolution,
        });
        // console.log("Answered", id);
        this.setConstructQuestionPanelVisible(false);
        this.answeredQs.push(id);
        // Reset Snap for modify questions, since we need to overwrite their changes
        if(resetSnap) this.resetSnap();
        if (skipSolution) {
            // console.log('skipping...');
            for (let i = this.currentLogIndex; i < this.events.length; i++) {
                let event = this.events[i];
                if (!(event.description === 'questionAnswered')) continue;
                let log = this.script.getLog(event);
                // console.log(log);
                if (log.data.id !== this.askingQuestion) continue;
                let time = event.endTime * 1000;
                // console.log(this.getCurrentDuration(), '->', time);
                this.setDuration(time);
                break;
            }
        }
        this.askingQuestion = null;
        this.play();
    }

    createClickHighlight() {
        // create a DIV element, give it an ID and add it
        // to the body
        var clickHighlight = this.clickHighlight = document.createElement('div');
        clickHighlight.id = 'clickHighlight';
        document.body.appendChild(this.clickHighlight);

        let cursor = this.cursor = document.createElement('img');
        cursor.id = 'cursor';
        cursor.setAttribute('src', 'img/cursor.png');
        document.body.appendChild(cursor);

        // define offset as half the width of the DIV
        // (this is needed to put the mouse cursor in
        // its centre)
        var offset = clickHighlight.offsetWidth / 2;
        // move the DIV to x and y with the correct offset
        clickHighlight.trigger = (x, y) => {
            clickHighlight.style.left = x - offset + 'px';
            clickHighlight.style.top = y - offset + 'px';
            clickHighlight.classList.add('down');
            setTimeout(() => clickHighlight.classList.remove('down'), 200);
            cursor.activate();
        }

        const FADE_DURATION = 0.3;
        const FADE_TIMEOUT = 3000;

        let lastX = 0, lastY = 0;
        cursor.moveTo = (x, y, duration) => {
            if (lastX == x && lastY == y) return;
            lastX = x;
            lastY = y;
            duration = duration || 0.75;
            cursor.style.transition =
                `transform ${duration}s, opacity ${FADE_DURATION}s`;
            cursor.style.transform = `translate(${x}px, ${y}px)`;
            cursor.activate();
        }

        let lastTimeout = null;
        cursor.activate = function() {
            cursor.classList.add('moving');
            if (lastTimeout) clearTimeout(lastTimeout);
            lastTimeout = setTimeout(() => cursor.classList.remove('moving'),
                FADE_TIMEOUT);
        }

        cursor.hide = function() {
            cursor.classList.add('hidden');
        }

        cursor.show = function() {
            cursor.classList.remove('hidden');
        }
    }

    simulateClick(x, y) {
        this.clickHighlight.trigger(x, y);
        // this.cursor.moveTo(x, y, 0.1);
    }

    static getDuration = function (url, next) {
        var _player = new Audio(url);
        _player.addEventListener("durationchange", function (e) {
            if (this.duration != Infinity) {
                var duration = this.duration
                _player.remove();
                next(duration);
            };
        }, false);
        _player.load();
        _player.currentTime = 24 * 60 * 60; //fake big time
        _player.volume = 0;
        try {
            _player.play();
        } catch { }
        //waiting...
    };

    addScript() {
        this.texts = [];
        this.logs = [];
        this.highlights = [];
        this.events.forEach(event => {
            if (event.type === Script.LOG || event.type === Script.CONTROL) {
                this.logs.push(event);
                return;
            } else if (event.type === Script.HIGHLIGHT) {
                this.highlights.push(event);
                return;
            }
            this.texts.push(event);
            let $div = $(document.createElement('div'));
            $div.addClass('text');
            $div.text(event.description);
            $div.attr('id', 'script-' + event.startIndex);
            event.div = $div;
            this.$script.append($div);
        });
    }

    getStorageKey(suffix) {
        return this.path + "_" + suffix;
    }

    setMaxDuration(maxDuration) {
        this.maxDuration = maxDuration;
        if (localStorage) {
            let key = this.getStorageKey('maxDuration');
            localStorage.setItem(key, `${this.maxDuration}`);
        }
    }

    getCachedMaxDuration() {
        if (!localStorage) return 0;
        let key = this.getStorageKey('maxDuration');
        let duration = localStorage.getItem(key);
        if (duration == null) return 0;
        try {
            return parseInt(duration);
        } catch {}
        return 0;
    }

    restart() {
        if (!this.script) return;
        $('#loading').addClass('hidden');
        this.resetSnap();
        Trace.log('Playback.restart');
        this.time = 0;
        this.clearCurrentText();
        let duration = Math.max(...this.events.map(e => e.endTime)) * 1000 + Playback.BUFFER_MS;
        this.duration = Math.max(this.duration, duration);
        if (!Playback.PROGRESS_TRACKING) {
            this.maxDuration = this.duration;
        }
        this.updateScrubberBG();
        this.$scrubber.attr('max', Math.round(this.duration));
        this.playStartDuration = 0;
        this.$scrubber.val(0);
        this.updateHighlights();
        $('.text').removeClass('.highlight');
        this.updateTime();
    }

    getStatus() {
        return {
            currentTime: this.getCurrentDuration(),
            duration: this.duration,
            playing: this.playing,
            logIndex: this.currentLogIndex,
        }
    }

    resetSnap() {
        if (this.slides) this.slides.reset();
        this.highlightedBlocks = []
        if (this.snapWindow.ide) {
            // Clear console logging
            // TODO: may want to remove this for deploy
            this.snapWindow.Trace = new this.snapWindow.Logger(1000);
            let handler = () => {
                this.snapEdits++
                // console.log('Edited:', this.snapEdits);
                this.checkEnableShowSolution();
                if (this.warnResume || this.askingQuestion) {
                    Trace.log('Playback.snapEdited', {
                        edits: this.snapEdits,
                    });
                }
            };
            this.snapWindow.Trace.addLoggingHandler('Block.snapped', handler);
            this.snapWindow.Trace.addLoggingHandler('InputSlot.edited', handler);

            if (!this.loggingCreated) {
                if (Playback.DB_LOG) {
                    window.Trace = new this.snapWindow.DBLogger(1000);
                } else {
                    window.Trace = new this.snapWindow.ConsoleLogger(10);
                }
                this.loggingCreated = true;

                const getStatus = () => this.getStatus();
                const oldLog = Trace.log;
                const trace = Trace;
                window.Trace.log = (message, data, saveImmediately, forceLogCode) => {
                    if (data == null) data = {};
                    if (typeof data === 'object') {
                        data.status = getStatus();
                    }
                    oldLog.call(trace, message, data, saveImmediately, forceLogCode);
                }
                let id = window.Trace.userInfo().userID;
                if (!id || id.length == 0) {
                    $('#login-warning').removeClass('hidden');
                }
                window.Trace.log('Playback.started');
            }
        }
        this.currentLogIndex = 0;
        this.playingLog = null;
        this.recorder = this.snapWindow.recorder;
        this.snapEdits = 0;
        if (this.snapWindow.recorder) {
            this.recorder.constructor.resetSnap(this.script.startXML);
            this.recorder.constructor.setRecordScale(this.script.config.blockScale);
            this.recorder.constructor.setOnClickCallback(
                (x, y) => this.simulateClick(x, y));
        }
    }

    snapFocused() {
        // console.log('focus', this.playingAction);
        // if (this.playingAction) {
        //     setTimeout(() => {
        //         this.snapWindow.document.activeElement.blur();
        //         $('play').focus();
        //         console.log('focus play');
        //     }, 1);
        //     return;
        // }

        // We already know Snap is focused
        if (this.warnResume) return;
        Trace.log('Playback.snapFocused');
        this.clearHighlights();
        this.cursor.hide();
        if (this.playing) {
            this.pause();
            this.snapEdits = 0;
        }
        // This needs to come after pausing, which resets it
        this.warnResume = true;
    }

    togglePlay() {
        if (this.playing) {
            this.pause();
            Trace.log('Playback.pauseButton', {
                'successful': !this.playing,
            });
        } else {
            this.play();
            Trace.log('Playback.playButton', {
                'successful': this.playing,
            });
        }
    }

    play() {
        if (this.playing) return;
        if (this.events.length == 0) return;

        if (this.askingQuestion) {
            alert("Please answer the question first.");
            return;
        }

        this.recorder = this.snapWindow.recorder;
        if (!this.recorder) return;
        if (this.warnResume) {
            if (this.snapEdits > 0) {
                if (!confirm('Playing will overwrite your changes to the code. Continue?')) {
                    return;
                }
            }
            this.resetSnap();
        }
        this.playingAction = false;
        this.warnResume = false;
        // Subtract 0.1 to avoid float rounding issues
        if (this.getCurrentDuration() >= this.duration - 0.1) {
            this.restart();
        }
        $('#play').addClass('pause');
        this.cursor.show();
        this.playStartTime = new Date().getTime();
        this.playing = true;
        this.clearCurrentText();
        this.update();
        this.tickTimeout = setInterval(() => {
            this.update();
        }, 50);
    }

    pause() {
        if (!this.playing) return;
        $('#play').removeClass('pause');
        this.cursor.hide();
        this.playStartDuration = this.getCurrentDuration();
        this.audio.pause();
        this.playing = false;
        this.snapEdits = 0;
        this.warnResume = false;
        clearInterval(this.tickTimeout);
        this.tickTimeout = null;
    }

    setDuration(duration) {
        this.recorder = this.snapWindow.recorder;
        this.askingQuestion = null;

        if (!this.recorder) return;
        this.setConstructQuestionPanelVisible(false);
        if (this.playing) {
            this.pause();
            this.wasPlaying = true;
        }
        if (duration === undefined) {
            duration = this.getCurrentDuration();
        } else {
            // Don't update the scrubber's value unless set manually - it will stop dragging
            this.$scrubber.val(Math.round(duration));
        }
        this.updateTime();
        this.playStartDuration = duration;
        this.updateEvents(true);
    }

    updateTime() {
        let current = this.toMMSS(this.getCurrentDuration());
        let max = this.toMMSS(this.duration);
        let time =`${current} / ${max}`;
        $('#time').html(time);
    }

    toMMSS(ms) {
        let seconds = Math.floor(ms / 1000);
        let min = `${Math.floor(seconds / 60)}`;
        while (min.length < 2) min = '0' + min;
        let sec = `${seconds % 60}`;
        while (sec.length < 2) sec = '0' + sec;
        return `${min}:${sec}`;
    }

    finishSettingDuration() {
        Trace.log('Playback.scrub', {
            'time': this.duration,
        });
        this.updateEvents();
        if (this.wasPlaying) {
            setTimeout(() => this.play(), 1);
        }
        this.wasPlaying = false;
    }

    showIssuesModal() {
        Trace.log('Playback.videIssue');
        $('#show-issues-modal').click();
    }

    showFinishedModal() {
        if (!this.code) this.code = this.makeCode();
        Trace.log('Playback.finishedModal', {
            'code': this.code,
        });
        $('#finished-code').text(this.code);
        $('#show-finished-modal').click();
    }

    makeCode() {
        let userID = 'none';
        if (this.snapWindow && this.snapWindow.userID) {
            userID = this.snapWindow.userID;
        }
        let assignmentID = this.path;
        const DIGITS = 4;
        const MOD = 10000;
        let userIDHash = this.getHash(userID) % MOD;
        let assignmentIDHash = this.getHash(assignmentID) % MOD;
        let checksum = userIDHash + assignmentIDHash;
        checksum = this.leftPadNum(checksum % MOD, DIGITS);
        userIDHash = this.leftPadNum(userIDHash, DIGITS);
        assignmentIDHash = this.leftPadNum(assignmentIDHash, DIGITS);
        return `${userIDHash}-${assignmentIDHash}-${checksum}`;
    }

    getHash(input) {
        var hash = 0, len = input.length;
        for (var i = 0; i < len; i++) {
            hash  = ((hash << 5) - hash) + input.charCodeAt(i);
            hash |= 0; // to 32bit integer
        }
        return hash;
    }

    leftPadNum(num, digits) {
        let str = '' + num;
        while (str.length < digits) str = '0' + str;
        return str;
    }

    makeRandomCode(length) {
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var charactersLength = characters.length;
        let result = '';
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    isFastForwarding(event) {
        if (!event) {
            event = this.logs[this.currentLogIndex]
        }
        if (!event) return false;
        let durationS = this.getCurrentDuration() / 1000;
        return durationS - event.startTime > 0.25
    }

    update() {
        if (!this.playing) return;


        // Since we should in theory catch any snap focused events now, we
        // shouldn't need this anymore.
        // var elem = document.activeElement;
        // if (elem && elem.id === 'isnap' && !this.isFastForwarding()) {
        //     // Detect if Snap was focused by the user
        //     // Assumes event-driven focus was corrected in checkForFocus
        //     this.snapFocused();
        // }

        let duration = this.getCurrentDuration();
        this.setMaxDuration(Math.max(this.maxDuration, duration));
        this.updateScrubberBG();
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
        this.updateEvents();

        // If we're playing and Snap has focus, we remove that focus. This
        // assumes the focus came from a replay event, since any user-driven
        // focus events should pause playback.
        // We remove focus to ensure future, user focus events get detected.
        setTimeout(() => {
            // Wait 1 ms, just in case...
            this.removeSnapFocus();
        }, 1);

        if (duration > this.duration - 0.1) {
            this.showFinishedModal();
            this.pause();
        }
        this.updateTime();
    }

    // Check if something in the events caused Snap to focus
    // and if so, blur it so we can detect a user-driven focus
    removeSnapFocus() {
        var elem = document.activeElement;
        if (!elem || elem.id !== 'isnap') return; // No focus

        // Could blur snap element, but that shouldn't be necessary
        // const snapElement = this.snapWindow.document.activeElement;
        // console.log('Defocusing snap element', snapElement);
        // snapElement.blur();

        // Refocus this window so we can detect future changes
        this.$scrubber.focus();
        // console.log('Reset window focus to', document.activeElement);
        // console.log(document.activeElement, this.snapWindow.document.activeElement);
    }

    updateScrubberBG() {
        let margin = 0.005;
        let perc = 100 * (margin + this.maxDuration / this.duration * (1 - margin * 2));
        let left = Math.max(0, perc), right = Math.min(100, perc + 0.5);
        $('#scrubber-bg').css('background', `linear-gradient(90deg, rgb(152 203 255) ${left}%, #ffffff00 ${right}%)`);
    }

    updateEvents(noReset) {
        this.updateLogs(noReset);
        this.updateText();
        this.updateHighlights();
    }

    getCurrentDuration() {
        if (!this.playing) {
            return Math.min(parseInt(this.$scrubber.val()), this.maxDuration);
        }
        return this.playStartDuration + new Date().getTime() - this.playStartTime;
    }

    clearCurrentText() {
        if (this.currentText) {
            this.currentText.div.removeClass('highlight');
        }
        this.currentText = null;
    }

    getActiveEvents(events, timeS, buf) {
        return events.filter(t => t.startTime <= timeS + buf && t.endTime >= timeS - buf);
    }

    updateText() {
        let buf = Playback.BUFFER_MS / 1000;
        let durationS = this.getCurrentDuration() / 1000;
        if (this.currentText != null) {
            if (this.currentText.endTime < durationS - buf || this.currentText.startTime > durationS + buf) {
                this.clearCurrentText();
                if (this.playing) this.audio.pause();
            }
        }
        if (!this.currentText) {
            let active = this.getActiveEvents(this.texts, durationS, buf);
            if (active.length > 0) {
                this.currentText = active[active.length - 1];
                this.currentText.div.addClass('highlight');
                let $parent = this.$script.parent()
                let scroll = $parent.scrollTop() +
                    this.currentText.div.position().top - $parent.position().top;
                $parent.stop();
                $parent.animate({
                    scrollTop: scroll,
                }, 500);
                // TODO: At some point need to calculate relative duration to
                // find the right time in the audio
                // The edited events should all use deltas (so you can easily delete),
                // but the audio needs to keep a reference to the start/end time in the original file
                if (this.playing) {
                    let time = this.currentText.audioStart + durationS - this.currentText.startTime;
                    if (isNaN(time) || !isFinite(time)) {
                        console.error('NaN time', time, this.currentText, this.currentText.audioStart, durationS, this.currentText.startTime);
                        return;
                    }
                    this.audio.currentTime = time;
                    // console.log('Audio to ', this.audio.currentTime);
                    this.audio.play();
                }
            }
        }
    }

    handleEvent(event, fast) {
        if (event.description === 'videoPause') {
            if (!fast) this.pause();
            return true;
        }
        return false;
    }

    getScriptTime() {
        let log = this.logs[Math.min(this.currentLogIndex - 1, this.logs.length - 1)];
        let eventIndex = this.events.indexOf(log);
        let delta = this.getCurrentDuration() / 1000 - log.startTime
        return `#${eventIndex} "${log.description}" + ${delta}s`;
    }

    getRecordFromEvent(event) {
        if (!event) return null;
        let record = this.script.getLog(event);
        // console.log('Playing', record);
        // First, try to see if the Slides class can replay this
        let slidesRecord = this.slides ? this.slides.loadRecord(record) : null;
        if (slidesRecord == null) {
            [record] = this.recorder.loadRecords([record]);
        } else {
            record = slidesRecord;
        }
        return record;
    }

    updateLogs(noReset) {
        if (this.playingLog || this.warnResume) return;

        let durationS = this.getCurrentDuration() / 1000;
        if (this.currentLogIndex > 0) {
            let lastLog = this.logs[this.currentLogIndex - 1];
            if (lastLog.startTime > durationS) {
                if (noReset) {
                    return;
                }
                this.resetSnap();
                this.nextTimeout = setTimeout(() => this.update(), 1);
                return;
            }
        }

        let event = this.logs[this.currentLogIndex];
        if (!event) return;

        this.checkCursorMovement();

        if (durationS < event.startTime) {
            if (this.nextTimeout) return;
            let nextTime = (event.startTime - durationS) * 1000;
            this.nextTimeout = setTimeout(() => {
                this.update();
            }, nextTime);
            return;
        }

        // We go faster if the playback is more than .25s behind
        let fast = this.isFastForwarding(event);

        if (this.handleEvent(event, fast)) {
            this.currentLogIndex++;
            this.update();
            return;
        }

        this.nextTimeout = null;
        // console.log('Event: ', event);

        let record = this.getRecordFromEvent(event);

        this.playingLog = event;
        this.playingAction = true;
        try {
            record.replay(() => {
                // console.log('Clear playing');
                this.playingLog = null;
                this.updateLogs();
            }, fast);
        } catch (e) {
            console.error(e);
            this.playingLog = null;
        }
        this.playingAction = false;
        this.currentLogIndex++;

        this.checkCursorMovement();
    }

    checkCursorMovement() {
        // How far ahead of an event to start moving the cursor to
        // the appointed location, if possible
        const MAX_CURSOR_AHEAD = 1;
        // How slowly to move the cursor if there's time before
        // the event. The cursor will arrive at the appointed
        // location up to MAX_CURSOR_AHEAD - DEFAULT_TRANSITION
        // seconds before the event takes palce
        const DEFAULT_TRANSITION = 0.75;
        // If there's a pre-cursor position, this will be used
        // instead of the cursor position up until this many
        // seconds before the event.
        // This is currently only used for block move events
        // so it's just a few frames
        const PRE_CURSOR_AHEAD = 1.5 / 60; // 1-2 frames

        let durationS = this.getCurrentDuration() / 1000;

        const BLOCK_DRAG_DURATION_S =
            this.recorder.constructor.BLOCK_DRAG_DURATION_MS / 1000.0;


        let index = this.currentLogIndex;

        if (index > 0) {
            let lastEvent = this.logs[index - 1];
            // If the last event occurred less than a drag ago...
            if (lastEvent && lastEvent.startTime + BLOCK_DRAG_DURATION_S > durationS) {
                let lastRecord = this.getRecordFromEvent(lastEvent);
                // If the record was a block drop, give it time to finish the cursor
                // move before moving to the next event...
                if (lastRecord.type === 'blockDrop') {
                    // console.log('Allowing block drop to finish...');
                    return;
                }
            }
        }

        while (index < this.logs.length) {
            let event = this.logs[index];
            index++;
            if (!event) continue;
            let timeUntil = event.startTime - durationS;
            if (timeUntil < 0) timeUntil = 0;
            if (timeUntil > MAX_CURSOR_AHEAD + PRE_CURSOR_AHEAD) break;
            let record = this.getRecordFromEvent(event);
            if (!record.getCursor) continue; // Skip slides events

            if (this.isFastForwarding(event)) return;

            let duration = Math.min(DEFAULT_TRANSITION, timeUntil);
            let cursor = null;
            // If there's a pre-cursor position, and we're still a ways out
            // from the event, use that
            if (timeUntil > PRE_CURSOR_AHEAD) {
                cursor = record.getPreCursor(null, true);
            }
            if (cursor == null) {
                // Otherwise use the cursor position
                cursor = record.getCursor(null, true);
                if (record.type === 'blockDrop') {
                    // For blockDrop, we actually want to move the cursor to the
                    // event location *after* the event takes place, so we take
                    // the duration of the block movement, rather than the time
                    // until the drag event starts
                    duration = BLOCK_DRAG_DURATION_S;
                }
            }

            if (cursor) {
                this.cursor.moveTo(cursor.x, cursor.y, duration);
                break;
            }
        }
    }

    updateHighlights() {
        if (this.warnResume) return;
        let blocksToHighlight = [];
        let active = this.getActiveEvents(this.highlights, this.getCurrentDuration() / 1000, 0);
        active.forEach(h => {
            if (!blocksToHighlight.includes(h.blockID)) blocksToHighlight.push(h.blockID);
        });
        this.highlightedBlocks.forEach(id => {
            if (!blocksToHighlight.includes(id)) {
                this.setHighlight(id, false);
            };
        });
        blocksToHighlight.forEach(id => {
            if (!this.highlightedBlocks.includes(id)) {
                this.setHighlight(id, true);
            };
        });
        this.highlightedBlocks = blocksToHighlight;
    }

    setHighlight(blockID, highlighted) {
        var block = this.recorder.constructor.getBlock({id: blockID});
        // console.log('setHighlight', blockID, highlighted, block);
        if (!block) return;
        if (highlighted) {
            block.addHighlight();
        } else {
            block.removeHighlight();
        }
    }

    clearHighlights() {
        this.highlightedBlocks.forEach(b => this.setHighlight(b, false));
        this.highlightedBlocks = [];
    }
}