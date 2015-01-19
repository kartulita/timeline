(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineController', timelineController);

	function timelineController($scope, $timeout, $interval) {

		$scope.model = {
		};

		/* Methods callable by the view */
		$scope.methods = {
			prev: prevScreen,
			next: nextScreen,
			wheel: wheelHandler,
			changeScreen: changeScreen,
			openItem: openItem,
			revalidateView: revalidateView
		};

		/* View variables (TODO: Move scrollbox logic to separate directive) */
		$scope.view = {
			/* X-coordinate of first item (the reference position for scrolling) */
			origin: 0,
			/* Current scroll offset (relative to reference item) */
			offset: 0,
			/* Target scroll offset (offset animates towards this value) */
			targetOffset: 0,
			/* Timer used for animating offset */
			scrollTimer: null,
			/* Reference element */
			reference: null,
			/* Is the date picker open? */
			isDatePickerOpen: false,
			/* Is the date picker opening */
			isDatePickerOpening: false,
			/* Date shown in date picker */
			datePickerValue: null,
			/* Shows/hides the date picker */
			openDatePicker: null,
			closeDatePicker: null,
			/* Timer to show date picker after text box has expanded into view */
			openDatePickerTimer: null
		};

		/* Functions set by the directive, which get geometry from the view */
		$scope.geometry = {
			/* Width of visible area */
			pageWidth: null,
			/* Width of entire timeline view (including hidden items) */
			viewWidth: null
		};

		var daysLoading = 0;
		var currentInterval;

		$scope.$on('adapterChanged', function () { resetModel(); });
		$scope.$on('dayLoading', dayLoading);
		$scope.$on('dayLoaded', dayLoaded);
		$scope.$on('endOfDays', endOfDays);

		$scope.$watch('view.datePickerValue', gotoDate);

		return;

		function resetModel(day) {
			day = day ? moment(day) : moment().local().startOf('day');
			/* Store reference date */
			$scope.model.refDate = day;
			/* Array of dates of days to display */
			$scope.model.days = [day];
			/* Currently active item */
			$scope.model.current = null;
			/* Have we hit the start or end of the series? */
			$scope.model.hitStart = false;
			$scope.model.hitEnd = false;
			/* Notify children */
			$scope.$broadcast('modelReset');
			/* Re-zero the view */
			resetView();
		}

		function gotoDate(value) {
			if ($scope.model.refDate && !$scope.model.refDate.isSame(value, 'day')) {
				resetModel(value);
			}
		}

		function endOfDays(event, end) {
			if (end < 0) {
				$scope.model.hitStart = true;
			} else if (end > 0) {
				$scope.model.hitEnd = true;
			}
		}

		function dayLoading(event) {
			daysLoading++;
		}
		
		function dayLoaded(event, element) {
			daysLoading--;
			if (!$scope.view.reference) {
				$scope.view.reference = element;
			}
			updateCurrent();
			$timeout(function updateOrigin() {
				$scope.view.origin = $scope.view.reference.position().left;
				revalidateView();
			}, 0);
		}

		/* Periodically check which show is currently playing and update view */
		function updateCurrent() {
			if (!currentInterval) {
				currentInterval = $interval(updateCurrent, 60000);
				$scope.$on('$destroy', function () {
					$interval.cancel(currentInterval);
					currentInterval = null;
				});
			}
			$scope.model.current = $scope.api.getCurrent();
		}

		/* Load more data */
		function loadPastDay() {
			if ($scope.model.hitStart) {
				return;
			}
			var days = $scope.model.days;
			days.unshift(days[0].clone().subtract(1, 'day'));
		}

		function loadFutureDay() {
			if ($scope.model.hitEnd) {
				return;
			}
			var days = $scope.model.days;
			days.push(days[days.length - 1].clone().add(1, 'day'));
		}

		/* Event handler to open an item when tapped/clicked */
		function openItem(item) {
			$scope.onOpenItem({ item: item });
		}

		/* Load more data if needed (TODO: Bind to separate directive) */
		function revalidateView() {
			var pageWidth = $scope.geometry.pageWidth();
			var viewWidth = $scope.geometry.viewWidth();
			var loadNextThreshold = pageWidth * 1.5;
			var offset = $scope.view.targetOffset;
			var origin = $scope.view.origin;
			var position = offset + origin;
			if ($scope.view.reference && daysLoading === 0) {
				if (position < loadNextThreshold) {
					loadPastDay();
				}
				if (position > (viewWidth - loadNextThreshold)) {
					loadFutureDay();
				}
			}
		}

		/* Scroll event handlers and logic (TODO: Move to separate directive) */
		function resetView() {
			stopAnimation();
			$scope.view.origin = 0;
			$scope.view.offset = 0;
			$scope.view.targetOffset = 0;
			$scope.view.reference = null;
			/* Set date in date picker */
			$scope.view.isDatePickerOpen = false;
			$scope.view.isDatePickerOpening = false;
			$scope.view.datePickerValue = $scope.model.refDate.toDate();
			$timeout.cancel($scope.view.openDatePickerTimer);
		}

		function prevScreen() {
			changeScreen(-1);
		}

		function nextScreen() {
			changeScreen(+1);
		}

		function wheelHandler(event, delta) {
			changeScreen(-delta / 2);
			event.stopPropagation();
			event.preventDefault();
		}

		function getOffset(actual) {
			return actual ? $scope.view.offset : $scope.view.targetOffset;
		}

		function setOffset(offset, immediate) {
			offset = Math.round(offset);
			if (immediate) {
				$scope.view.offset = offset;
			} else {
				$scope.view.targetOffset = offset;
				startAnimation();
			}
			revalidateView();
		}

		function startAnimation() {
			if (!$scope.view.scrollTimer) {
				$scope.view.scrollTimer = $interval(animateScroll, 10);
				$scope.view.previousFrameTime = new Date().getTime() / 1000;
			}
		}

		function stopAnimation() {
			if ($scope.view.scrollTimer) {
				$interval.cancel($scope.view.scrollTimer);
				$scope.view.scrollTimer = null;
			}
		}

		function animateScroll() {
			var speed = 5;
			var now = new Date().getTime() / 1000;
			var dt = now - $scope.view.previousFrameTime;
			$scope.view.previousFrameTime = now;
			var target = getOffset(false);
			var current = getOffset(true);
			var direction = target === current ? 0 : target > current ? +1 : -1;
			var delta = (target - current) * speed;
			/* Fixes anti-aliasing issues and prevents "sluggish" appearance */
			delta = delta < 0 ? Math.floor(delta) : Math.ceil(delta);
			current += dt * delta;
			/* Crossed or reached target */
			if ((target - current) * direction <= 0) {
				current = target;
				stopAnimation();
			}
			setOffset(current, true);
		}

		function changeScreen(delta) {
			var pageWidth = $scope.geometry.pageWidth();
			var viewWidth = $scope.geometry.viewWidth();
			var scrollQuantum = pageWidth * 2 / 3;
			var offset = getOffset();
			offset += delta * scrollQuantum;
			var origin = $scope.view.origin;;
			var min = -origin, max = viewWidth - pageWidth - origin;
			/* Bounds checking */
			if (offset > max) {
				offset = max;
				loadFutureDay();
			}
			if (offset < min) {
				offset = min;
				loadPastDay();
			}
			setOffset(offset);
		}
	}

})(window.angular, window._, window.moment);
