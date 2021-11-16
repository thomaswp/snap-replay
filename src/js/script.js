const YAML = require('../../node_modules/yaml');

export class Script {

    static LOG = 'log';
    static TEXT = 'text';
    static CONTROL = 'control';
    static HIGHLIGHT = 'highlight';
    
    static AUDIO_BUFFER = 0.5;

    constructor(logs, words, duration, scriptYAML) {
        this.logs = logs;
        this.words = words;
        this.config = {
            blockScale: 1,
        }
        if (scriptYAML) {
            let script = YAML.parse(scriptYAML);
            // console.log(script);
            this.config = script.config;
            this.events = script.events;
        } else {
            this.events = [];
            this.addLogs(logs);
            this.addTranscript(words, duration);
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
            // console.log(log);
            if (log.type === 'setBlockScale') {
                this.config.blockScale = log.data.scale;
                return;
            }
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

    addTranscript(words, duration) {
        this.words = words;
        if (words.length == 0) {
            if (!duration) return;
            // If we have a duration but no transcript,
            // create a single audio event
            const evt = new Event(Script.TEXT, 0, '');
            evt.audioStart = 0;
            evt.audioEnd = duration;
            this.events.push(evt);
            return;
        }
        words = words.slice();
        // Add a null word at the end to ensure the final group is pushed
        words.push(null);
        const MAX_SEG_GAP = 0.5;
        const MAX_WORDS = 15;
        const MAX_WORD_DURATION = 2;
        let lastWordTime = words[0].start_time;
        let startWordIndex = 0;
        words.forEach((word, index) => {
            if (word) {
                word.duration = Math.min(word.duration, MAX_WORD_DURATION)
            }

            if (word && word.start_time - lastWordTime <= MAX_SEG_GAP &&
                    index - startWordIndex + 1 < MAX_WORDS) {
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
        if (event.type === Script.CONTROL) {
            let record = Object.assign({}, event);
            record.type = record.description;
            return record;
        }
        if (event.type !== Script.LOG) return null;
        return this.logs[event.logIndex];
    }

    toYAML() {
        return YAML.stringify({
            'config': this.config,
            'events': this.events,
        });
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
        let lastTime = 0;
        for (let i = 0; i < events.length; i++)  {
            events[i] = this.toReadableEvent(events[i], lastTime);
            if (!events[i].skipDelta) lastTime = events[i].startTime
        }
        return events;
    }

    toReadableEvent(evt, lastTime) {
        let event = Object.assign({}, evt);
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