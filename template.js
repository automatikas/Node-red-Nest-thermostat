
<div id="thermostat1"></div>

<script>
    
    var thermostatId = "thermostat1";

    var thermostatDial = (function() {
	
	/*
	 * Utility functions
	 */
	
	// Create an element with proper SVG namespace, optionally setting its attributes and appending it to another element
	function createSVGElement(tag,attributes,appendTo) {
		var element = document.createElementNS('http://www.w3.org/2000/svg',tag);
		attr(element,attributes);
		if (appendTo) {
			appendTo.appendChild(element);
		}
		return element;
	}
	
	// Set attributes for an element
	function attr(element,attrs) {
		for (var i in attrs) {
			element.setAttribute(i,attrs[i]);
		}
	}
	
	// Rotate a cartesian point about given origin by X degrees
	function rotatePoint(point, angle, origin) {
		var radians = angle * Math.PI/180;
		var x = point[0]-origin[0];
		var y = point[1]-origin[1];
		var x1 = x*Math.cos(radians) - y*Math.sin(radians) + origin[0];
		var y1 = x*Math.sin(radians) + y*Math.cos(radians) + origin[1];
		return [x1,y1];
	}
	
	// Rotate an array of cartesian points about a given origin by X degrees
	function rotatePoints(points, angle, origin) {
		return points.map(function(point) {
			return rotatePoint(point, angle, origin);
		});
	}
	
	// Given an array of points, return an SVG path string representing the shape they define
	function pointsToPath(points) {
		return points.map(function(point, iPoint) {
			return (iPoint>0?'L':'M') + point[0] + ' ' + point[1];
		}).join(' ')+'Z';
	}
	
	function circleToPath(cx, cy, r) {
		return [
			"M",cx,",",cy,
			"m",0-r,",",0,
			"a",r,",",r,0,1,",",0,r*2,",",0,
			"a",r,",",r,0,1,",",0,0-r*2,",",0,
			"z"
		].join(' ').replace(/\s,\s/g,",");
	}
	
	function donutPath(cx,cy,rOuter,rInner) {
		return circleToPath(cx,cy,rOuter) + " " + circleToPath(cx,cy,rInner);
	}
	
	// Restrict a number to a min + max range
	function restrictToRange(val,min,max) {
		if (val < min) return min;
		if (val > max) return max;
		return val;
	}
	
	// Round a number to the nearest 0.5
	function roundHalf(num) {
		return Math.round(num*2)/2;
	}
	
	// Round a number to the nearest 0.1
	function roundTenth(num) {
		return Math.round(num*10)/10;
	}
	
	function setClass(el, className, state) {
		el.classList[state ? 'add' : 'remove'](className);
	}
	
	/*
	 * The "MEAT"
	 */

	return function(targetElement, options) {
		var self = this;
		
		/*
		 * Options
		 */
		options = options || {};
		options = {
		    targetOnCenter: options.targetOnCenter || true, //Display target temperature in center of dial. Otherwise, display ambient temperature
			diameter: options.diameter || 400,
			minValue: options.minValue || 10, // Minimum value for target temperature
			maxValue: options.maxValue || 30, // Maximum value for target temperature
			toggleValues: options.toggleValues || [10,22,30], // Values for toggling
			numTicks: options.numTicks || 200, // Number of tick lines to display around the dial
			onSetTargetTemperature: options.onSetTargetTemperature || function() {}, // Function called when new target temperature set by the dial
			onToggleTargetTemperature: options.onToggleTargetTemperature || function() {}, // Function called when new target temperature is toggled by tapping the dial
		};
		// restrict toggleValues to valid range
		options.toggleValues = options.toggleValues.map(v => {return (v < options.minValue) ? options.minValue : (v > options.maxValue) ? options.maxValue : v});
		
		/*
		 * Properties - calculated from options in many cases
		 */
		var properties = {
			tickDegrees: 300, // Degrees of the dial that should be covered in tick lines
			rangeValue: options.maxValue - options.minValue,
			radius: options.diameter/2,
			ticksOuterRadius: options.diameter / 30,
			ticksInnerRadius: options.diameter / 8,
			hvac_states: ['off', 'heating', 'cooling'],
			dragLockAxisDistance: 15,
			labels: {
                targetLabel: 'Set',
                ambientUnits: 'ºC'
			}
		}
		properties.lblDialPosition = [properties.radius, properties.ticksOuterRadius-(properties.ticksOuterRadius-properties.ticksInnerRadius)/2]
		properties.offsetDegrees = 180-(360-properties.tickDegrees)/2;
		
		/*
		 * Object state
		 */
		var state = {
			target_temperature: options.minValue,
			ambient_temperature: options.minValue,
			hvac_state: properties.hvac_states[0],
			has_leaf: false,
			away: false
		};
		
		/*
		 * Property getter / setters
		 */
		Object.defineProperty(this,'target_temperature',{
			get: function() {
				return state.target_temperature;
			},
			set: function(val) {
				state.target_temperature = restrictTargetTemperature(+val);
				render();
			}
		});
		Object.defineProperty(this,'ambient_temperature',{
			get: function() {
				return state.ambient_temperature;
			},
			set: function(val) {
			    if (options.targetOnCenter)
				    state.ambient_temperature = roundHalf(+val);
				else
				    state.ambient_temperature = roundTenth(+val);
				render();
			}
		});
		Object.defineProperty(this,'hvac_state',{
			get: function() {
				return state.hvac_state;
			},
			set: function(val) {
				if (properties.hvac_states.indexOf(val)>=0) {
					state.hvac_state = val;
					render();
				}
			}
		});
		function str2bool(strvalue){
          return (strvalue && typeof strvalue == 'string') ? (strvalue.toLowerCase() == 'true') : (strvalue == true);
        }
		Object.defineProperty(this,'has_leaf',{
			get: function() {
				return state.has_leaf;
			},
			set: function(val) {
				state.has_leaf = !!str2bool(val);
				render();
			}
		});
		Object.defineProperty(this,'away',{
			get: function() {
				return state.away;
			},
			set: function(val) {
				state.away = !!str2bool(val);
				render();
			}
		});
		
		/*
		 * SVG
		 */
		var svg = createSVGElement('svg',{
			width: '95%', //options.diameter+'px',
			height: '95%', //options.diameter+'px',
			viewBox: '0 0 '+options.diameter+' '+options.diameter,
			class: 'dial'
		},targetElement);
		// CIRCULAR DIAL
		var circle = createSVGElement('circle',{
			cx: properties.radius,
			cy: properties.radius,
			r: properties.radius,
			class: 'dial__shape'
		},svg);
		// EDITABLE INDICATOR
		var editCircle = createSVGElement('path',{
			d: donutPath(properties.radius,properties.radius,properties.radius-4,properties.radius-8),
			class: 'dial__editableIndicator',
		},svg);
		
		/*
		 * Ticks
		 */
		var ticks = createSVGElement('g',{
			class: 'dial__ticks'	
		},svg);
		var tickPoints = [
			[properties.radius-1, properties.ticksOuterRadius],
			[properties.radius+1, properties.ticksOuterRadius],
			[properties.radius+1, properties.ticksInnerRadius],
			[properties.radius-1, properties.ticksInnerRadius]
		];
		var tickPointsLarge = [
			[properties.radius-1.5, properties.ticksOuterRadius],
			[properties.radius+1.5, properties.ticksOuterRadius],
			[properties.radius+1.5, properties.ticksInnerRadius+20],
			[properties.radius-1.5, properties.ticksInnerRadius+20]
		];
		var theta = properties.tickDegrees/options.numTicks;
		var tickArray = [];
		for (var iTick=0; iTick<options.numTicks; iTick++) {
			tickArray.push(createSVGElement('path',{d:pointsToPath(tickPoints)},ticks));
		};
		
		/*
		 * Labels
		 */
		var lblCenter = createSVGElement('text',{
			x: properties.radius,
			y: properties.radius,
			class: 'dial__lbl dial__lbl--center'
		},svg);
		var lblCenter_text = document.createTextNode('');
		lblCenter.appendChild(lblCenter_text);
		//
		var lblCenterHalf = createSVGElement('text',{
			x: properties.radius + properties.radius/2.5,
			y: properties.radius - properties.radius/8,
			class: 'dial__lbl dial__lbl--center--half'
		},svg);
		var lblCenterHalf_text = document.createTextNode('0');
		lblCenterHalf.appendChild(lblCenterHalf_text);
		//
		var lblCenterlabel = createSVGElement('text', {
          x: properties.radius,
          y: properties.radius - properties.radius / 2,
          class: 'dial__lbl dial__lbl--centerlabel'
        }, svg);
        var lblCenterlabel_text = document.createTextNode(properties.labels.targetLabel);
        lblCenterlabel.appendChild(lblCenterlabel_text);
        //
		var lblDial = createSVGElement('text',{
			class: 'dial__lbl dial__lbl--dial'
		},svg);
		var lblDial_text = document.createTextNode('');
		lblDial.appendChild(lblDial_text);
		//
		var lblDialUnits = createSVGElement('text', {
          x: properties.radius,
          y: properties.radius + properties.radius / 5,
          class: 'dial__lbl dial__lbl--dial--units'
        }, svg);
        var lblDial_units = document.createTextNode(properties.labels.ambientUnits);
        lblDialUnits.appendChild(lblDial_units);
        //
		var lblAway = createSVGElement('text',{
			x: properties.radius,
			y: properties.radius * 1.5,
			class: 'dial__lbl dial__lbl--away'
		},svg);
		var lblAway_text = document.createTextNode('AWAY');
		lblAway.appendChild(lblAway_text);
		//
		var icoLeaf = createSVGElement('path',{
			class: 'dial__ico__leaf'
		},svg);
		
		/*
		 * LEAF
		 */
		var leafScale = properties.radius/5/100;
		var leafDef = ["M", 3, 84, "c", 24, 17, 51, 18, 73, -6, "C", 100, 52, 100, 22, 100, 4, "c", -13, 15, -37, 9, -70, 19, "C", 4, 32, 0, 63, 0, 76, "c", 6, -7, 18, -17, 33, -23, 24, -9, 34, -9, 48, -20, -9, 10, -20, 16, -43, 24, "C", 22, 63, 8, 78, 3, 84, "z"].map(function(x) {
			return isNaN(x) ? x : x*leafScale;
		}).join(' ');
		var translate = [properties.radius-(leafScale*100*0.5),properties.radius*1.5]
		var icoLeaf = createSVGElement('path',{
			class: 'dial__ico__leaf',
			d: leafDef,
			transform: 'translate('+translate[0]+','+translate[1]+')'
		},svg);
			
		/*
		 * RENDER
		 */
		function render() {
			renderAway();
			renderHvacState();
			renderTicks();
			renderCenterTemperature();
			renderDialTemperature();
			renderLeaf();
		}
		render();

		/*
		 * RENDER - ticks
		 */
		function renderTicks() {
			var vMin, vMax;
			if (self.away) {
			    vMin = (options.targetOnCenter ? self.ambient_temperature : self.target_temperature); 
				vMax = vMin;
			} else {
				vMin = Math.min(self.ambient_temperature, self.target_temperature);
				vMax = Math.max(self.ambient_temperature, self.target_temperature);
			}
			var min = restrictToRange(Math.round((vMin-options.minValue)/properties.rangeValue * options.numTicks),0,options.numTicks-1);
			var max = restrictToRange(Math.round((vMax-options.minValue)/properties.rangeValue * options.numTicks),0,options.numTicks-1);
			//
			tickArray.forEach(function(tick,iTick) {
				var isLarge = iTick==min || iTick==max;
				var isActive = iTick >= min && iTick <= max;
				attr(tick,{
					d: pointsToPath(rotatePoints(isLarge ? tickPointsLarge: tickPoints,iTick*theta-properties.offsetDegrees,[properties.radius, properties.radius])),
					class: isActive ? 'active' : ''
				});
			});
		}
	
		/*
		 * RENDER - dial temperature
		 */
		function renderDialTemperature() {
		    var valueToRender = (options.targetOnCenter ? self.ambient_temperature : self.target_temperature);
		    var valueRenderedInCenter = (options.targetOnCenter ? self.target_temperature : self.ambient_temperature);
			lblDial_text.nodeValue = Math.floor(valueToRender);
			if (valueToRender%1!=0) {
				lblDial_text.nodeValue += '⁵';
			}
			var peggedValue = restrictToRange(valueToRender, options.minValue, options.maxValue);
			degs = properties.tickDegrees * (peggedValue-options.minValue)/properties.rangeValue - properties.offsetDegrees;
			if (peggedValue > valueRenderedInCenter) {
				degs += 8;
			} else {
				degs -= 8;
			}
			var pos = rotatePoint(properties.lblDialPosition,degs,[properties.radius, properties.radius]);
			attr(lblDial,{
				x: pos[0],
				y: pos[1]
			});
		}

		/*
		 * RENDER - center temperature
		 */
		function renderCenterTemperature() {
		    
		    var valueToRender = (options.targetOnCenter ? self.target_temperature: self.ambient_temperature);
			lblCenter_text.nodeValue = Math.floor(valueToRender);
			setClass(lblCenterHalf,'shown',true);
		    lblCenterHalf_text.nodeValue = (valueToRender*10)%10;
		}
		
		/*
		 * RENDER - leaf
		 */
		function renderLeaf() {
			setClass(svg,'has-leaf',self.has_leaf);
		}
		
		/*
		 * RENDER - HVAC state
		 */
		function renderHvacState() {
			Array.prototype.slice.call(svg.classList).forEach(function(c) {
				if (c.match(/^dial--state--/)) {
					svg.classList.remove(c);
				};
			});
			svg.classList.add('dial--state--'+self.hvac_state);
		}
		
		/*
		 * RENDER - away
		 */
		function renderAway() {
			svg.classList[self.away ? 'add' : 'remove']('away');
		}
		
		/*
		 * Drag to control
		 */
		var _drag = {
			inProgress: false,
			startPoint: null,
			startTemperature: 0,
			lockAxis: undefined
		};
		
		function eventPosition(ev) {
			if (ev.targetTouches && ev.targetTouches.length) {
				return [ev.targetTouches[0].clientX, ev.targetTouches[0].clientY];
			} else {
				return [ev.x, ev.y];
			};
		}
		
		var startDelay;
		function dragStart(ev) {
			startDelay = setTimeout(function() {
				setClass(svg, 'dial--edit', true);
				_drag.inProgress = true;
				_drag.startPoint = eventPosition(ev);
				_drag.startTemperature = self.target_temperature || options.minValue;
				_drag.lockAxis = undefined;
			},500);
		};
		
		function dragEnd (ev) {
			clearTimeout(startDelay);
			setClass(svg, 'dial--edit', false);
			if (!_drag.inProgress) { // Tap / Toggle Mode (not on mouseleave)
				if (ev.type != "mouseleave" && typeof options.onToggleTargetTemperature == 'function') {
					options.onToggleTargetTemperature();
				};
			} else { // Drag / Set Mode
				_drag.inProgress = false;
				if (self.target_temperature != _drag.startTemperature) {
					if (typeof options.onSetTargetTemperature == 'function') {
						options.onSetTargetTemperature(self.target_temperature);
					};
				};
			};
		};
		
		function dragMove(ev) {
			ev.preventDefault();
			if (!_drag.inProgress) return;
			var evPos = eventPosition(ev);
			var dy = _drag.startPoint[1]-evPos[1];
			var dx = evPos[0] - _drag.startPoint[0];
			var dxy;
			if (_drag.lockAxis == 'x') {
				dxy = dx;
			} else if (_drag.lockAxis == 'y') {
				dxy = dy;
			} else if (Math.abs(dy) > properties.dragLockAxisDistance) {
				_drag.lockAxis = 'y';
				dxy = dy;
			} else if (Math.abs(dx) > properties.dragLockAxisDistance) {
				_drag.lockAxis = 'x';
				dxy = dx;
			} else {
				dxy = (Math.abs(dy) > Math.abs(dx)) ? dy : dx;
			};
			var dValue = (dxy*getSizeRatio())/(options.diameter)*properties.rangeValue;
			self.target_temperature = roundHalf(_drag.startTemperature+dValue);
		}
		
		svg.addEventListener('mousedown',dragStart);
		svg.addEventListener('touchstart',dragStart);
		
		svg.addEventListener('mouseup',dragEnd);
		svg.addEventListener('mouseleave',dragEnd);
		svg.addEventListener('touchend',dragEnd);
		
		svg.addEventListener('mousemove',dragMove);
		svg.addEventListener('touchmove',dragMove);
		//
		
		/*
		 * Helper functions
		 */
		function restrictTargetTemperature(t) {
			return restrictToRange(roundHalf(t),options.minValue,options.maxValue);
		}
		
		function angle(point) {
			var dx = point[0] - properties.radius;
			var dy = point[1] - properties.radius;
			var theta = Math.atan(dx/dy) / (Math.PI/180);
			if (point[0]>=properties.radius && point[1] < properties.radius) {
				theta = 90-theta - 90;
			} else if (point[0]>=properties.radius && point[1] >= properties.radius) {
				theta = 90-theta + 90;
			} else if (point[0]<properties.radius && point[1] >= properties.radius) {
				theta = 90-theta + 90;
			} else if (point[0]<properties.radius && point[1] < properties.radius) {
				theta = 90-theta+270;
			}
			return theta;
		};
		
		function getSizeRatio() {
			return options.diameter / targetElement.clientWidth;
		}
		
	};
})();

