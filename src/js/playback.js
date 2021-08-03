const $ = require('../../node_modules/jquery');
const { ScriptLoader } = require('./loader');
const { Script } = require('./script');

export class Playback {
    constructor(path) {
        this.path = path;
        this.snapWindow = document.getElementById('isnap').contentWindow;
        this.loader = new ScriptLoader(path);
        this.loader.loadAudio('#audio');
        this.loader.onLoaded = (script) => {
            this.script = script;
            this.events = script.events;
            this.addScript();
            this.restart();
        }
        this.audio = $('#audio')[0];
        this.$scrubber = $('#scrubber');
        this.$script = $('#script');
        this.time = 0;
        this.index = 0;
        this.playing = false;
        this.duration = 0;
        Playback.getDuration(this.loader.audioPath, (duration) => {
            this.duration = Math.max(this.duration, duration * 1000);
            console.log('Duration from audio: ', duration);
            this.update();
        });
    }

    static getDuration = function (url, next) {
        var _player = new Audio(url);
        _player.addEventListener("durationchange", function (e) {
            if (this.duration!=Infinity) {
               var duration = this.duration
               _player.remove();
               next(duration);
            };
        }, false);      
        _player.load();
        _player.currentTime = 24*60*60; //fake big time
        _player.volume = 0;
        try {
            _player.play();
        } catch {}
        //waiting...
    };

    addScript() {
        this.events.forEach(event => {
            if (event.type !== Script.TEXT) return;
            let $div = $(document.createElement('div'));
            $div.text(event.description);
            $div.attr('id', 'script-' + event.startIndex);
            this.$script.append($div);
        });
    }

    restart() {
        this.time = 0;
        this.index = 0;
        this.duration = Math.max(this.duration, this.events[this.events.length - 1].endTime * 1000);
        this.$scrubber.attr('max', Math.round(this.duration));
        this.playStartDuration = 0;
        this.$scrubber.val(0);
        console.log(this.$scrubber.val())
    }

    togglePlay() {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.events.length == 0) return;
        this.recorder = this.snapWindow.recorder;
        if (!this.recorder) return;
        this.playStartTime = new Date().getTime();
        this.playNext();
        this.audio.play();
        this.playing = true;
        this.tickTimeout = setInterval(() => {
            this.update();
        }, 50);
    }

    pause() {
        this.audio.pause();
        this.playing = false;
        this.playStartDuration = this.getCurrentDuration();
    }

    update() {
        if (!this.playing) return;
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
    }

    getCurrentDuration() {
        return this.playStartDuration + new Date().getTime() - this.playStartTime;
    }

    playNext() {
        this.update();
        if (this.index >= this.events.length) {
            return;
        }
        let event = this.events[this.index];
        // TODO: First check if it's time - otherwise skip
        if (event.type === Script.LOG) {
            console.log('Event: ', event);
            let record = this.script.getLog(event);
            console.log('Playing', record);
            [record] = this.recorder.loadRecords([record]);
            record.replay();
        }
        
        this.index++;
        if (this.index >= this.events.length) {
            return;
        }
        let nextEvent = this.events[this.index];
        let nextTime = nextEvent.startTime * 1000 - this.getCurrentDuration();
        console.log('Next event in: ', nextTime);
        this.nextTimeout = setTimeout(() => {
            this.playNext();
        }, nextTime);
    }


}