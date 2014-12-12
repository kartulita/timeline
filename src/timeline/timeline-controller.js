(function (angular, _, moment) {
	'use strict';
	
	angular.module('err.timeline')
		.controller('timelineWidgetController', timelineWidgetController);

	function timelineWidgetController($scope, $interval, showsService) {

		/* View-model */
		$scope.model = {
			days: [],
			current: null
		};

		/* View variables */
		$scope.view = {
			offset: 0,
			targetOffset: 0,
			scrollTimer: null
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

		init();

		return;

		function init() {
			showsService.getDay(NaN)
				.then(transformShowsData);
				
			$scope.model.currentId = showsService.getCurrent().id;

			return;

			function transformShowsData(shows) {
				/* Assumes data is in ascending order by start time */
				$scope.model.days = _(shows).chain()
					.groupBy(function getDay(item) {
						return moment(item.start).local().startOf('day').toDate().getTime();
					})
					.pairs()
					.map(function mapDays(pair) {
						return {
							start: moment(Number(pair[0])),
							items: pair[1]
						};
					})
					.value();
			}
		}

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
			changeScreen(-delta);
		}

		function revalidateView() {
			changeScreen(0);
		}

		function getOffset(actual) {
			return actual ? $scope.view.offset : $scope.view.targetOffset;
		}

		function setOffset(offset, immediate) {
			if (immediate) {
				$scope.view.offset = $scope.view.targetOffset = offset;
			} else {
				$scope.view.targetOffset = offset;
				startAnimation();
			}
		}

		function startAnimation() {
			if (!$scope.view.scrollTimer) {
				$scope.view.scrollTimer = $interval(animateScroll, 10);
				$scope.view.lastFrame = new Date().getTime() / 1000;
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
			var dt = now - $scope.view.lastFrame;
			$scope.view.lastFrame = now;
			var target = getOffset(false);
			var current = getOffset(true);
			var direction = target === current ? 0 : target > current ? +1 : -1;
			var delta = (target - current) * speed;
			current += delta * dt;
			if ((target - current) * direction <= 0) {
				current = target;
				stopAnimation();
			}
			$scope.view.offset = current;
		}

		function changeScreen(delta) {
			var pageWidth = $scope.geometry.pageWidth();
			var viewWidth = $scope.geometry.viewWidth();
			var scrollQuantum = pageWidth * 2 / 3;
			var offset = getOffset();
			offset += delta * scrollQuantum;
			var min = 0, max = viewWidth - pageWidth;
			if (offset > max) {
				offset = max;
			} 
			if (offset < min) {
				offset = min;
			}
			setOffset(offset);
		}

		function openItem(item) {
		}
	}

})(window.angular, window._, window.moment);
