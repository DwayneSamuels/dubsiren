/* jshint browser: true */
window.ZongoDubSiren = (function() {
"use strict";

 var $ = document.querySelector.bind(document),
     $$ = document.querySelectorAll.bind(document);

var currentPreset, delay, feedback, filter,
    spacebar = 32,
    mainOscillator, modulationOscillator,
    sirenPlaying = false,
    ctx = new window.AudioContext(),
    outputGain = ctx.createGain(),
    modulationGain = ctx.createGain(),
    mainFrequencySlider = $("input.mainFrequency"),
    modulationFrequencySlider = $("input.modulationFrequency"),
    modulationAmplitudeSlider = $("input.modulationAmplitude"),
    outputVolumeSlider = $("input.volume"),
    javascriptNode = ctx.createScriptProcessor(2048, 1, 1),
    analyser = ctx.createAnalyser();

function presetIndex(presetNumber) {
    return parseInt(presetNumber) - 1;
}

function selectPreset(preset) {
    currentPreset = preset;
    localStorage.setItem("preset:current", currentPreset);
    applyPreset(currentPreset);
}

function initPresets() {
    currentPreset = localStorage.getItem("preset:current");
    var presetRadioButtons = $$("input[name=preset]");

    if (!currentPreset) {
        currentPreset = "1";
        var inputs = $$("input[type=range], .mainOscillatorType:checked, .modulationOscillatorType:checked");
        inputs.forEach(function(input) {
          ["1", "2", "3", "4"].forEach(function(preset) {
            var key = "preset:" + preset + ":" + input.className;
            localStorage.setItem(key, input.value);
          })
          input.addEventListener("change", storeInputValue);
        });
    }
    var currentPresetRadioButton = presetRadioButtons[presetIndex(currentPreset)];
    currentPresetRadioButton.setAttribute("checked", "checked");
    applyPreset(currentPreset);

    presetRadioButtons.forEach(function(radioButton) {
        radioButton.addEventListener("click", function() {
          selectPreset(radioButton.value);
        });
    });
}


(function initVolumeMeter() {
    var canvasElement = document.getElementById("canvas");
    var width = canvasElement.width, height = canvasElement.height;
    var canvas = canvasElement.getContext("2d");
    var gradient = canvas.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(1, '#da121a');
    gradient.addColorStop(0.5, '#fcdd09');
    gradient.addColorStop(0, '#078930');

    javascriptNode.onaudioprocess = function() {
        // get the average, bincount is fftsize / 2
        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var average = getAverageVolume(array);

        // clear the current state
        canvas.clearRect(0, 0, width, height);

        // set the fill style
        canvas.fillStyle = gradient;

        // create the meters
        canvas.fillRect(0, 0, (0 + average) * 1.8, height);
    }
}());


function getAverageVolume(array) {
    var values = 0;
    var average;

    var length = array.length;

    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

outputGain.gain.value = outputVolumeSlider.value / 2.0;
javascriptNode.connect(ctx.destination);
outputGain.connect(ctx.destination);
outputGain.connect(analyser);
analyser.connect(javascriptNode);

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
    outputGain.gain.value = outputVolumeSlider.value / 2.0;
});


function play() {
    if (sirenPlaying === true) {
      return;
    }
    sirenPlaying = true;

    mainOscillator = ctx.createOscillator();
    mainOscillator.type = $("input.mainOscillatorType:checked").value;
    mainOscillator.frequency.value = mainFrequencySlider.value;

    modulationOscillator = ctx.createOscillator();
    modulationOscillator.type = $("input.modulationOscillatorType:checked").value;
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
}

function stop() {
    if (sirenPlaying === false) {
      return;
    }
    sirenPlaying = false;
    mainFrequencySlider.removeEventListener("input", updateMainFrequency);
    mainOscillator.disconnect(outputGain);
    modulationOscillator.disconnect(modulationGain);
    modulationGain.disconnect(mainOscillator.frequency);
    mainOscillator.stop();
    modulationOscillator.stop();
}


window.addEventListener("keydown", function(evt) {
    if (evt.keyCode === spacebar) {
      play();
      evt.preventDefault();
    }
});

window.addEventListener("keyup", function(evt) {
    if (evt.keyCode === spacebar) {
      stop();
      evt.preventDefault();
    }
});


window.addEventListener("keydown", function(evt) {
  var evt = evt || window.event;
  var keyCode = evt.which || evt.keyCode;
  var preset = {49: "1", 50: "2", 51: "3", 52: "4"}[keyCode];
  if (preset) {
    selectPreset(preset);
    $("input[name=preset][value='" + preset + "']").checked = true;
  }
});

var playButton = document.getElementById("playButton");
playButton.addEventListener("mousedown", play);
playButton.addEventListener("touchstart", play);
playButton.addEventListener("mouseup", stop);
playButton.addEventListener("touchend", play);

var delayTimeSlider = $('input.delayTime');
delayTimeSlider.addEventListener('input', function() {
    delay.delayTime.value = delayTimeSlider.value;
});

var delayFeedbackSlider = $('input.delayFeedback');
delayFeedbackSlider.addEventListener('input', function() {
    feedback.gain.value = delayFeedbackSlider.value;
});

var panicButton = document.getElementById("panicButton");
panicButton.addEventListener("click", location.reload.bind(location));

initPresets();

function storeInputValue(evt) {
  var slider = evt.target;
  var key = "preset:" + currentPreset + ":" + slider.className;
  localStorage.setItem(key, slider.value);
}

var inputs = $$("input[type=range], .mainOscillatorType, .modulationOscillatorType");
inputs.forEach(function(input) {
  input.addEventListener("change", storeInputValue);
});

function applyPreset(presetNumber) {
  var prefix = "preset:" + presetNumber + ":";
  var presetKeys = Object.keys(localStorage).forEach(function(key) {
    if (key.indexOf(prefix) === 0) {
      var className = key.replace(prefix, "");
      var input = $("." + className);
      var storedValue = localStorage.getItem(key);
      if (input.type === "range") {
        input.value = storedValue;
      } else if (input.type === "radio") {
        var selector = "." + className + "[value=" + storedValue + "]";
        $(selector).checked = true;
      }
    }
  });
}

function createEcho(source) {
    delay = delay || ctx.createDelay();
    delay.delayTime.value = delayTimeSlider.value;

    feedback = feedback || ctx.createGain();
    feedback.gain.value = delayFeedbackSlider.value;

    filter = filter || ctx.createBiquadFilter();
    var delayCutoffFrequencySlider = $("input.delayCutoffFrequency");
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

return {
  outputGain: outputGain
};

}());