/* ==== */
var initializing = true;

(function(scope) {
    var nest = new thermostatDial(document.getElementById(thermostatId),{
    	onSetTargetTemperature: function(v) {
    	    var p = {
    	        "ambient_temperature":nest.ambient_temperature,
    	        "target_temperature":v,
    	        "hvac_state":nest.hvac_state,
    	        "has_leaf": nest.has_leaf,
    	        "away":nest.away
    	    };
    		scope.send({topic: thermostatId, payload: p});
      },
      onToggleTargetTemperature: function() {
          var next = this.toggleValues.indexOf(nest.target_temperature) + 1;
          var v = (next < this.toggleValues.length) ? this.toggleValues[next] : this.toggleValues[0];
          this.onSetTargetTemperature(v);
    	}
    });
    
    scope.$watch('msg', function(data) {
        if (initializing) {
            initializing = false;
            } else {
            nest.ambient_temperature = data.payload.ambient_temperature || 0;
            nest.target_temperature = data.payload.target_temperature || 0;
            nest.hvac_state = data.payload.hvac_state || "off";
            nest.has_leaf = data.payload.has_leaf || false;
            nest.away = data.payload.away || false;
        }
        
    });
})(scope);

</script>

<style>

@import url(http://fonts.googleapis.com/css?family=Open+Sans:300);

#thermostat {
 margin: 0 auto;
 -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}

