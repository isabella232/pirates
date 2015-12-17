// Dependencies
var d3 = require('d3');
var request = require('d3-request');
require("d3-geo-projection")(d3);
var topojson = require('topojson');
var _ = require('lodash');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

// Globals
var MOBILE_THRESHOLD = 600;
var PLAYBACK_SPEED = 500;
var LABELS = [
	{}
];

var bordersData = null;
var attacksData = null;
var yearElement = null;
var playButtonElement = null;

var isMobile = false;
var playbackYear = 2006;
var isPlaying = false;

function init() {
	yearElement = d3.select('#year');
	playButtonElement = d3.select('#play')

	request.json('data/borders-topo.json', function(error, data) {
		bordersData = topojson.feature(data, data['objects']['ne_110m_admin_0_countries']);

		request.json('data/attacks.json', function(error, data) {
			attacksData = data;

			playButtonElement.on('click', onPlayButtonClicked);

			render();
		});
	});
}

function onPlayButtonClicked() {
	d3.event.preventDefault();

	playbackYear = 2006;
	isPlaying = true;
	render();
}

function render() {
	var width = $('#interactive-content').width();

	if (width <= MOBILE_THRESHOLD) {
			isMobile = true;
	} else {
			isMobile = false;
	}

	renderMap({
		container: '#interactive-content',
		width: width,
		height: width / 2,
		borders: bordersData,
		attacks: attacksData[playbackYear.toString()]
	});

	yearElement.text(playbackYear)

	// adjust iframe for dynamic content
	fm.resize()

	if (isPlaying) {
		playbackYear = playbackYear + 1;

		if (playbackYear > 2015) {
			playbackYear = 2006;
			isPlaying = false;
		} else {
			_.delay(render, PLAYBACK_SPEED);
		}
	}
}

function resize() {
	render()
	fm.resize()
}

/*
 * Render a bar chart.
 */
function renderMap(config) {
    /*
     * Setup
     */
    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - (margins['left'] + margins['right']);
    var chartHeight = config['height'] - (margins['top'] + margins['bottom']);

		var projection = d3.geo.cylindricalEqualArea()
			.center([60, 0])
	    .translate([config['width'] / 2, config['height'] / 2])
			.scale(config['width'] / 3);

		var geoPath = d3.geo.path()
			.projection(projection)
			.pointRadius(3);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
      .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
			.attr('width', chartWidth + margins['left'] + margins['right'])
			.attr('height', chartHeight + margins['top'] + margins['bottom'])
			.append('g')
			.attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

		/*
		 * Create filters.
		 */
		var filters = chartElement.append('filters');

		var landFilter = filters.append('filter')
      .attr('id', 'landshadow');

    landFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('result', 'blurOut')
      .attr('stdDeviation', '2');

		/*
		 * Create geographic elements.
		 */
		chartElement.append('path')
      .attr('class', 'landmass')
      .datum(config['borders'])
      .attr('filter', 'url(#landshadow)')
      .attr('d', geoPath);

		chartElement.append('path')
			.attr('class', 'borders')
		  .datum(config['borders'])
		  .attr('d', geoPath);

		// Attacks
		var attacks = chartElement.append('g')
			.attr('class', 'attacks');

		attacks.selectAll('path')
		  .data(config['attacks'])
		  .enter().append('path')
		  .attr('d', geoPath);
}


$(document).ready(function () {
	fm.resize()
	$(window).resize(throttle(resize, 250));
	init();
});
