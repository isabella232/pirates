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
		'font-size': 0.6,
		'rotate': 0
};

var LABELS = [
	{
		'text': 'Arabian Sea',
		'loc': [64, 15]
	}, {
		'text': '<tspan dx="3.5%">South</tspan><tspan dx="-3.5%" dy="2%">China Sea</tspan>',
		'loc': [109, 16]
	}, {
	// 	'text': '<tspan dx="3.5%">East</tspan><tspan dx="-3.5%" dy="2%">China Sea</tspan>',
	// 	'loc': [121, 30]
	// }, {
		'text': 'Bay of Bengal',
		'loc': [89, 12]
	}, {
		'text': 'Gulf of Guinea',
		'loc': [2, 2]
	}, {
		'text': 'Strait of Malacca',
		'loc': [90, -2]
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
		var defaultScale = 350;
		var defaultDotSize = 3;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
		var width = config['width'];
    var aspectRatio = (width >= 940) ? (5 / 3) : (5 / 3.2);
		var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

		var mapCenter = [53, 8];
		var scaleFactor = Math.min(940, chartWidth) / DEFAULT_WIDTH;
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
		 var borders = chartElement.append('g')
 			.attr('class', 'borders');

 		borders.selectAll('path')
 			.data(config['borders']['features'])
 			.enter().append('path')
				.attr('id', function(d) {
					return d['id'];
				})
 				.attr('d', geoPath);

		/*
     * Render place labels.
     */
	 	chartElement.append('defs')
	 		.append('marker')
	 		.attr('id','arrowhead')
	 		.attr('orient','auto')
	 		.attr('viewBox','0 0 5.108 8.18')
	 		.attr('markerHeight','8.18')
	 		.attr('markerWidth','5.108')
	 		.attr('orient','auto')
	 		.attr('refY','4.09')
	 		.attr('refX','5')
	 		.append('polygon')
	 		.attr('points','0.745,8.05 0.07,7.312 3.71,3.986 0.127,0.599 0.815,-0.129 5.179,3.999')
	 		.attr('fill','#4C4C4C')

		var arrowLine = d3.svg.line()
			.interpolate('basis')
			.x(function(d) {
				return projection(d)[0];
			})
			.y(function(d) {
				return projection(d)[1];
			});

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

			chartElement.append('path')
				.attr('class', 'arrow')
				.attr('d', arrowLine([
					[90, 0],
					[92, 3],
					[100.5, 3]
				]))
				.style('marker-end', 'url(#arrowhead)');
		}

		// Somalia label
		if (!isPlaying) {
			var somalia = chartElement.append('g')
				.attr('class', 'somalia');

			somalia.append('path')
				.attr('class', 'arrow')
				.attr('d', arrowLine([
					[55.5, 0],
					[55.5, 4],
					[48, 4]
				]))
				.style('marker-end', 'url(#arrowhead)');

			somalia.append('text')
	      .attr('transform', function(d) {
	        return 'translate(' + projection([55.5, -3]) + ')';
	      })
	      .style('text-anchor', 'middle')
				.style('font-size', (125 * scaleFactor) + '%')
	      .html(function(d) {
	        return 'Somalia';
	      });
		}

		// Attacks
		var attacks = chartElement.append('g')
			.attr('class', 'attacks');

		attacks.selectAll('path')
			.data(config['attacks'])
			.enter().append('path')
				.attr('d', geoPath);

		// Year display
		chartElement.append('text')
			.attr('class', 'year')
			.attr('transform', 'translate(' + projection([58, -25]) + ') scale(' + scaleFactor + ')')
			.text(playbackYear)

		// Play button
		var controls = chartElement.append('g')
			.attr('class', 'controls')
			.attr('transform', 'translate(' + projection([67, -31]) + ') scale(' + scaleFactor + ')')

    if (!isPlaying) {
			controls.append('polygon')
				.attr('points', '0,0 0,40 40,20')

			controls.append('text')
				.attr('dx', 50)
				.attr('dy', 35)
				.text('Play')

			var nw = projection([65, -29]);
			var se = projection([92, -41]);

			// Click area
			chartElement.append('rect')
				.attr('class', 'play')
				.attr('transform', 'translate(' + nw + ')')
				.attr('width', se[0] - nw[0])
				.attr('height', se[1] - nw[1])
        .attr('rx', isMobile ? 3 : 5)
        .attr('ry', isMobile ? 3 : 5)
				.on('click', onPlayButtonClicked);
		}
}

$(document).ready(function () {
	fm.resize()
	$(window).resize(throttle(resize, 250));
	init();
});
