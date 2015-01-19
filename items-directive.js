(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineItems', timelineItemsDirective);

	function timelineItemsDirective($parse) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			priority: 10,
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			/* The CSS currently does not support more than two items per row */
			var rowCount = attrs.itemsPerRow || 2;

			var matches = attrs.timelineItems.match(itemsParser);
			if (!matches) {
				throw new Error('timeline-items expression is not in the form of "<name> in <collection>"');
			}
			var local = matches[1];
			var source = matches[2];
			if (attrs.current) {
				//scope.$watch(attrs.current, rebuildList);
			}
			//scope.$watch(source, rebuildList);
			rebuildList();
			scope.isCurrent = isCurrent;

			return;

			function isCurrent(item) {
				return sameItemFuzzy(item, scope.model.current);
			}

			/* Do not depend on reference equality */
			function sameItemFuzzy(a, b) {
				return a === b || (a && b &&
					a.start.unix() === b.start.unix() &&
					a.id == b.id);
			}

			/* Rebuild the view */
			function rebuildList() {
				var items = $parse(source)(scope);

				var columnElement;
				var rows;
				var currentIndex = getCurrentIndex();

				element.empty();
				newRow();
				prependPhantoms();
				addItems();
				appendPhantoms(); /* Not strictly necessary */

				return;

				/* Get index of currently playing item (or -1 if none found) */
				function getCurrentIndex() {
					if (!scope.model.current) {
						return -1;
					}
					for (var i = 0; i < items.length; i++) {
						if (isCurrent(items[i])) {
							return i;
						}
					}
					return -1;
				}

				/*
				 * Prepend a phantom if currently-active item is not a first-row
				 * item, so we don't have gaps next to the currently-active item
				 */
				function prependPhantoms() {
					var phantoms = currentIndex === -1 ? 0 : currentIndex % rowCount;
					while (phantoms--) {
						addPhantom();
					}
				}

				/* Add items */
				function addItems() {
					for (var i = 0; i < items.length; i++) {
						addItem(items[i], i === currentIndex);
					}
				}

				/* Fill last row with phantoms */
				function appendPhantoms() {
					while (rows !== 0) {
						addPhantom();
					}
				}

				/* Low-level: start new column */
				function newRow() {
					rows = 0;
				}

				/* Low-level: Move to next row, wrap if needed */
				function nextRow() {
					if (++rows >= rowCount) {
						newRow();
					}
				}

				/* Low-level: add to row, create new column element if needed */
				function addToRow(item) {
					if (rows === 0) {
						columnElement = angular.element('<div/>')
							.addClass('timeline-items-column');
						element.append(columnElement);
					}
					columnElement.append(item);
					nextRow();
				}

				/* Low-level: add item */
				function addItem(item) {
					var current = item === scope.model.current;
					if (current) {
						newRow();
					}
					var itemScope = scope.$new();
					itemScope[local] = item;
					transclude(itemScope, function (clone, scope) {
						addToRow(clone);
					});
					if (current) {
						newRow();
					}
				}

				/* Low-level: add phantom */
				function addPhantom() {
					var item = angular.element('<div class="timeline-item-container phantom"/>');
					addToRow(item);
				}
			}
		}
	}

})(window.angular);
