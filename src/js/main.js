import { Editor } from './editor.js';
import { Playback } from './playback.js'
import { Slides } from './slides.js'
const $ = require('../../node_modules/jquery');
require('../../node_modules/jquery-ui/ui/widgets/draggable');
// const bootstrap = require('../../node_modules/bootstrap');

window.Editor = Editor;
window.Playback = Playback;
window.Slides = Slides;
window.$ = $;
// window.bootstrap = bootstrap;