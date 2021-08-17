# Snap Playback

This is a set of tools to record and play back Snap logs and audio, like an interactive video.

## Setup

### Requirements
This project requires [Node.js](https://nodejs.org/en/), a static web host (e.g. [Apache](https://httpd.apache.org/)).

### Cloning & Submodules

You should clone this project in a directory that you can host with your web host (e.g. `/var/www/html`).

When cloning this repository, use `git clone --recurse-submodules`, since it include [iSnap](https://github.com/thomaswp/iSnap) as a submodule. If you have already clone the repo, you can still setup the submodules with:

```
git submodule init
git submodule udpate
```

**Note**: If git seems to hang here, it's because the submodule is large and taking a while to download. You can add the `--progress` option to you clone or update command to see the progress if it isn't showing.

Read more about [git submodules here](https://git-scm.com/book/en/v2/Git-Tools-Submodules).

### Setup Node and Webpack

Once you've clone the repo, run the command `npm install`. This should install all prerequisites for running the project.

**Note**: The project does *not* use Node to host the server, just npm for dependency management.

Afterwards, run `webpack --watch` and the source code should be compiled into the dist/js folder. Now you should be able to navigate to http://localhost/snap-playback/dist/, where `snap-playback` is set to whatever directory (or subdirectory) you cloned in.

**Note**: If you get an error that webpack is not installed, try installing it manually with `npm install -g webpack webpack-cli`.

To test that everything is working, go to http://localhost/snap-playback/dist/playback.html. It should play a sample video on the Repeat block.

## Recording

To record a new session, go to http://localhost/snap-playback/dist/isnap/ in you browser (updating the URL as needed). You should see Snap. Use the "File->Start recording" menu option to start recording. Make sure to enable mic access. Use the same menu to stop recording. This will download two files, and .ogg file and a .json file.

You can add these files to the `dist/media/my-recording` folder, where my-recording is the name of your recording. Rename the .ogg file to audio.ogg and the .json file to logs.json.

## Transcription

You can transcribe your audio using [Mozilla's DeepSpeech](https://github.com/mozilla/DeepSpeech). This will give you a .json file. add this to the folder with the name transcript.json. You may have to convert the audio to another format (e.g. using [ffmpeg](https://www.ffmpeg.org/)).

**Note**: The transcript file is not necessary, but it will make it easier to read your script.

## Making a Script

Next, go to http://localhost/snap-playback/dist/edit.html?video=my-recording, were my-recording is the name of your recording folder (or subfolder, e.g. sample/my-recording). You should see a YAML file.

Currently, in-browser editing is not well-supported, so simply copy this to a script.yaml file and put is in your recording folder with the other files. Edit as needed.

**Note**: Making a script is also optional. If you want to replay everything and don't need to add anything, you can skip this step.

## Replaying a script

To play a video (including any of the samples in ./dist/media/sample/), go to http://localhost/snap-playback/dist/playback.html?video=my-recording, were my-recording is the name of your recording folder (or subfolder, e.g. sample/my-recording).
