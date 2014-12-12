(function (angular, _, moment) {
	'use strict';
	
	angular.module('err.timeline')		
		.directive('timelineItems', timelineItemsDirective)
		;

	function timelineItemsDirective($parse) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			scope: {
				itemsExpr: '@timelineItems',
			},
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, ctrl, transclude) {
			var rowCount = 2;
			var parent = element.parent();
			var navController = parent.controller('timelineNavController');
			/*
			 * Loop over items for this scope.day
			 * Set scope.item
			 * Put ites into columns as needed
			 * Invoke timelineItemDirective
			 * Use CSS for the space handling for now
			 * Note: CSS will not be enough when a phantom is needed.
			 */
			scope.$watch('itemsExpr', rebuildList);

			function parseExpr(expr) {
				var matches = expr.match(itemsParser);
				if (!matches) {
					throw new Error('timeline-items expression is not in the form of "<name> in <collection>": ' + expr);
				}
				return {
					local: matches[1],
					collection: $parse(matches[2])(scope.$parent)
				};
			}

			function rebuildList() {
				var expr = parseExpr(scope.itemsExpr);
				var tuple;
				var rows;
				element.empty();
				newRow();
				_(expr.collection)
					.each(function createItemElement(item) {
						if (rows === 0) {
							tuple = angular.element('<div/>')
								.addClass('timeline-items-column');
							element.append(tuple);
						}
						var itemScope = scope.$parent.$new(false, scope);
						itemScope[expr.local] = item;
						transclude(itemScope, function (clone, scope) {
							tuple.append(clone);
						});
						nextRow();
					});

				while (rows !== 0) {
					addPhantom();
				}

				return;

				function newRow() {
					rows = 0;
				}

				function nextRow() {
					if (++rows >= rowCount) {
						newRow();
					}
				}

				function addPhantom() {
					var item = angular.element('<div class="timeline-item-container phantom"/>');
					tuple.append(item);
					nextRow();
				}
			}
		}
	}

})(window.angular, window._, window.moment);
