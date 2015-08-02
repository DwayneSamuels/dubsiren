/* jshint browser: true */
(function() {
"use strict";

var source, delay, feedback, filter,
    mainOscillator, modulationOscillator,
    sirenPlaying = false,
    ctx = new window.AudioContext(),
    outputGain = ctx.createGain(),
    modulationGain = ctx.createGain(),
    mainFrequencySlider = document.querySelector("input.mainFrequency"),
    modulationFrequencySlider = document.querySelector("input.modulationFrequency"),
    modulationAmplitudeSlider = document.querySelector("input.modulationAmplitude"),
    outputVolumeSlider = document.querySelector("input.volume");

outputGain.gain.value = outputVolumeSlider.value;
outputGain.connect(ctx.destination);

function updateMainFrequency() {
    mainOscillator.frequency.value = mainFrequencySlider.value;
}

function updateModulationFrequency() {
    modulationOscillator.frequency.value = modulationFrequencySlider.value;
}

function updateModulationAmplitude() {
    modulationGain.gain.value = modulationAmplitudeSlider.value;
}


outputVolumeSlider.addEventListener("input", function () {
    outputGain.gain.value = outputVolumeSlider.value;
});


window.addEventListener("keydown", function(event) {
    if (event.key !== " " || sirenPlaying === true) return;
    sirenPlaying = true;

    mainOscillator = ctx.createOscillator();
    mainOscillator.type = document.querySelector(
        "input[name=mainOscillatorType]:checked").value;
    mainOscillator.frequency.value = mainFrequencySlider.value;

    modulationOscillator = ctx.createOscillator();
    modulationOscillator.type = document.querySelector(
        "input[name=modulationOscillatorType]:checked").value;
    modulationOscillator.frequency.value = modulationFrequencySlider.value;
    modulationOscillator.connect(modulationGain);

    modulationGain.connect(mainOscillator.frequency);
    modulationGain.gain.value = modulationAmplitudeSlider.value;
    mainFrequencySlider.addEventListener("input", updateMainFrequency);
    modulationFrequencySlider.addEventListener("input", updateModulationFrequency);
    modulationAmplitudeSlider.addEventListener("input", updateModulationAmplitude);
    mainOscillator.connect(outputGain);
    modulationOscillator.start();
    mainOscillator.start();
    createEcho(mainOscillator);
});

window.addEventListener("keyup", function(event) {
    if (event.key !== " " || sirenPlaying === false) return;
    sirenPlaying = false;
    mainFrequencySlider.removeEventListener("input", updateMainFrequency);
    mainOscillator.disconnect(outputGain);
    modulationOscillator.disconnect(modulationGain);
    modulationGain.disconnect(mainOscillator.frequency);
    mainOscillator.stop();
    modulationOscillator.stop();
});

var delayTimeSlider = document.querySelector('input.delayTime');
delayTimeSlider.addEventListener('input', function(event) {
    delay.delayTime.value = delayTimeSlider.value;
});

var delayFeedbackSlider = document.querySelector('input.delayFeedback');
delayFeedbackSlider.addEventListener('input', function(event) {
    feedback.gain.value = delayFeedbackSlider.value;
});

function createEcho(source) {
    delay = delay || ctx.createDelay();
    delay.delayTime.value = delayTimeSlider.value;

    feedback = feedback || ctx.createGain();
    feedback.gain.value = delayFeedbackSlider.value;

    filter = filter || ctx.createBiquadFilter();
    var delayCutoffFrequencySlider = document.querySelector("input.delayCutoffFrequency");
    filter.frequency.value = delayCutoffFrequencySlider.value;
    filter.frequency.linearRampToValueAtTime(delayCutoffFrequencySlider.value - 1000, ctx.currentTime + 2);
    delayCutoffFrequencySlider.addEventListener("input", function() {
        filter.frequency.value = delayCutoffFrequencySlider.value;
        filter.frequency.linearRampToValueAtTime(delayCutoffFrequencySlider.value - 1000, ctx.currentTime + 2);
    });

    source.connect(delay);
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(outputGain);
    feedback.connect(delay);
    return delay;
}

})();
