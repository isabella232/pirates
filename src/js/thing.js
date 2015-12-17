var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();
var d3 = require('d3');
var request = require('d3-request');

var DATA = null;

function init() {
	request.json('data/attacks.json', function(error, data) {
		DATA = data;

		render();
	});
}

function render() {
	var width = $('#interactive-content').width();

	renderMap({
		container: '#interactive-content',
		width: width,
		height: width / 2,
		data: DATA['2015']
	});

	// adjust iframe for dynamic content
	fm.resize()
}

function resize() {
	update()
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
	    // .center([0, 5])
	    // .scale(900)
	    // .rotate([-180,0]);

		var geoPath = d3.geo.path()
			.projection(projection);

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

		console.log(config['data']);

		chartElement.selectAll('path')
		  .data(config['data'])
		  .enter().append('path')
		  .attr('d', geoPath);
}


$(document).ready(function () {
	fm.resize()
	$(window).resize(throttle(resize, 250));
	init();
});
