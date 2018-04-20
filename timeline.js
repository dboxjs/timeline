import * as d3 from 'd3';

/* Simple timeline example
 * Single and multiline timelines
 */
export default function(config, helper) {


  var Timeline = Object.create(helper);

  Timeline.init = function(config){
    var vm = this;
    vm._config = config ? config : {};
    vm._data = [];
    vm._scales ={};
    vm._axes = {};

    vm._config.parseDate = d3.timeParse('%Y-%m-%d');

    vm._line = d3.line()
      .curve(d3.curveCardinal)
      .x(function(d) { return vm._scales.x(d.x); })
      .y(function(d) { return vm._scales.y(d.y); });


    vm._area = d3.area()
      .curve(d3.curveCardinal)
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
    
    vm._tip = vm.utils.d3.tip().attr('class', 'd3-tip')
      .html(vm._config.tip && vm._config.tip.html ? vm._config.tip.html : function(d) {

        let scaleColor = vm._scales.color !== false ? vm._scales.color(d.name): vm._getQuantileColor(d.name,'default');
        if (vm.chart.config.styles) {
          var html = `<div style='
            line-height: 1; 
            opacity: ${vm.chart.style.tooltip.opacity}; 
            font-weight: ${vm.chart.style.tooltip.text.fontWeight}; 
            font-size: ${vm.chart.style.tooltip.text.fontSize}; 
            color: ${vm.chart.style.tooltip.text.textColor};
            font-family: ${vm.chart.style.tooltip.text.fontFamily};
            background-color: ${vm.chart.style.tooltip.backgroundColor}; 
            padding: ${vm.chart.style.tooltip.text.padding};   
            border: ${vm.chart.style.tooltip.border.width} solid ${vm.chart.style.tooltip.border.color};  
            border-radius:  ${vm.chart.style.tooltip.border.radius};'>`;
          html += `<strong style='color:${vm.chart.style.tooltip.text.fontColor};'>`;
        }
        else { var html = "<div> <strong>"; }
        html += `<strong style='color:${scaleColor}'>` + d.name + ": </strong>";
        html += d.y ? (`<span >` + (Number.isNaN(+d.y) ? d.y : vm.utils.format(d.y)) + '</span>') : '';
        html += "</div>";

        return html;

        /*var html ='';
        html += d.name + '<br>';
        //html += d.x ? ('<span>' + (Number.isNaN(+d.x) ? d.x : vm.utils.format(d.x)) + '</span></br>') : '';
        html += d.y ? ('<span>' + (Number.isNaN(+d.y) ? d.y : vm.utils.format(d.y)) + '</span></br>') : '';
        html += d.magnitude ? ('<span>' + (Number.isNaN(+d.magnitude) ? d.magnitude : vm.utils.format(d.magnitude)) + '</span></br>') : '';
        html += d.color ? ('<span>' + (Number.isNaN(+d.color) ? d.color : vm.utils.format(d.color)) + '</span>') : '';
        return html;*/
      });

  }

  //-------------------------------
  //User config functions
  Timeline.x = function(col){
    var vm = this;
    vm._config.x = col;
    return vm;
  }

  Timeline.parseDate = function(format){
    var vm = this;
    vm._config.parseDate = d3.timeParse(format);
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

  Timeline.tip = function (tip) {
    var vm = this;
    vm._config.tip = tip;
    vm._tip.html(vm._config.tip);
    return vm;
  };

  //-------------------------------
  //Triggered by the chart.js;
  Timeline.data = function(data){
    var vm = this;
    
    vm._data = [];
    data.forEach(function(d){
      d.x = vm._config.parseDate(d[vm._config.x]);
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
    //Call the tip
    vm.chart.svg().call(vm._tip);
    
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

    /**By default it draws dots on data points with 4px radius*/
    var dots = vm.chart.svg().selectAll('.dots')
      .data(vm._lines)
      .enter().append('g')
        .attr('class', 'dots')
        .selectAll('.circle')
        .data( function(d) { 
          d.values.forEach((el) => {el.name = d.name;}); 
          return d.values; 
        })
        .enter().append('circle')
          .attr('class', 'dot')
          .attr("cx", function(d, i) { 
            return vm._scales.x(d.x); 
          })
          .attr("cy", function(d) { 
            return vm._scales.y(d.y); 
          })
          .attr("r", 4)
          .style('stroke', function(d){   
            return vm._scales.color !== false ? vm._scales.color(d.name): vm._getQuantileColor(d.name,'default');
          })
          .style('stroke-width', 2)
          .style('fill', '#fff')
          .style('fill-opacity', 0.5)
          .on('mouseover', function (d, i) {
            if (vm._config.mouseover) {
              //vm._config.mouseover.call(vm, d, i);
            }
            vm._tip.show(d, d3.select(this).node());
          })
          .on('mouseout', function (d, i) {
            if (vm._config.mouseout) {
              //vm._config.mouseout.call(this, d, i);
            }
            vm._tip.hide(d, d3.select(this).node());
          })


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
