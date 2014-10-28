// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

suite('Line', function() {
	var table;
	setup(function() {
		table = document.body.appendChild(document.createElement('table'));
		table.style.position = 'absolute';
		table.style.left = 0;
		table.style.top = 0;
		table.style.borderCollapse = 'collapse';
		
		var tbody = table.appendChild(document.createElement('tbody'));
		
		var rowCount = 4;
		var colCount = 4;
		
		range(rowCount).forEach(function() {
			var row = tbody.appendChild(document.createElement('tr'));
			tbody.appendChild(row);
			
			range(colCount).forEach(function() {
				var cell = document.createElement('td');
				row.appendChild(cell);
				
				cell.style.margin = 0;
				cell.style.padding = 0;
				cell.style.width = '100px';
				cell.style.height = '100px';
			});
		});
		
		function range(max) {
			var list = [];
			for ( var i = 0; i < max; i += 1 ) {
				list.push(i);
			}
			return list;
		}
	});
	
	teardown(function() {
		document.body.removeChild(table);
	});
	
	test('left to right', function() {
		testLine({
			from: {
				row: 0,
				col: 0
			},
			to: {
				row: 0,
				col: 2
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 50
			}
		});
	});
	
	test('right to left', function() {
		testLine({
			from: {
				row: 0,
				col: 2
			},
			to: {
				row: 0,
				col: 0
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 50
			}
		});
	});
	
	test('left to right, top to bottom', function() {
		testLine({
			from: {
				row: 0,
				col: 0
			},
			to: {
				row: 2,
				col: 2
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 250
			}
		});
	});
	
	test('left to right, bottom to top', function() {
		testLine({
			from: {
				row: 0,
				col: 2
			},
			to: {
				row: 2,
				col: 0
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 250
			}
		});
	});
	
	test('right to left, bottom to top', function() {
		testLine({
			from: {
				row: 2,
				col: 2
			},
			to: {
				row: 0,
				col: 0
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 250
			}
		});
	});
	
	test('right to left, top to bottom', function() {
		testLine({
			from: {
				row: 2,
				col: 0
			},
			to: {
				row: 0,
				col: 2
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 250
			}
		});
	});
	
	// This tests checks if the implementation makes assumptions about elements
	// starting at coordinates (0, 0).
	test('not in corner', function() {
		testLine({
			from: {
				row: 1,
				col: 1
			},
			to: {
				row: 1,
				col: 3
			},
			expectations: {
				left: 200,
				right: 300,
				top: 150,
				bottom: 150
			}
		});
	});
	
	test('offset ascendant', function() {
		table.style.position = 'absolute';
		table.style.left = '100px';
		table.style.top = '100px';
		
		testLine({
			from: {
				row: 0,
				col: 0
			},
			to: {
				row: 2,
				col: 2
			},
			expectations: {
				left: 200,
				right: 300,
				top: 150,
				bottom: 350
			}
		});
	});
	
	test('right to left, small to large', function() {
		testLine({
			from: {
				row: 0,
				col: 2,
				size: 50
			},
			to: {
				row: 0,
				col: 0
			},
			expectations: {
				left: 100,
				right: 200,
				top: 50,
				bottom: 50
			}
		});
	});
	
	test('left to right, small to large', function() {
		testLine({
			from: {
				row: 0,
				col: 0,
				size: 50
			},
			to: {
				row: 0,
				col: 2
			},
			expectations: {
				left: 50,
				right: 200,
				top: 50,
				bottom: 50
			}
		});
	});
	
	function testLine(config) {
		// Create a few square boxes with identical sizes and give them colors
		// for debugging purposes.
		var boxes = {
			from: createBox(config.from.row, config.from.col, 'blue', config.from.size),
			to: createBox(config.to.row, config.to.col, 'green', config.to.size)
		};
		
		var line = createLine(boxes.from, boxes.to);
		var lineDimensions = line.element.getBoundingClientRect();
		
		['left', 'right', 'top', 'bottom'].forEach(function(edge) {
			expect(lineDimensions[edge]).to.equal(config.expectations[edge]);
		});
	}
	
	function createBox(row, col, color, size) {
		size = size || 100;
		var box = document.createElement('div');
		box.style.width = size + 'px';
		box.style.height = size + 'px';
		box.style.backgroundColor = color;
		moveBox(box, row, col);
		return box;
	}
	
	function moveBox(box, row, col) {
		var row = table.getElementsByTagName('tr')[row];
		var cell = row.getElementsByTagName('td')[col];
		cell.appendChild(box);
	}
	
	function createLine(from, to) {
		// Create the line and give it a stroke for debugging purposes.
		var line = seastorm.LineBetween(from, to);
		line.element.style.stroke = 'red';
		line.element.style.strokeWidth = '5';
		return line;
	}
	
	test('repositioning', function() {
		var from = createBox(0, 0, 'blue');
		var to = createBox(2, 2, 'green');
		var line = createLine(from, to);
		moveBox(from, 1, 1);
		moveBox(to, 3, 3);
		line.update();
		
		var lineDimensions = line.element.getBoundingClientRect();
		expect(lineDimensions.left).to.equal(200);
		expect(lineDimensions.top).to.equal(150);
		expect(lineDimensions.right).to.equal(300);
		expect(lineDimensions.bottom).to.equal(350);
	});
	
	test('borders', function() {
		// Create a few square boxes with identical sizes and give them colors
		// for debugging purposes.
		var boxes = {
			from: createBox(0, 0, 'blue', 80),
			to: createBox(0, 2, 'green')
		};
		boxes.from.style.border = '10px solid black';
		
		var line = createLine(boxes.from, boxes.to);
		var lineDimensions = line.element.getBoundingClientRect();
		
		expect(lineDimensions.left).to.equal(100);
		expect(lineDimensions.top).to.equal(50);
		expect(lineDimensions.right).to.equal(200);
		expect(lineDimensions.bottom).to.equal(50);
	});
});