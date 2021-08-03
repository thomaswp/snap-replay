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

    play() {
        if (this.events.length == 0) return;
        this.recorder = this.snapWindow.recorder;
        console.log('Recorder: ', this.recorder);
        if (!this.recorder) return;
        this.time = 0;
        this.index = 0;
        this.playing = true;
        this.duration = Math.max(this.duration, this.events[this.events.length - 1].endTime * 1000);
        console.log('Duration: ' + this.duration);
        this.playStartTime = new Date().getTime();
        this.playStartDuration = 0;
        this.playNext();
        this.audio.play();
        this.$scrubber.attr('max', Math.round(this.duration));
        this.tickTimeout = setInterval(() => {
            this.update();
        }, 50);
    }

    update() {
        if (!this.playing) return;
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
    }

    getCurrentDuration() {
        return this.playStartDuration + new Date().getTime() - this.playStartTime;
    }

    pause() {

    }

    playNext() {
        this.update();
        if (this.index >= this.events.length) {
            return;
        }
        let event = this.events[this.index];
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