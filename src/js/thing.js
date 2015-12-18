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
var DEFAULT_WIDTH = 940;
var MOBILE_THRESHOLD = 600;
var PLAYBACK_SPEED = 900;
var LABEL_DEFAULTS = {
    'text-anchor': 'middle',
		'font-size': 1.0,
		'rotate': 0
};

var LABELS = [
	{
		'text': 'Arabian Sea',
		'loc': [64, 13],
		'font-size': 0.9
	}, {
	// 	'text': 'Indian Ocean',
	// 	'loc': [75, -15],
	// 	'font-size': 1.5
	// }, {
		'text': '<tspan dx="3.5%">South</tspan><tspan dx="-3.5%" dy="2.5%">China Sea</tspan>',
		'loc': [109, 16],
		'font-size': 0.6
	}, {
		'text': '<tspan dx="3.5%">East</tspan><tspan dx="-3.5%" dy="2.5%">China Sea</tspan>',
		'loc': [121, 30],
		'font-size': 0.6
	}, {
		'text': 'Bay of Bengal',
		'loc': [89, 12],
		'font-size': 0.6
	}, {
		'text': 'Gulf of Guinea',
		'loc': [2, 2],
		'font-size': 0.6
	}
];

var bordersData = null;
var attacksData = null;
var yearElement = null;
var playButtonElement = null;

var isMobile = false;
var playbackYear = 2006;
var isPlaying = false;
var hasPlayed = false;
var restarting = false;

function init() {
	request.json('data/borders-topo.json', function(error, data) {
		bordersData = topojson.feature(data, data['objects']['ne_110m_admin_0_countries']);

		request.json('data/attacks.json', function(error, data) {
			attacksData = data;

			render();
		});
	});
}

function onPlayButtonClicked() {
	d3.event.preventDefault();

	if (playbackYear == 2015) {
		restarting = true;
	}

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

	if (isPlaying) {
		// Don't immediately advance if just showing 2006
		if (restarting) {
			restarting = false;
		} else {
			playbackYear = playbackYear + 1;

			if (playbackYear == 2015) {
				isPlaying = false;
				hasPlayed = true;
			}
		}
	}

	renderMap({
		container: '#interactive-content',
		width: width,
		borders: bordersData,
		attacks: attacksData[playbackYear.toString()]
	});

	// adjust iframe for dynamic content
	fm.resize()

	if (isPlaying) {
		_.delay(render, PLAYBACK_SPEED);
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
		var aspectRatio = 5 / 3;
		var defaultScale = 330;
		var defaultDotSize = 3;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
		var width = config['width'];
		var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

		var mapCenter = [60, 0];
		var scaleFactor = chartWidth / DEFAULT_WIDTH;
		var mapScale = scaleFactor * defaultScale;

		var projection = d3.geo.cylindricalEqualArea()
			.center(mapCenter)
	    .translate([width / 2, height / 2])
			.scale(mapScale);

		var geoPath = d3.geo.path()
			.projection(projection)
			.pointRadius(defaultDotSize * scaleFactor);

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
		 * Create geographic elements.
		 */
		chartElement.append('path')
      .attr('class', 'landmass')
      .datum(config['borders'])
	      .attr('d', geoPath);

		chartElement.append('path')
			.attr('class', 'borders')
		  .datum(config['borders'])
			  .attr('d', geoPath);

		/*
     * Render place labels.
     */
		if (!isMobile) {
	    chartElement.append('g')
	      .attr('class', 'labels')
	      .selectAll('.label')
	      .data(LABELS)
	      .enter().append('text')
	        .attr('class', 'label')
	        .attr('transform', function(d) {
						var rotate = d['rotate'] || LABEL_DEFAULTS['rotate'];
	          return 'translate(' + projection(d['loc']) + ') rotate(' + rotate + ')';
	        })
	        .style('text-anchor', function(d) {
						return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
					})
					.style('font-size', function(d) {
						return ((d['font-size'] || LABEL_DEFAULTS['font-size']) * scaleFactor * 100).toString() + '%';
	        })
	        .html(function(d) {
	          return d['text'];
	        });
		}

		// Somalia label
		if (!isPlaying) {
			var line = d3.svg.line()
				.interpolate('basis')
				.x(function(d) {
					console.log(d);
					return projection(d)[0];
				})
				.y(function(d) {
					return projection(d)[1];
				});

			var somalia = chartElement.append('g')
				.attr('class', 'somalia');

			somalia.append('path')
				.attr('d', line([
					[55.5, 0],
					// [55.5, 4],
					[46, 4]
				]))
				.style('stroke-width', 3 * scaleFactor);

			somalia.append('text')
	      .attr('transform', function(d) {
	        return 'translate(' + projection([56, -0.5]) + ')';
	      })
	      .style('text-anchor', 'start')
				.style('dominant-baseline', 'middle')
				.style('font-size', (150 * scaleFactor) + '%')
	      .html(function(d) {
	        return 'Somalia';
	      });

			somalia.append('circle')
	      .attr('transform', function(d) {
	        return 'translate(' + projection([46, 4]) + ')';
	      })
				.attr('r', 5 * scaleFactor);
		}

		// Attacks
		var attacks = chartElement.append('g')
			.attr('class', 'attacks');

		attacks.selectAll('path')
			.data(config['attacks'])
			.enter().append('path')
				.attr('d', geoPath);

		// Year button
		chartElement.append('text')
			.attr('class', 'year')
			.attr('transform', 'translate(' + projection([80, -30]) + ') scale(' + scaleFactor + ')')
			.text(playbackYear)

		// Play button
		if (!isPlaying) {
			var controls = chartElement.append('g')
				.attr('class', 'controls')
				.attr('transform', 'translate(' + projection([67, -38]) + ') scale(' + scaleFactor + ')')
				.on('click', onPlayButtonClicked);

			controls.append('polygon')
				.attr('points', '0,0 0,40 40,20')

			controls.append('text')
				.attr('class', 'play')
				.attr('dx', 50)
				.attr('dy', 35)
				.text('Play')
		}
}

$(document).ready(function () {
	fm.resize()
	$(window).resize(throttle(resize, 250));
	init();
});
