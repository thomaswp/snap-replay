
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

    static DB_LOG = true;

    // 0 because we do this in the script itself now
    static BUFFER_MS = 0;

    constructor(path) {
        this.path = path;
        this.snapWindow = document.getElementById('isnap').contentWindow;
        $(this.snapWindow).on('click mousedown', () => this.snapFocused());
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
        this.maxDuration = 0;

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
        $('#q-modal-finished').on('click', () => this.answerReceived(this.askingQuestion, true));
        $('#q-modal-solution').on('click', () => this.answerReceived(this.askingQuestion));
        $('#q-modal-hint').on('click', () => this.slides.showHint(this.askingQuestion));

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
    }

    createSlides() {
        if (!this.script.slidesMD) return;
        this.slides = new Slides(this.path, false);
        this.slides.loadMarkdown(this.script.slidesMD);
        this.slides.onQStarted = (id, userControlled) => this.waitForAnswer(id, userControlled);
        this.slides.onQFinished = (id) => this.answerReceived(id);
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
        if (visible) {
            $('#question-hint,#q-modal-hint').toggleClass('hidden',
                !this.slides.hasHint(this.askingQuestion));
            let image = this.path + 'img/' + this.askingQuestion + '.png';
            $('#solution-image').attr('src', image);
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

    answerReceived(id, skipSolution) {
        if (!this.askingQuestion) return;
        Trace.log('Playback.answerReceived', {
            id: id,
            skipSolution: skipSolution,
        });
        // console.log("Answered", id);
        this.setConstructQuestionPanelVisible(false);
        this.answeredQs.push(id);
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
        this.snapEdits = 0;
        this.play();
    }

    createClickHighlight() {
        // create a DIV element, give it an ID and add it
        // to the body
        this.clickHighlight = document.createElement('div');
        this.clickHighlight.id = 'clickHighlight';
        document.body.appendChild(this.clickHighlight);
        // define offset as half the width of the DIV
        // (this is needed to put the mouse cursor in
        // its centre)
        var plot = this.clickHighlight;
        var offset = plot.offsetWidth / 2;
        // move the DIV to x and y with the correct offset
        this.clickHighlight.trigger = (x, y) => {
            plot.style.left = x - offset + 'px';
            plot.style.top = y - offset + 'px';
            plot.classList.add('down');
            setTimeout(() => plot.classList.remove('down'), 200);
        }
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

    restart() {
        if (!this.script) return;
        this.resetSnap();
        Trace.log('Playback.restart');
        this.time = 0;
        this.clearCurrentText();
        let duration = Math.max(...this.events.map(e => e.endTime)) * 1000 + Playback.BUFFER_MS;
        this.duration = Math.max(this.duration, duration);
        // TODO: make this configurable...
        this.maxDuration = this.duration;
        this.updateScrubberBG();
        this.$scrubber.attr('max', Math.round(this.duration));
        this.playStartDuration = 0;
        this.$scrubber.val(0);
        this.updateHighlights();
        $('.text').removeClass('.highlight');
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
        if (this.snapWindow.recorder) {
            this.recorder.constructor.resetSnap(this.script.startXML);
            this.recorder.constructor.setRecordScale(this.script.config.blockScale);
            this.recorder.constructor.setOnClickCallback(
                (x, y) => this.clickHighlight.trigger(x, y));
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
        Trace.log('Playback.snapFocused');
        this.clearHighlights();
        if (this.playing) {
            this.pause();
            this.snapEdits = 0;
        }
        if (this.getCurrentDuration() > 0) {
            this.warnResume = true;
        }
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
        this.playStartDuration = duration;
        this.updateEvents(true);
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

    showFinishedModal() {
        if (!this.code) this.code = this.makeCode(10);
        Trace.log('Playback.finishedModal', {
            'code': this.code,
        });
        $('#finished-code').text(this.code);
        $('#show-finished-modal').click();
    }

    makeCode(length) {
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
        var elem = document.activeElement;
        if (elem && elem.id === 'isnap' && !this.isFastForwarding()) {
            // Detect if Snap was focused by the user
            // Assumes event-driven focus was corrected in checkForFocus
            this.snapFocused();
        }
        let duration = this.getCurrentDuration();
        this.maxDuration = Math.max(this.maxDuration, duration);
        this.updateScrubberBG();
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
        this.updateEvents();
        // TODO: This may not be robust enough if focus comes later, but
        // seems to be working for now. The best way may be to detect
        // focus events with isTrusted == true, which have to come from the user.
        this.checkForFocus();
        // Wait 1 ms, just in case...
        setTimeout(() => {
            this.checkForFocus();
        }, 1);
        if (duration > this.duration - 0.1) {
            this.showFinishedModal();
            this.pause();
        }
    }

    // Check if something in the events caused Snap to focus
    // and if so, blur it so we can detect a user-driven focus
    checkForFocus() {
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
        let record = this.script.getLog(event);
        // console.log('Playing', record);
        // First, try to see if the Slides class can replay this
        let slidesRecord = this.slides ? this.slides.loadRecord(record) : null;
        if (slidesRecord == null) {
            [record] = this.recorder.loadRecords([record]);
        } else {
            record = slidesRecord;
        }
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
        var block = this.recorder.constructor.getBlock(blockID);
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