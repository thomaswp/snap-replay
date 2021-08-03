const YAML = require('../../node_modules/yaml');

export class Script {

    static LOG = 'log';
    static TEXT = 'text';

    constructor() {
        this.events = [];
    }

    addLogs(logs) {
        let time = 0;
        logs.forEach((log, index) => {
            time += log.timeDelta / 1000;
            const evt = new Event(Script.LOG, time, time, index, 1, log.type);
            this.events.push(evt);
        });
        this.sort();
    }

    addTranscript(words) {
        if (words.length == 0) return;
        console.log(words);
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

            let startTime = words[startWordIndex].start_time;
            let lastWord = words[index - 1];
            let endTime = lastWord.start_time + lastWord.duration;
            let length = index - startWordIndex;
            let description = words.slice(startWordIndex, index).map(w => w.word).join(' ');
            const evt = new Event(Script.TEXT, startTime, endTime, index, length, description);
            this.events.push(evt);

            if (word) {
                lastWordTime = word.start_time + word.duration;
                startWordIndex = index;
            }
        });
        this.sort();
    }

    toYAML() {
        return YAML.stringify(this);
    }

    sort() {
        this.events.sort((a, b) => a.startTime < b.startTime ? -1 : 1);
    }
}

class Event {
    constructor(type, startTime, endTime, startIndex, length, description) {
        this.type = type;
        this.startTime = startTime;
        this.endTime = endTime;
        this.startIndex = startIndex;
        this.length = length;
        this.description = description;
    }
}

export default Script;