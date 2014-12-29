(function (angular, _, moment) {
	'use strict';
	
	angular.module('battlesnake.timeline')		
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

			var matches = attrs.timelineItems.match(itemsParser);
			if (!matches) {
				throw new Error('timeline-items expression is not in the form of "<name> in <collection>"');
			}
			var local = matches[1];
			var source = matches[2];
			scope.$watch('model.current', rebuildList);
			scope.$watch(source, rebuildList);

			scope.isCurrent = function (item) {
				var current = scope.model.current;
				return current && item.id === current.id;
			};

			return;

			function rebuildList() {
				var items = $parse(source)(scope);
				element.empty();

				var tuple;
				var rows;
				newRow();

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
					itemScope[local] = item;
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
