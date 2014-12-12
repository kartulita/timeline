(function (angular, _, moment) {
	'use strict';
	
	angular.module('err.timeline')
		.controller('timelineController', timelineController);

	function timelineController($scope, $timeout, $interval, showsService) {

		var today = moment().local().startOf('day');

		var api = showsService($scope.source);

		/* View-model */
		$scope.model = {
			/* Array of dates of days to display */
			days: [today],
			/* Currently active item */
			current: api.getCurrent()
		};

		/* View variables */
		$scope.view = {
			/* X-coordinate of TODAY item (the reference frame for scrolling) */
			origin: 0,
			/* Current scroll offset (relative to TODAY item) */
			offset: 0,
			/* Target scroll offset (offset animates towards this value) */
			targetOffset: 0,
			/* Timer used for animating offset */
			scrollTimer: null,
			/* Reference element */
			reference: null
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

		/* Functions set by the directive, which get geometry from the view */
		$scope.geometry = {
			/* Width of visible area */
			pageWidth: null,
			/* Width of entire timeline view (including hidden items) */
			viewWidth: null
		};

		var daysLoading = 0;

		$scope.$on('loading', function (event) {
			daysLoading++;
		});
		$scope.$on('loaded', function (event, element) {
			daysLoading--;
			if (!$scope.view.reference) {
				$scope.view.reference = element;
			}
			$timeout(function () {
				$scope.view.origin = $scope.view.reference ?
					$scope.view.reference.position().left : 0;
				revalidateView();
			}, 0);
		});

		return;

		function getDayTitle(date) {
			return date.local().format('dddd DD.MM');
		}

		function prevScreen() {
			changeScreen(-1);
		}

		function nextScreen() {
			changeScreen(+1);
		}

		function wheelHandler(delta) {
			changeScreen(-delta / 2);
		}

		function revalidateView() {
			var pageWidth = $scope.geometry.pageWidth();
			var viewWidth = $scope.geometry.viewWidth();
			var loadNextThreshold = pageWidth * 2;
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

		function getOffset(actual) {
			return actual ? $scope.view.offset : $scope.view.targetOffset;
		}

		function setOffset(offset, immediate) {
			if (immediate) {
				$scope.view.offset = offset;
			} else {
				$scope.view.targetOffset = offset;
				startAnimation();
			}
			revalidateView();
		}

		function loadPastDay() {
			var days = $scope.model.days;
			days.unshift(days[0].clone().subtract(1, 'day'));
		}

		function loadFutureDay() {
			var days = $scope.model.days;
			days.push(days[days.length - 1].clone().add(1, 'day'));
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
			current += delta * dt;
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

		function openItem(item) {
		}
	}

})(window.angular, window._, window.moment);
