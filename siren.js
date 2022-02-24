/* jshint browser: true */
window.ZongoDubSiren = (function() {
"use strict";

var DEBUG = false;

function log() {
  if (DEBUG) {
    console.log.apply(console, arguments);
  }
}

var $ = document.querySelector.bind(document),
    $$ = document.querySelectorAll.bind(document);

var currentPatch, delay, feedback, filter,
    spacebar = 32, numPadZero = 96,
    tapTempoKeyCode = 84, /* bind tap tempo to the t key */
    delayFactorDownCode = 74, delayFactorUpCode = 75,
    mainOscillator, modulationOscillator,
    sirenPlaying = false,
    ctx = new window.AudioContext(),
    outputGain = ctx.createGain(),
    modulationGain = ctx.createGain(),
    mainFrequencySlider = $("input.mainFrequency"),
    modulationFrequencySlider = $("input.modulationFrequency"),
    modulationAmplitudeSlider = $("input.modulationAmplitude"),
    delayTimeSlider = $('input.delayTime'),
    delayFeedbackSlider = $('input.delayFeedback'),
    outputVolumeSlider = $("input.volume"),
    javascriptNode = ctx.createScriptProcessor(2048, 1, 1),
    patchKeyMaps = getPatchKeyMaps(),
    analyser = ctx.createAnalyser();


function getPatchKeyMaps() {
  const upperRowOffset = 48, numPadOffset = 96;
  const values = Array.from($$(".patch-selection input")).map(
    input => input.value
  );
  const numPadMap = values.reduce((map, value) => {
    map[numPadOffset + parseInt(value)] = value;
    return map;
  }, {});
  const upperRowMap = values.reduce((map, value) => {
    map[upperRowOffset + parseInt(value)] = value;
    return map;
  }, {});
  return {
    numPad: numPadMap, upperRow: upperRowMap
  };
}


function initVolume() {
    outputGain.gain.value = outputVolumeSlider.value / 2.0;
    javascriptNode.connect(ctx.destination);
    outputGain.connect(ctx.destination);
    outputGain.connect(analyser);
    analyser.connect(javascriptNode);

    outputVolumeSlider.addEventListener("input", function () {
        outputGain.gain.value = outputVolumeSlider.value / 2.0;
    });

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
}


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


function updateMainFrequency() {
    mainOscillator.frequency.value = mainFrequencySlider.value;
}


function updateModulationFrequency() {
  if (modulationOscillator) {
    modulationOscillator.frequency.value = modulationFrequencySlider.value;
  }
}


function updateModulationAmplitude() {
    modulationGain.gain.value = modulationAmplitudeSlider.value;
}


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


function createEcho(source) {
    delay = delay || ctx.createDelay();
    updateDelayTime();

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


function updateDelayTime() {
  if (delay) {
    let selectedDelayFactorInput = $('input.delayFactor:checked')
    let delayFactor = parseFloat(selectedDelayFactorInput.value);
    let delayTime = delayTimeSlider.value * delayFactor;
    delay.delayTime.value = delayTime;
  }
}


function initEchoControls() {
  delayTimeSlider.addEventListener('input', function() {
    updateDelayTime();
  });

  delayFeedbackSlider.addEventListener('input', function() {
      feedback.gain.value = delayFeedbackSlider.value;
  });

  var delayFactorInputs = $$(".delayFactor");
  delayFactorInputs.forEach(function(delayFactorInput) {
    delayFactorInput.addEventListener('change', function() {
      updateDelayTime();
    });
  });
}


function patchIndex(patchNumber) {
    return parseInt(patchNumber) - 1;
}


function selectPatch(patch) {
    currentPatch = patch;
    localStorage.setItem("patch:current", currentPatch);
    applyPatch(currentPatch);
}


function initPatches() {
    currentPatch = localStorage.getItem("patch:current");
    var patchRadioButtons = $$("input[name=patch]");

    if (!currentPatch) {
        currentPatch = "1";
        var inputs = $$("input[type=range], .mainOscillatorType:checked, .modulationOscillatorType:checked, input.delayFactor:checked");
        inputs.forEach(function(input) {
          Object.values(patchKeyMaps.upperRow).forEach(function(patch) {
            var key = "patch:" + patch + ":" + input.className;
            localStorage.setItem(key, input.value);
          })
          input.addEventListener("change", storeInputValue);
        });
    }
    var currentPatchRadioButton = patchRadioButtons[patchIndex(currentPatch)];
    currentPatchRadioButton.setAttribute("checked", "checked");
    applyPatch(currentPatch);

    patchRadioButtons.forEach(function(radioButton) {
        radioButton.addEventListener("click", function() {
          selectPatch(radioButton.value);
        });
    });

    var inputs = $$("input[type=range], .mainOscillatorType, .modulationOscillatorType, input.delayFactor");
    inputs.forEach(function(input) {
      input.addEventListener("change", storeInputValue);
    });

    initPatchKeyBindings();
}


function storeInputValue(evt) {
  var slider = evt.target;
  var key = "patch:" + currentPatch + ":" + slider.className;
  localStorage.setItem(key, slider.value);
}


function applyPatch(patchNumber) {
  var prefix = "patch:" + patchNumber + ":";
  var patchKeys = Object.keys(localStorage).forEach(function(key) {
    if (key.indexOf(prefix) === 0) {
      var className = key.replace(prefix, "");
      var input = $("." + className);
      var storedValue = localStorage.getItem(key);
      if (input.type === "range") {
        input.value = storedValue;
      } else if (input.type === "radio") {
        var selector = '.' + className + '[value="' + storedValue + '"]';
        $(selector).checked = true;
      }
    }
  });
}


function initPatchKeyBindings() {
  window.addEventListener("keydown", function(evt) {
    var evt = evt || window.event;
    var keyCode = evt.which || evt.keyCode;
    var patch = patchKeyMaps.upperRow[keyCode] || patchKeyMaps.numPad[keyCode];
    if (patch) {
      selectPatch(patch);
      $("input[name=patch][value='" + patch + "']").checked = true;
    }
  });
}


function bindSpaceBar() {
  var isPlayTrigger = evt => evt.keyCode === spacebar || evt.keyCode === numPadZero;
  window.addEventListener("keydown", function(evt) {
      if (isPlayTrigger(evt)) {
        play();
        evt.preventDefault();
      }
  });

  window.addEventListener("keyup", function(evt) {
      if (isPlayTrigger(evt)) {
        stop();
        evt.preventDefault();
      }
  });
}


function bindButtons() {
  var playButton = document.getElementById("playButton");
  playButton.addEventListener("mousedown", play);
  playButton.addEventListener("touchstart", play);
  playButton.addEventListener("mouseup", stop);
  playButton.addEventListener("touchend", play);

  var panicButton = document.getElementById("panicButton");
  panicButton.addEventListener("click", location.reload.bind(location));
}


function RunningAverage() {

  // State is captured by closure
  var numberCount = 1;
  var currentAverage = 0;

  // Return a function that computes a running average
  return function(currentNumber) {
    currentAverage += ((currentNumber - currentAverage) / numberCount);
    numberCount++;
    return currentAverage;
  }

}


function changeDelayFactor(siblingProperty) {
  let selectedDelayFactorInput = $("input.delayFactor:checked");
  let containingLabel = selectedDelayFactorInput.parentElement;
  let siblingLabel = containingLabel[siblingProperty];
  if (siblingLabel.className === "delayFactorLabel") {
    let siblingInput = siblingLabel.querySelector("input.delayFactor");
    siblingInput.checked = true;
    siblingInput.dispatchEvent(new Event('change'))
    updateDelayTime();
  }
}


function increaseDelayFactor() {
  changeDelayFactor("nextElementSibling");
}


function decreaseDelayFactor() {
  changeDelayFactor("previousElementSibling");
}


function initTapTempo() {

  var previousTime = null,  // Time of the latest tap
    tapTempoButton = $("#tapTempoButton"),
    tapTempoValueContainer = $("#tapTempoValue"),
    avg = RunningAverage();

  function durationToBpm(duration) {
    // Returns a tempo in BPM corresponding to a duration in milliseconds
    // between two beats
    return 60000 / duration;
  }

  function durationToHz(duration) {
    // Returns a frequency in hertz corresponding to a duration in milliseconds
    // between two beats
    return durationToBpm(duration) / 60;
  }

  function inactiveFor(seconds) {
    var currentTime = new Date();
    return (currentTime - previousTime) > (seconds * 1000);
  }

  function shouldResetTapTempo() {
    // Returns whether we should start computing a new tempo or not.
    //
    // We consider that after the timeout has expired, the current tempo can be
    // discarded and we start computing a new tempo.
    var timeout = 3;  // timeout in seconds
    return previousTime === null || inactiveFor(3);
  }

  function computeTempo() {
    if (shouldResetTapTempo()) {
      tapTempoValueContainer.innerText = "---";
      previousTime = new Date();
      avg = RunningAverage();
    } else {
      var currentTime = new Date();
      var duration = (currentTime - previousTime); 
      log("********************");
      log("Duration", duration / 1000, "seconds");
      var averageDuration = avg(duration);
      log("Average duration", averageDuration);
      log("Current BPM", durationToBpm(duration));
      var averageBPM = durationToBpm(averageDuration);
      log("Average BPM", averageBPM);
      var averageFrequency = durationToHz(averageDuration)
      log("Average frequency", averageFrequency);
      tapTempoValueContainer.innerText = parseInt(averageBPM);
      previousTime = currentTime;
      applyFrequency(averageFrequency);
      applyDuration(averageDuration);
    }
  }

  function applyFrequency(frequency) {
    if ($(".modulationTapTempoSync").checked) {
      modulationFrequencySlider.value = frequency;
      updateModulationFrequency();
    }
  }

  function applyDuration(duration) {
    if ($(".delayTapTempoSync").checked) {
      delayTimeSlider.value = duration / 1000;
      updateDelayTime();
    }
  }

  tapTempoButton.addEventListener("click", function(evt) {
    computeTempo();
  });

  window.addEventListener("keydown", function(evt) {
    var evt = evt || window.event;
    var keyCode = evt.which || evt.keyCode;
    if (keyCode === tapTempoKeyCode) {
      computeTempo();
    } else if (keyCode === delayFactorDownCode) {
      decreaseDelayFactor();
    } else if (keyCode === delayFactorUpCode) {
      increaseDelayFactor();
    }
  });
}


initEchoControls();
initVolume();
initPatches();
bindSpaceBar();
bindButtons();
initTapTempo();

return {
  outputGain: outputGain
};

}());
