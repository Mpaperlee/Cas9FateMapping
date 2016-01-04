// ----------------------------------------------------------------------
// A javascript / D3 script to take data from lineage tracing experiments
// and plot edits over the barcoded regions we have
//
// December 7th, 2015
//
// ----------------------------------------------------------------------

// the total width of the plots on the right and left sides

var numberToType = {"0": "match", "1": "deletion", "2": "insertion"};

// the mutation rate and type plot on the top
var left_panel_total_width = 800;

var topHeight = 100

var margin = {top: 0, right: 0, bottom: 5, left: 100},
    width = left_panel_total_width,
    height = topHeight - margin.top - margin.bottom,
    heat_height = 400;

// colors we use for events throughout the plots
// 1) color for unedited
// 2) color for deletions
// 3) color for insertions
// 3) color for mismatch? might be useful for TYR data
//var heatmap_colors = ['#D8D8D8','#CE343F','#2E4D8E','#D49E35'];
var heatmap_colors = ['#FFFFFF','#CE343F','#2E4D8E','#D49E35'];

// the labels for types of events we support in the input data
var mutation_values = ["reference","insertion","deletion","mismatch"];
var maxValue = mutation_values.length;

var formatThousands = d3.format("0,000");

// ************************************************************************************************************
// setup the SVG panels
// ************************************************************************************************************
var svgHeat = d3.select("#heatmap").append("svg")
    .attr("width", width)
    .attr("height", left_panel_total_width)
    .append("g")

var svgHeatRight = d3.select("#heatmapRight").append("svg")
    .attr("width", 200)
    .attr("height", left_panel_total_width + margin.top + margin.bottom + 100)
    .append("g")

var svg = d3.select("#topplot").append("svg")
      .attr("width", width)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// ************************************************************************************************************
// histrogram of events over the length of our amplicon -- taken from all reads
// ************************************************************************************************************
d3.tsv(per_base_histogram_data, function(error, data) {
  // make a new data set where we melt down the mutations -- effectively like melt in R
  var muts = d3.layout.stack()(["deletion", "insertion"].map(function(mutation) {
    return data.map(function(d) {
      return {x: parseInt(d.index), y: +d[mutation], type: numberToType[mutation]};
    });
  }));

  var xEvents = d3.scale.ordinal().domain(muts[0].map(function(d) { return d.x; }))
      .rangeRoundBands([0, width], .1);

  var yEvents = d3.scale.linear().domain([0, d3.max(muts[0].map(function(d) { return d.y; }))])
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(xEvents)
      .orient("bottom");

  formatter = d3.format("2.1%");
  var yAxis = d3.svg.axis()
      .scale(yEvents)
      .orient("left")
      .ticks(4)
      .tickFormat(formatter)
      .outerTickSize(0);  

  // ************************************************************************************************************
  // load in the cutsite data and draw that onto the plot -- this is nested to use the x and y axis object from above
  // ************************************************************************************************************
  d3.tsv(cut_site_file, function(error, data) {
      svg.selectAll('.target')
          .data(data)
          .enter().append('rect')
          .attr('class', 'target')
          .attr('x', function(d) { return xEvents(+d.position); })
          .attr('y', 0)
          .attr('width', function(d) { return xEvents(20) - xEvents(0) })
          .attr('height', height)
          .attr("fill-opacity", .1)
          .attr("stroke", "#888888")
      
      svg.selectAll('.cutsites')
          .data(data)
          .enter().append('rect')
          .attr('class', 'cutsites')
          .attr('x', function(d) { return xEvents(+d.cutPos); })
          .attr('y', 0)
          .attr('width', function(d) { return xEvents(3)- xEvents(0) })
          .attr('height', height)
          .attr("fill-opacity", .4)
          .attr("fill", "gray")
  });

  var mutbox = svg.selectAll(".bar")
      .data(muts)
      .enter().append("svg:g")
      .attr("class", "cause")
      .style("fill", function(d, i) { return heatmap_colors[i + 1]; })
      .style("stroke", function(d, i) { return d3.rgb(heatmap_colors[i + 1]); });

  var line = d3.svg.line()
      .x(function(d) { return xEvents(d.x); })
      .y(function(d) { return yEvents(d.y); });

  svg.append("svg:path").attr("d", line(muts[0])).attr("class", "line").attr("fill", "none").attr("stroke", heatmap_colors[1]).attr("stroke-width", "3px")
  svg.append("svg:path").attr("d", line(muts[1])).attr("class", "line").attr("fill", "none").attr("stroke",  heatmap_colors[2]).attr("stroke-width", "3px")

  svg.append("g")
      .attr("class", "y axis")
	.attr("transform", "translate(" + (xEvents(0) - 5) + ",0)")
        .attr("anchor", "right")  
	.call(yAxis)

    //Add the text legend
    svg.append("text")
        .attr("x", function(d) { return -100; })
        .attr("y", function(d) { return 40; })
	.attr("transform", "translate(0," + (-50) + ")")
        .attr("text-anchor", "left")  
        .style("font-size", "12px") 
        .text("Editing percentage")
	.attr("transform", "rotate(-90)");

});

