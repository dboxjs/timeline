import * as d3 from 'd3';

/* Simple timeline example
 * Single and multiline timelines
 */
export default function (config, helper) {
  var Timeline = Object.create(helper);

  Timeline.init = function (config) {
    var vm = this;
    vm._config = config ? config : {};
    vm._data = [];
    vm._scales = {};
    vm._axes = {};

    vm._config.parseDate = d3.timeParse('%Y-%m-%d');
    vm._config.curve = d3.curveLinear;

    vm._tip = vm.utils.d3
      .tip()
      .attr(
        'class',
        'd3-tip ' +
        (vm._config.tooltip && vm._config.tooltip.classed ?
          vm._config.tooltip.classed :
          '')
      )
      .html(
        vm._config.tip && vm._config.tip.html ?
        vm._config.tip.html :
        function (d) {
          let scaleColor =
            vm._scales.color !== false ?
            vm._scales.color(d.name) :
            vm._getQuantileColor(d.name, 'default');
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
          } else {
            var html = '<div> <strong>';
          }
          html +=
            `<strong style='color:${scaleColor}'>` + d.name + ': </strong>';
          html += d.y ?
            `<span >` +
            (Number.isNaN(+d.y) ?
              d.y :
              vm.utils.format(vm._config.yAxis)(d.y)) +
            '</span>' :
            '';
          html += '</div>';

          return html;
        }
      );
  };

  //-------------------------------
  //User config functions
  Timeline.x = function (col) {
    var vm = this;
    vm._config.x = col;
    return vm;
  };

  Timeline.parseDate = function (format) {
    var vm = this;
    vm._config.parseDate = d3.timeParse(format);
    return vm;
  };

  Timeline.y = function (col) {
    var vm = this;
    vm._config.y = col;
    return vm;
  };

  Timeline.series = function (arr) {
    var vm = this;
    vm._config.series = arr;
    return vm;
  };

  Timeline.curve = function (curve) {
    var vm = this;
    vm._config.curve = curve;
    return vm;
  };

  Timeline.fill = function (col) {
    var vm = this;
    vm._config.fill = col;
    return vm;
  };

  Timeline.colors = function (colors) {
    var vm = this;
    if (Array.isArray(colors)) {
      //Using an array of colors for the range
      vm._config.colors = colors;
    } else {
      //Using a preconfigured d3.scale
      vm._scales.color = colors;
    }
    return vm;
  };

  Timeline.tip = function (tip) {
    var vm = this;
    vm._config.tip = tip;
    vm._tip.html(vm._config.tip);
    return vm;
  };

  //-------------------------------
  //Triggered by the chart.js;
  Timeline.data = function (data) {
    var vm = this;

    vm._data = [];
    data.forEach(function (d) {
      var tmp = Object.assign({}, d);
      if (d[vm._config.x]) {
        try {
          d[vm._config.x].getTime();
          if (!Number.isNaN(d[vm._config.x].getTime())) {
            tmp.x = d[vm._config.x];
          }
        } catch (err) {
          tmp.x = vm._config.parseDate(d[vm._config.x]);
        }
      }

      tmp.color = d[vm._config.fill];
      delete tmp[vm._config.x];
      vm._data.push(tmp);
    });

    //Sort the data by d.x
    vm._data = vm._data.sort(function (a, b) {
      return d3.ascending(a.x, b.x);
    });

    vm._lines = vm._config.y ? vm._config.y : vm._config.series;

    vm._lines = vm._lines.map(function (name) {
      return {
        name: name,
        values: vm._data.map(function (d) {
          return {
            x: d.x,
            y: +d[name]
          };
        }),
      };
    });

    vm._lines.forEach(n => {
      n.values = n.values.filter(v => {
        return !isNaN(v.y);
      });
    });

    vm._line = d3
      .line()
      .curve(vm._config.curve)
      .defined(function (d) {
        return d.y !== undefined;
      })
      .x(function (d) {
        return vm._scales.x(d.x);
      })
      .y(function (d) {
        return vm._scales.y(d.y);
      });

    vm._area = d3
      .area()
      .curve(vm._config.curve)
      .x(function (d) {
        if (d.alreadyScaled && d.alreadyScaled === true) {
          return d.x;
        } else {
          return vm._scales.x(d.x);
        }
      })
      .y1(function (d) {
        if (d.alreadyScaled && d.alreadyScaled === true) {
          return d.y;
        } else {
          return vm._scales.y(d.y);
        }
      });

    return vm;
  };

  Timeline.scales = function () {
    var vm = this;

    vm._xMinMax = d3.extent(vm._data, function (d) {
      return d.x;
    });

    vm._yMinMax = [
      vm._config.yAxis.minZero ?
      0 :
      d3.min(vm._lines, function (c) {
        return d3.min(c.values, function (v) {
          return v.y;
        });
      }),
      d3.max(vm._lines, function (c) {
        return d3.max(c.values, function (v) {
          return v.y;
        });
      }),
    ];

    config = {
      column: vm._config.x,
      type: vm._config.xAxis.scale,
      range: [0, vm.chart.width],
      minZero: false,
    };
    vm._scales.x = vm.utils.generateScale(vm._data, config);

    config = {
      column: vm._config.y,
      type: vm._config.yAxis.scale,
      range: [vm.chart.height, 0],
      minZero: vm._config.yAxis.minZero,
    };
    vm._scales.y = vm.utils.generateScale(vm._data, config);

    vm._scales.x.domain(vm._xMinMax);
    vm._scales.y.domain(vm._yMinMax).nice();

    if (vm._config.hasOwnProperty('colors'))
      vm._scales.color = d3.scaleOrdinal(vm._config.colors);
    else vm._scales.color = d3.scaleOrdinal(d3.schemeCategory10);

    if (
      vm._scales.x.domain()[0].getTime() === vm._scales.x.domain()[1].getTime()
    ) {
      // max and min are the same, there's only one datum
      var oldDomain = vm._scales.x.domain();
      var oldRange = vm._scales.x.range();

      vm._scales.x
        .domain([
          new Date(oldDomain[0].getTime() - 1),
          oldDomain[0],
          oldDomain[1],
        ])
        .range([0, oldRange[0] + (oldRange[1] - oldRange[0]) / 2, oldRange[1]]);
    }

    return vm;
  };

  Timeline.drawLabels = function () {
    var vm = this;
    var chartW = vm.chart.width;

    vm.chart
      .svg()
      .selectAll('.dots')
      .each(function (dat) {
        var el = this;
        dat.values.forEach(function (c, index) {
          d3.select(el)
            .append('text')
            .attr('class', 'dbox-label')
            .attr('text-anchor', 'start')
            .attr('transform', function (d) {
              if (vm._scales.x(d.values[index].x) >= chartW) {
                d3.select(this).attr('text-anchor', 'end');
                return (
                  'translate (' +
                  (vm._scales.x(d.values[index].x) - 10) +
                  ',' +
                  (vm._scales.y(d.values[index].y) + 4) +
                  ')'
                );
              }
              d3.select(this).attr('text-anchor', 'start');
              return (
                'translate (' +
                (vm._scales.x(d.values[index].x) + 10) +
                ',' +
                (vm._scales.y(d.values[index].y) + 4) +
                ')'
              );
            })
            .text(function () {
              return c.y ? vm.utils.format(vm._config.yAxis, true)(c.y) : '';
            });
        });
      });
  };

  Timeline.draw = function () {
    var vm = this;
    //Call the tip
    vm.chart.svg().call(vm._tip);

    if (vm._scales.x.domain().length === 3) {
      vm.chart
        .svg()
        .select('.x.axis .tick')
        .remove();
    }

    var lines = vm.chart
      .svg()
      .selectAll('.lines')
      .data(vm._lines)
      .enter()
      .append('g')
      .attr('class', 'lines');

    var path = vm.chart
      .svg()
      .selectAll('.lines')
      .append('path')
      .attr('class', 'line')
      .attr('d', function (d) {
        return vm._line(d.values);
      })
      .attr('stroke', function (d) {
        return vm._scales.color !== false ?
          vm._scales.color(d.name) :
          vm._getQuantileColor(d.name, 'default');
      })
      .attr('stroke-width', 4)
      .attr('fill', 'none');

    /**By default it draws dots on data points with 4px radius*/
    var dots = vm.chart
      .svg()
      .selectAll('.dots')
      .data(vm._lines)
      .enter()
      .append('g')
      .attr('class', 'dots')
      .selectAll('.circle')
      .data(function (d) {
        d.values.forEach(el => {
          el.name = d.name;
        });
        return d.values;
      })
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', function (d, i) {
        return vm._scales.x(d.x);
      })
      .attr('cy', function (d) {
        return vm._scales.y(d.y);
      })
      .attr('r', 4)
      .style('stroke', function (d) {
        return vm._scales.color !== false ?
          vm._scales.color(d.name) :
          vm._getQuantileColor(d.name, 'default');
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
      });

    Timeline.drawLabels();
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
  };

  Timeline.init(config);
  return Timeline;
}