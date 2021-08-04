import { throwStatement } from 'babel-types';

const YAML = require('../../node_modules/yaml');

export class Script {

    static LOG = 'log';
    static TEXT = 'text';
    static HIGHLIGHT = 'highlight';
    static AUDIO_BUFFER = 0.5;

    constructor(logs, words, events) {
        this.logs = logs;
        this.words = words;
        if (events) {
            this.events = YAML.parse(events);
        } else {
            this.events = [];
            this.addLogs(logs);
            this.addTranscript(words);
            this.sort();
        }
    }

    blockToString(block) {
        let text = `${block.selector}(${block.id})`;
        if (block.argIndex) text += `[${block.argIndex}]`;
        return text;
    }

    addLogs(logs) {
        let time = 0;
        logs.forEach((log, index) => {
            console.log(log);
            time += log.timeDelta / 1000;
            let desc = log.type;
            if (log.type === 'blockDrop') {
                let data = log.data;
                let block = data.lastDroppedBlock;
                let target = data.lastDropTarget;
                desc = `drop ${this.blockToString(block)}`;
                if (target && target.element) {
                    desc += ` -> ${this.blockToString(target.element)}`;
                }
            }
            const evt = new Event(Script.LOG, time, desc);
            evt.logIndex = index;
            this.events.push(evt);
        });
        this.logs = logs;
    }

    addTranscript(words) {
        this.words = words;
        if (words.length == 0) return;
        words = words.slice();
        // Add a null word at the end to ensure the final group is pushed
        words.push(null);
        const MAX_SEG_GAP = 0.75;
        let lastWordTime = words[0].start_time;
        let startWordIndex = 0;
        words.forEach((word, index) => {
            if (word && word.start_time - lastWordTime <= MAX_SEG_GAP) {
                lastWordTime = word.start_time + word.duration;
                return;
            }

            let startTime = Math.max(0, words[startWordIndex].start_time - Script.AUDIO_BUFFER);
            let lastWord = words[index - 1];
            let endTime = lastWord.start_time + lastWord.duration + Script.AUDIO_BUFFER;
            let description = words.slice(startWordIndex, index).map(w => w.word).join(' ');
            const evt = new Event(Script.TEXT, startTime, description);
            evt.audioStart = startTime;
            evt.audioEnd = endTime;
            this.events.push(evt);

            if (word) {
                lastWordTime = word.start_time + word.duration;
                startWordIndex = index;
            }
        });
    }

    getLog(event) {
        if (event.type !== Script.LOG) return null;
        return this.logs[event.logIndex];
    }

    toYAML() {
        return YAML.stringify(this.events);
    }

    sort() {
        if (this.logs == null || this.words == null) return;
        this.events.sort((a, b) => a.startTime < b.startTime ? -1 : 1);
        this.events[0].timeDelta = this.events[0].startTime;
        for (let i = 1; i < this.events.length; i++)  {
            this.events[i].timeDelta = this.events[i].startTime - this.events[i - 1].startTime;
        }
        this.events.forEach(e => delete e.startTime);
        // console.log(this.events);
        // console.log(this.getEvents());
    }

    getEvents() {
        let events = this.events.slice();
        for (let i = 0; i < events.length; i++)  {
            events[i] = this.toReadableEvent(events[i], events[i-1]);
        }
        return events;
    }

    toReadableEvent(evt, lastEvent) {
        let event = Object.assign({}, evt);
        let lastTime = lastEvent ? lastEvent.startTime : 0;
        event.startTime = lastTime + event.timeDelta;
        event.endTime = event.startTime;
        if (event.type == Script.TEXT) {
            event.endTime = event.startTime + event.audioEnd - event.audioStart;
        } else if (event.type == Script.HIGHLIGHT) {
            event.endTime = event.startTime + event.duration;
        }
        return event;
    }
}

class Event {
    constructor(type, startTime, description) {
        this.type = type;
        this.startTime = startTime;
        this.description = description;
    }
}

export default Script;