.dial {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
.dial.away .dial__ico__leaf {
    visibility: hidden;
}
.dial.away .dial__lbl--target {
    visibility: hidden;
}
.dial.away .dial__lbl--target--half {
    visibility: hidden;
}
.dial.away .dial__lbl--away {
    opacity: 1;
}
.dial--edit .dial__lbl--diallabel {
  visibility: hidden;
}
.dial--edit .dial__lbl--centerlabel {
  visibility: visible;
}
.dial .dial__shape {
    -webkit-transition: fill 0.5s;
    transition: fill 0.5s;
}
.dial path.dial__ico__leaf {
    fill: #13EB13;
    opacity: 0;
    -webkit-transition: opacity 0.5s;
    transition: opacity 0.5s;
    pointer-events: none;
}
.dial.has-leaf .dial__ico__leaf {
    display: block;
    opacity: 1;
    pointer-events: initial;
}
.dial__editableIndicator {
    fill-rule: evenodd;
    opacity: 0;
    -webkit-transition: opacity 0.5s;
    transition: opacity 0.5s;
}
.dial--edit path.dial__editableIndicator {
    fill: white;
}
.dial--edit .dial__editableIndicator {
    opacity: 1;
}
.dial--state--off .dial__shape {
    fill: #3d3c3c;
}
.dial--state--heating .dial__shape {
    fill: #E36304;
}
.dial--state--cooling .dial__shape {
    fill: #007AF1;
}
.dial .dial__ticks path {
    fill: rgba(255, 255, 255, 0.3);
}
.dial .dial__ticks path.active {
    fill: rgba(255, 255, 255, 0.8);
}
.dial text {
    fill: white;
    text-anchor: middle;
    font-family: Helvetica, sans-serif;
    alignment-baseline: central;
}
.dial__lbl--center {
    font-size: 120px;
    font-weight: bold;
}
.dial__lbl--centerlabel {
  font-size: 16px;
  font-weight: normal;
  visibility: hidden;
}
.dial__lbl--center--half {
    font-size: 40px;
    font-weight: bold;
    opacity: 0;
    -webkit-transition: opacity 0.1s;
    transition: opacity 0.1s;
}
.dial__lbl--center--half.shown {
    opacity: 1;
    -webkit-transition: opacity 0s;
    transition: opacity 0s;
}
.dial__lbl--dial {
    font-size: 22px;
    font-weight: bold;
}
.dial__lbl--diallabel {
  font-size: 16px;
  font-weight: normal;
}
.dial__lbl--away {
    font-size: 48px;
    font-weight: bold;
    opacity: 0;
    pointer-events: none;
}
#controls {
    font-family: Open Sans;
    background-color: rgba(255, 255, 255, 0.25);
    padding: 20px;
    border-radius: 5px;
    position: absolute;
    left: 50%;
    -webkit-transform: translatex(-50%);
    transform: translatex(-50%);
    margin-top: 20px;
}
#controls label {
    text-align: left;
    display: block;
}
#controls label span {
    display: inline-block;
    width: 200px;
    text-align: right;
    font-size: 0.8em;
    text-transform: uppercase;
}
#controls p {
    margin: 0;
    margin-bottom: 1em;
    padding-bottom: 1em;
    border-bottom: 2px solid #ccc;
}
</style>
