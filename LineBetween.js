// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

// This function draws a line between two HTML elements by inserting an SVG
// element taking up the entire space between the two elements. The element
// itself is placed next to the source element, then shifted using CSS
// positioning to appear between the two elements. At present, it doesn't handle
// resizing. Also note that no styling is given to the line, which means that it
// probably won't be visible without some CSS applied elsewhere.
seastorm.LineBetween = (function() {
	// Keep track of the number of lines created so that each can get a unique
	// ID for its marker.
	var lineCount = 0;
	
	return function(source, target, broken) {
		broken = Boolean(broken); // Non-broken by default.
		
		lineCount += 1;
		
		// Force the parent element to use non-static positioning, so that
		// the SVG element will be positioned relative to it. This could
		// potentially be solved by instead using the existing offset
		// parents, but this is complicated by the fact that `<td>` elements
		// are set as `offsetParent` in the DOM whether they have non-static
		// positioning or not.
		source.style.position = 'relative';
		
		var namespace = 'http://www.w3.org/2000/svg';
		
		var svg = document.createElementNS(namespace, 'svg');
		svg.setAttribute('version', '1.1');
		
		// We need to make sure that the SVG doesn't take up space to begin
		// with, because that might cause scrollbars to appear while the
		// calculations are being done, and then giving the wrong results when
		// scaling the SVG to the proper size (because the scrollbars
		// disappear). This is tricky to test, but it's probably possible.
		svg.style.position = 'absolute';
		svg.style.width = '0';
		svg.style.height = '0';
		
		var line = document.createElementNS(namespace, 'polyline');
		
		// Note that the SVG is added as a sibling of the source element and
		// then positioned into the right place using CSS (above).
		svg.appendChild(line);
		svg.appendChild(createDefs());
		source.appendChild(svg);
		
		update();
		
		return {
			get element() {
				return line;
			},
			update: update
		};
		
		function update() {
			// Set up some tables of dimensions and elements that will be
			// convenient later.
			var dimensions = {
				source: source.getBoundingClientRect(),
				target: target.getBoundingClientRect()
			};
			
			var elements = {
				source: source,
				target: target
			};
			
			// Some duplication here, but making it more abstract will likely
			// make it even more difficult to read.
			elements.left = dimensions.source.left <= dimensions.target.left ? source : target;
			elements.top = dimensions.source.top <= dimensions.target.top ? source : target;
			elements.right = dimensions.source.right >= dimensions.target.right ? source : target;
			elements.bottom = dimensions.source.bottom >= dimensions.target.bottom ? source : target;
			
			['left', 'top', 'right', 'bottom'].forEach(function(edge) {
				dimensions[edge] = elements[edge].getBoundingClientRect();
			});
			
			var viewBox = calculateViewBox();
			var ends = calculateLineEnds();
			
			svg.setAttribute('viewBox', [viewBox.left, viewBox.top, viewBox.width, viewBox.height].join(' '));
			
			positionSvg();
			
			line.setAttribute(
				'points',
				ends.source.x + ',' + ends.source.y + ' ' +
				ends.middle.x + ',' + ends.middle.y + ' ' +
				ends.target.x + ',' + ends.target.y
			);
			line.setAttribute('class', 'arrow');
			
			function calculateViewBox() {
				// SVG images do not seem to scale correctly when sized with
				// CSS, so make sure that the view box has the same dimensions
				// as the SVG element itself. (The size of the SVG element
				// itself is set with CSS.) If there were a way to scale them
				// using just CSS, the SVG itself could simply be a static
				// 100x100 image of a line.
				var viewBox = {
					left: 0,
					top: 0,
					width: dimensions.right.left - dimensions.left.right,
					height: dimensions.bottom.bottom - dimensions.top.top
				};
				return viewBox;
			}
			
			function positionSvg() {
				// Position the SVG by using absolute positioning to place it
				// outside of its parent.
				
				// We need to compensate for borders, since absolute positioning
				// begins inside an element's borders.
				var leftBorder = cssValue(elements.source, 'borderLeftWidth');
				if ( elements.source === elements.left ) {
					svg.style.left = (dimensions.source.width - leftBorder) + 'px';
				} else {
					svg.style.left = -(viewBox.width + leftBorder) + 'px';
				}
				
				var topBorder = cssValue(elements.source, 'borderTopWidth');
				if ( elements.source === elements.top ) {
					svg.style.top = (-topBorder) + 'px';
				}
				else if ( elements.source === elements.bottom ) {
					svg.style.bottom = (-topBorder) + 'px';
				}
				// If the source is neither the topmost or the bottommost
				// element; it's smaller than the target.
				else {
					svg.style.top = dimensions.target.top - dimensions.source.top + 'px';
				}
				
				svg.style.width = viewBox.width + 'px';
				svg.style.height = viewBox.height + 'px';
			}
			
			function calculateLineEnds() {
				// The ends of the line should be right next to their anchor
				// elements horizontally and halfway down their anchor elements
				// vertically. There is some duplication here, but (as above)
				// making it more abstract will likely make it even more
				// difficult to read.
				var ends = {};
				
				ends.source = {
					x: elements.source === elements.left ? 0 : viewBox.width
				};
				
				if ( elements.source === elements.top ) {
					ends.source.y = dimensions.source.height / 2;
				}
				else if ( elements.source === elements.bottom ) {
					ends.source.y = viewBox.height - (dimensions.source.height / 2);
				}
				// If the source is neither the topmost or the bottommost
				// element; it's smaller than the target.
				else {
					ends.source.y = dimensions.target.height / 2;
				}
				
				ends.target = {
					x: elements.target === elements.left ? 0 : viewBox.width,
					y: elements.target === elements.top
						? dimensions.target.height / 2
						: viewBox.height - (dimensions.target.height / 2)
				};
				
				ends.middle = {
					x: (ends.target.x + ends.source.x) / 2,
					y: (ends.target.y + ends.source.y) / 2
				};
				
				return ends;
			}
		}
		
		function createDefs() {
			var arrowheadId = 'arrowhead-' + lineCount;
			var children = [createArrowhead(arrowheadId)];
			line.setAttribute('marker-end', 'url(#' + arrowheadId + ')');
			
			if ( broken ) {
				var crossId = 'cross-' + lineCount;
				children.push(createCross(crossId));
				line.setAttribute('marker-mid', 'url(#' + crossId + ')');
			}
			
			return createSvg(
				{ tag: 'defs', children: children}
			);
		}
		
		function createArrowhead(id) {
			return createSvg({
				tag: 'marker',
				id: id,
				class: 'arrowhead',
				viewBox: '0 0 200 100',
				refX: '125',
				refY: '50',
				markerWidth: '6',
				markerHeight: '6',
				orient: 'auto',
				children: [
					{ tag: 'polyline', points: '50,50 0,0 200,50 0,100' }
				]	
			});
		}
		
		function createCross(id) {
			return createSvg({
				tag: 'marker',
				id: id,
				class: 'cross',
				viewBox: '0 0 100 100',
				refX: '50',
				refY: '50',
				markerWidth: '6',
				markerHeight: '6',
				orient: 'auto',
				children: [
					{ tag: 'line', x1: '0', x2: '100', y1: '0', y2: '100'},
					{ tag: 'line', x1: '0', x2: '100', y1: '100', y2: '0'}
				]	
			});
		}
		
		function cssValue(element, property) {
			return parseFloat(getComputedStyle(element)[property]);
		}
	};
	
	function createSvg(config) {
		var namespace = 'http://www.w3.org/2000/svg';
		
		// If the argument is an already-created element, just return it.
		if ( config.namespaceURI === namespace ) {
			return config;
		}
		
		var element = document.createElementNS(namespace, config.tag);
		
		for ( var property in config ) {
			if ( property !== 'tag' && property !== 'children' ) {
				element.setAttribute(property, config[property]);
			}
		}
		
		if ( config.children ) {
			var children = config.children.map(createSvg);
			children.forEach(function(child) {
				element.appendChild(child);
			});
		}
		
		return element;
	}
})();