/* Simple timeline example
 * Single and multiline timelines
 */

export default function(config, helper) {

  var parseDate = d3.timeParse('%Y-%m-%d');

  var Timeline = Object.create(helper);

  Timeline.init = function(config){
    var vm = this;
    vm._config = config ? config : {};
    vm._data = [];
    vm._scales ={};
    vm._axes = {};

    vm._line = d3.line()
      .curve(d3.curveBasis)
      .x(function(d) { return vm._scales.x(d.x); })
      .y(function(d) { return vm._scales.y(d.y); });


    vm._area = d3.area()
      .curve(d3.curveBasis)
      .x(function(d) {
        if (d.alreadyScaled && d.alreadyScaled === true){
          return d.x;
        }else{
          return vm._scales.x(d.x);
        }
      })
      .y1(function(d) {
        if (d.alreadyScaled && d.alreadyScaled === true){
          return d.y;
        }else{
          return vm._scales.y(d.y);
        }

      });

  }

  //-------------------------------
  //User config functions
  Timeline.x = function(col){
    var vm = this;
    vm._config.x = col;
    return vm;
  }

  Timeline.y = function(col){
    var vm = this;
    vm._config.y = col;
    return vm;
  }

  Timeline.series = function(arr){
    var vm = this;
    vm._config.series = arr;
    return vm;
  }

  Timeline.fill = function(col){
    var vm = this;
    vm._config.fill = col;
    return vm;
  }

  Timeline.colors = function(colors) {
    var vm = this;
    if(Array.isArray(colors)) {
      //Using an array of colors for the range 
      vm._config.colors = colors;
    } else {
      //Using a preconfigured d3.scale
      vm._scales.color = colors;
    }
    return vm;
  }


  Timeline.end = function(){
    var vm = this;
    return vm._chart;
  }

  //-------------------------------
  //Triggered by the chart.js;
  Timeline.data = function(data){
    var vm = this;

    vm._data = [];
    data.forEach(function(d){
      d.x = parseDate(d[vm._config.x]);
      d.color = d[vm._config.fill];
      delete(d[vm._config.x]);
      vm._data.push(d);
    });

    vm._lines = vm._config.y ? vm._config.y : vm._config.series;

    vm._lines = vm._lines.map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return {x: d.x, y: +d[name]};
        })
      };
    });

    return vm;
  }

  Timeline.scales = function(){
    var vm = this;

    vm._xMinMax = d3.extent(vm._data, function(d) { return d.x; });

    vm._yMinMax = [
      vm._config.yAxis.minZero ? 0 : d3.min(vm._lines, function(c) { return d3.min(c.values, function(v) { return v.y; }); }),
      d3.max(vm._lines, function(c) { return d3.max(c.values, function(v) { return v.y; }); })
    ];

    config = {
      column: vm._config.x,
      type: vm._config.xAxis.scale,
      range: [0, vm.chart.width],
      minZero: false
    };
    vm._scales.x = vm.utils.generateScale(vm._data, config);


    config = {
      column: vm._config.y,
      type: vm._config.yAxis.scale,
      range: [vm.chart.height, 0],
      minZero: vm._config.yAxis.minZero
    };
    vm._scales.y = vm.utils.generateScale(vm._data, config);


    vm._scales.x.domain(vm._xMinMax)
    vm._scales.y.domain(vm._yMinMax)

    if(vm._config.hasOwnProperty('colors'))
      vm._scales.color = d3.scaleOrdinal(vm._config.colors);
    else
      vm._scales.color = d3.scaleOrdinal(d3.schemeCategory10);

    return vm;
  }


  Timeline.draw = function(){
    var vm = this;
    var lines = vm.chart.svg().selectAll(".lines")
      .data(vm._lines)
    .enter().append("g")
      .attr("class", "lines");

    var path = vm.chart.svg().selectAll(".lines").append("path")
      .attr("class", "line")
      .attr("d", function(d) {
        return vm._line(d.values);
      })
      .attr("stroke", function(d){   
        return vm._scales.color !== false ? vm._scales.color(d.name): vm._getQuantileColor(d.name,'default');
      })
      .attr("stroke-width", 4)
      .attr('fill','none');

    /**By default it draws dots on data points with 8px radius*/
    var dots = vm.chart.svg().selectAll('.lines').append('circle')
      .attr('class', 'dot')
      .attr("cx", function(d, i) { console.log('d is: '); return vm._scales.x(d.x) })
      .attr("cy", function(d) { return vm._scales.y(d.y) })
      .attr("r", 4)
      .style('stroke', function(d){   
        return vm._scales.color !== false ? vm._scales.color(d.name): vm._getQuantileColor(d.name,'default');
      })
      .style('stroke-width', 2)
      .style('fill', '#fff')
      .style('fill-opacity', 0.5);


    //var t = textures.lines().thicker();

    //vm.chart.svg().call(t);


    /* vm._area.y0(vm._scales.y(vm._yMinMax[0]));

    var areas = vm.chart.svg().selectAll(".areas")
      .data(vm._lines)
    .enter().append("g")
      .attr("class", "areas");

    var pathArea  = vm.chart.svg().selectAll(".areas").append("path")
      .attr("class", "area")
      .attr("d", function(d) {
        return vm._area(d.values);
      }) */
      //.attr("fill", t.url());

    return vm;
  }

  Timeline.init(config);
  return Timeline;
}
