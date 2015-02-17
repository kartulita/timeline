(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineItemsController', timelineItemsController);

	/* Must also be configured in the LESS file */
	var rowCount = 2;

	function timelineItemsController($scope, $timeout) {
		var scope = $scope;
		var element;
		var transclude;

		var debouncer;

		this.init = initController;
		return;

		function initController(_element, _transclude) {
			element = _element;
			transclude = _transclude;

			rebuildList();
			scope.$on('currentChanged', debouncedRebuildList);
			scope.$watch('model.current', debouncedRebuildList);
		}

		function debouncedRebuildList() {
			if (debouncer) {
				return;
			} else {
				rebuildList();
				debouncer = true;
				$timeout(function () { debouncer = null; }, 100);
			}
		}

		/* Rebuild the view */
		function rebuildList() {
			var items = scope.items;

			var columnElement;
			var rows;
			var currentIndex = getCurrentIndex();

			element.empty();
			newRow();
			prependPhantoms();
			addItems();
			appendPhantoms();

			return;

			/* Get index of currently playing item (or -1 if none found) */
			function getCurrentIndex() {
				if (!scope.model.current) {
					return -1;
				}
				for (var i = 0; i < items.length; i++) {
					if (scope.isCurrent(items[i])) {
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
				itemScope.item = item;
				transclude(itemScope, function (clone, scope) {
					addToRow(clone);
					if (current) {
						scope.$emit('setCurrentItemElement', clone.find('*[timeline-item]'));
					}
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

})(window.angular);
