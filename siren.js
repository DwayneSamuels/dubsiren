/* jshint browser: true */
(function() {
"use strict";

var source, delay, feedback, filter,
    ctx = new window.AudioContext(),
    mainOscillator, modulationOscillator,
    outputGain = ctx.createGain(), modulationGain = ctx.createGain(),
    mainFrequencySlider = document.querySelector("input.mainFrequency"),
    modulationFrequencySlider = document.querySelector("input.modulationFrequency");

outputGain.gain.value = 1;
outputGain.connect(ctx.destination);

function updateMainFrequency() {
    mainOscillator.frequency.value = mainFrequencySlider.value;
}

function updateModulationFrequency() {
    modulationOscillator.frequency.value = modulationFrequencySlider.value;
}


var sirenPlaying = false;


window.addEventListener("keydown", function(event) {
    if (event.key !== " " || sirenPlaying === true) return;
    sirenPlaying = true;
    mainOscillator = ctx.createOscillator();
    mainOscillator.type = "square";
    mainOscillator.frequency.value = mainFrequencySlider.value;
    modulationOscillator = ctx.createOscillator();
    modulationOscillator.type = "sine";
    modulationOscillator.frequency.value = modulationFrequencySlider.value;
    modulationOscillator.connect(modulationGain);
    modulationGain.connect(mainOscillator.frequency);
    modulationGain.gain.value = 10;
    mainFrequencySlider.addEventListener("input", updateMainFrequency);
    modulationFrequencySlider.addEventListener("input", updateModulationFrequency);
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

function createEcho(source) {
  delay = delay || ctx.createDelay();
  delay.delayTime.value = 0.5;

  feedback = feedback || ctx.createGain();
  feedback.gain.value = 0.4;

  filter = filter || ctx.createBiquadFilter();
  filter.frequency.value = 2000;
  filter.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 2);

  source.connect(delay);
  delay.connect(filter);
  filter.connect(feedback);
  feedback.connect(ctx.destination);
  feedback.connect(delay);
  return delay;
}
})();
