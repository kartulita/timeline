(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineController', timelineController);

	function timelineController($scope, $timeout, $interval, languageService, timelineLocale) {

		$scope.strings = languageService(timelineLocale);

		$scope.model = {
		};

		/* Methods callable by the view */
		$scope.methods = {
			prev: prevScreen,
			next: nextScreen,
			wheel: wheelHandler,
			changeScreen: changeScreen,
			openItem: openItem
		};

		$scope.isCurrent = isCurrent;

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
		var screensPerWheelDelta = 0.2;

		$scope.$on('adapterChanged', function () { resetModel(); });
		$scope.$on('dayLoading', dayLoading);
		$scope.$on('dayLoaded', dayLoaded);
		$scope.$on('endOfDays', endOfDays);

		$scope.$watch('view.datePickerValue', gotoDate);

		return;

		function daysChanged() {
			$scope.$broadcast('daysChanged');
		}

		function currentChanged() {
			$scope.$broadcast('currentChanged');
		}

		function resetModel(day) {
			day = (day ? moment(day) : moment()).local().startOf('day');
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
			/* Notify child scopes of changed */
			daysChanged();
			currentChanged();
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
				setOrigin($scope.view.reference.position().left);
			}, 0);
		}

		/* Periodically check which show is currently playing and update view */
		function updateCurrent() {
			if (!currentInterval) {
				currentInterval = $interval(updateCurrent, 15000);
				$scope.$on('$destroy', function () {
					$interval.cancel(currentInterval);
					currentInterval = null;
				});
			}
			var oldCurrent = $scope.model.current;
			$scope.model.current = $scope.api.getCurrent();
			if (!isCurrent(oldCurrent)) {
				currentChanged();
			}
		}

		/* Fuzzy comparison to see if item is currently showing */
		function isCurrent(item) {
			return sameItemFuzzy(item, $scope.model.current);
		}

		/* Do not depend on reference equality */
		function sameItemFuzzy(a, b) {
			return a === b || (a && b &&
				a.start.unix() === b.start.unix() &&
				a.id == b.id);
		}

		/* Load more data */
		function loadPastDay() {
			if ($scope.model.hitStart) {
				return;
			}
			var days = $scope.model.days;
			days.unshift(days[0].clone().subtract(1, 'day'));
			daysChanged();
		}

		function loadFutureDay() {
			if ($scope.model.hitEnd) {
				return;
			}
			var days = $scope.model.days;
			days.push(days[days.length - 1].clone().add(1, 'day'));
			daysChanged();
		}

		/* Event handler to open an item when tapped/clicked */
		function openItem(item) {
			$scope.onOpenItem({ item: item });
		}

		/* Called when scroll position changed */
		function scrollChanged() {
			var pageWidth = $scope.geometry.pageWidth();
			var viewWidth = $scope.geometry.viewWidth();
			var loadNextThreshold = pageWidth * 1.5;
			var origin = $scope.view.origin;
			var targetOffset = $scope.view.targetOffset;
			var targetPosition = targetOffset + origin;
			var offset = $scope.view.offset;
			var position = offset + origin;
			/* Load more days if needed */
			if ($scope.view.reference && daysLoading === 0) {
				if (targetPosition < loadNextThreshold) {
					loadPastDay();
				}
				if (targetPosition > (viewWidth - loadNextThreshold)) {
					loadFutureDay();
				}
			}
			/* Keep a day title visible */
			$scope.$broadcast('scrollChanged', position, pageWidth);
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
			scrollChanged();
		}

		function prevScreen() {
			changeScreen(-1);
		}

		function nextScreen() {
			changeScreen(+1);
		}

		function wheelHandler(event, delta) {
			changeScreen(-delta * screensPerWheelDelta);
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
			scrollChanged();
		}

		function setOrigin(origin) {
			$scope.view.origin = origin;
			scrollChanged();
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
			/* dx/dt = clamp(Dx * moveRate, minSpeed, maxSpeed), note: moveRate has unit /s */
			var moveRate = 5;
			/* Speed limits (pixels/s) */
			var minSpeed = 100, maxSpeed = 3000;
			/* How close we have to be to the target for scrolling to stop */
			var stopThreshold = 1;
			/* Dynamics */
			var now = new Date().getTime() / 1000;
			var dt = now - $scope.view.previousFrameTime;
			$scope.view.previousFrameTime = now;
			/* Geometry */
			var target = getOffset(false);
			var current = getOffset(true);
			var direction = target === current ? 0 : target > current ? +1 : -1;
			var delta = (target - current) * moveRate;
			/* Enforce minimum speed */
			var absDelta = Math.abs(delta);
			if (absDelta < minSpeed)  {
				delta *= minSpeed / absDelta;
			}
			if (absDelta > maxSpeed) {
				delta *= maxSpeed / absDelta;
			}
			/* Apply change */
			current += dt * delta;
			/* We passed or reached the target */
			var remaining = target - current;
			if (remaining * direction <= 0 || Math.abs(remaining) < stopThreshold) {
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
