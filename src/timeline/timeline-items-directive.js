(function (angular, _, moment) {
	'use strict';
	
	angular.module('err.timeline')		
		.directive('timelineItems', timelineItemsDirective);

	function timelineItemsDirective($parse) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, ctrl, transclude) {
			var rowCount = 2;
			var parent = element.parent();
			var navController = parent.controller('timelineWidgetController');

			attrs.$observe('timelineItems', rebuildList);
			scope.$watch('model.currentId', rebuildList);

			return;

			function parseExpr(expr) {
				var matches = expr.match(itemsParser);
				if (!matches) {
					throw new Error('timeline-items expression is not in the form of "<name> in <collection>": ' + expr);
				}
				return {
					local: matches[1],
					collection: $parse(matches[2])(scope)
				};
			}

			function rebuildList() {
				var expr = parseExpr(attrs.timelineItems);
				var tuple;
				var rows;
				element.empty();
				newRow();

				var items = expr.collection;

				var currentIndex = -1;

				var i;

				/* Get index of currently active item */
				for (var i = 0; i < items.length; i++) {
					if (items[i].id === scope.model.currentId) {
						currentIndex = i;
						break;
					}
				}

				/*
				 * Prepend a phantom if currently-active item is a second-row
				 * item, so we don't have gaps next to the currently-active item
				 */
				if (currentIndex !== -1 && currentIndex & 1) {
					addPhantom();
				}

				/* Add items */
				for (var i = 0; i < items.length; i++) {
					addItem(items[i], i === currentIndex);
				}

				while (rows !== 0) {
					addPhantom();
				}

				return;

				function startRow() {
				}

				function newRow() {
					rows = 0;
				}

				function nextRow() {
					if (++rows >= rowCount) {
						newRow();
					}
				}

				function addToRow(item) {
					if (rows === 0) {
						tuple = angular.element('<div/>')
							.addClass('timeline-items-column');
						element.append(tuple);
					}
					tuple.append(item);
					nextRow();
				}

				function addItem(item, isCurrent) {
					if (isCurrent) {
						newRow();
					}
					var itemScope = scope.$new();
					itemScope[expr.local] = item;
					transclude(itemScope, function (clone, scope) {
						addToRow(clone);
					});
					if (isCurrent) {
						newRow();
					}
				}

				function addPhantom() {
					var item = angular.element('<div class="timeline-item-container phantom"/>');
					addToRow(item);
				}
			}
		}
	}

})(window.angular, window._, window.moment);
