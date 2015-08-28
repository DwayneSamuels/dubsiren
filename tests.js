/* jshint mocha: true, browser: true */
/* global chai, fixtures */
var assert = chai.assert;
fixtures.path = '.';

describe('Zongo Dub Siren', function() {
  "use strict";
  var doc, $, siren;
  beforeEach(function(done) {
    var fixtureWindow;
    fixtures.load('index.html');
    fixtureWindow = fixtures.window();
    fixtureWindow.addEventListener('load', function() {
      doc = fixtures.window().document;
      $ = doc.querySelector.bind(doc);
      done();
    });
  });
  afterEach(function() {
    fixtures.cleanUp();
  });
  it('should load fixture', function() {
    var title = $('h1');
    assert.equal(title.textContent, 'ZONGO DUB SIREN'); 
  });
  describe('volume slider', function() {
    it('should change output gain', function() {
      siren = fixtures.window().ZongoDubSiren;
      var outputVolumeSlider = $("input.volume"),
          inputEvent = new window.InputEvent('input');
      outputVolumeSlider.value = 0.5;
      outputVolumeSlider.dispatchEvent(inputEvent);
      assert.equal(siren.outputGain.gain.value, 0.5);
    });
  });
});
