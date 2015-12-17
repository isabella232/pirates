var d3 = require('d3');
var request = require('d3-request');
var topojson = require('topojson');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

var BORDERS = null;
var ATTACKS = null;

function init() {
	request.json('data/borders-topo.json', function(error, data) {
		BORDERS = topojson.feature(data, data['objects']['ne_110m_admin_0_countries']);

		console.log(BORDERS);

		request.json('data/attacks.json', function(error, data) {
			ATTACKS = data;

			console.log(ATTACKS);

			render();
		});
	});
}

function render() {
	var width = $('#interactive-content').width();

	renderMap({
		container: '#interactive-content',
		width: width,
		height: width / 2,
		borders: BORDERS,
		attacks: ATTACKS['2015']
	});

	// adjust iframe for dynamic content
	fm.resize()
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

		var projection = d3.geo.mercator()
			.scale(200)
	    .translate([chartWidth / 2, chartHeight / 2]);

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

		console.log(config['borders']);

		var borders = chartElement.append('g')
			.attr('class', 'borders');

		borders.append('path')
		  .datum(config['borders'])
		  .attr('d', geoPath);

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