// ************************************************************************************************************
// histogram on the right
// ************************************************************************************************************
d3.tsv(occurance_file, function(error, data) {

    formatter = d3.format(".0%");
    var yScale = d3.scale.ordinal().domain(data.map(function (d) {return d.array; })).rangeRoundBands([0, heat_height]);
    var yAxis = d3.svg.
	axis().
	scale(yScale).
	orient("left").
	ticks(4)
	.tickFormat(formatter)
	.outerTickSize(0);  
    var prescale = d3.scale.linear().domain([0, d3.max(data, function(d) {return +d.count})]).range([0, 150]);
    var xAxis = d3.svg.axis().scale(prescale).ticks(6).orient("top").tickFormat(formatter); 

    var mutbox2 = svgHeatRight.selectAll(".bar")
        .data(data)
        .enter().append("svg:g")
        .attr("class", "cause")
        .style("fill", function(d, i) { return heatmap_colors[0]; })
        .style("stroke", function(d, i) { return "gray"; });

    var readCount = parseInt(d3.max(data.map(function (d) {return +d.array; })));
    var gridHeight = parseInt(heat_height / readCount);

    // both the fill and stroke colors for the WT and non-WT HMIDs
    var wt_colors = ['#000000','#3EAF2C','#555555','#117202','#333333'];

    
    mutbox2.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return 0; })
        .attr("width", function(d) { return prescale(+d.count); })
        .attr("y", function(d) { return topHeight + yScale(+d.array); })
        .attr("height", function(d) { return gridHeight * 0.65; })
	.style("fill", function(d, i){return wt_colors[+d.WT];})
	.style("stroke", function(d, i){return wt_colors[+d.WT+2];});

    svgHeatRight.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + 90 + ")")
        .call(xAxis)
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(90)" )
            .attr("y", 1)

    svgHeatRight.selectAll(".tick")
            .each(function (d) {
                if ( d === 0 ) {
                    this.remove();
                }
            });

    //Add the text legend
    svgHeatRight.append("text")
        .attr("x", function(d) { return 15; })
        .attr("y", function(d) { return topHeight - 50; })
        .attr("text-anchor", "left")  
        .style("font-size", "12px") 
        .text("HMID percentage of total");

});

// ************************************************************************************************************
// read plots -- add a block for each of the high frequency reads we observe
// ************************************************************************************************************
d3.tsv(top_read_melted_to_base, function(error, data) {
    // the scales and axis for the heatmap data
    var yScale = d3.scale.ordinal().domain(data.map(function (d) {return +d.array; })).rangeRoundBands([0, heat_height]);
    var xScale = d3.scale.ordinal().domain(data.map(function (d) {return +d.position; })).rangeRoundBands([margin.left, left_panel_total_width + margin.left]);

    var dmt = xScale.domain().length;
    var gridWidth = parseInt(width / dmt);
    var readCount = parseInt(d3.max(data.map(function (d) {return d.array; })));
    var gridHeight = parseInt(heat_height / readCount);
    var gridPadding = 0.1
    var gridOffset = parseInt(gridWidth + (gridWidth /2) );

    var max = d3.entries(data).sort(function(a, b) {
	return d3.descending(+a.value.position, +b.value.position); }
				   )[0].value.position;
    var min = d3.entries(data).sort(function(a, b) {
	return d3.ascending(+a.value.position, +b.value.position); }
				   )[0].value.position;

    
    var rectangle = svgHeat.append("rect")
        .attr("x", xScale(min))
        .attr("y", 0)
        .attr("width", xScale(max) - xScale(min))
        .attr("height", heat_height)
        .attr("fill", "#888888");
    
    var heatMap = svgHeat.selectAll(".heatmap")
        .data(data)
        .enter().append("svg:rect")
        .attr("x", function(d,i) { return xScale(+d.position) })
        .attr("y", function(d,i) { return yScale(+d.array) + (gridHeight * 0.1)})
        .attr("width", function(d) { return gridWidth; })
        .attr("height", function(d) { return gridHeight * 0.8 })
        .style("fill", function(d) { return heatmap_colors[+d.event]; })
    //.style("stroke", function(d) { return d3.rgb("white"); });
    
    //heatMap.transition().duration(1).style("fill", function(d) { return heatmap_colors[+d.event]; });

});
