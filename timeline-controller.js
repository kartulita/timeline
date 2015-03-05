(function (angular, moment, requestAnimationFrame) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineController', timelineController)
		;

	function seconds() {
		return new Date().getTime() / 1000;
	}

	function timelineController($scope, $timeout, $interval, $window, $swipe, languageService, timelineLocale, timelineService) {
		var scope = $scope;

		/* l10n */
		scope.strings = languageService(timelineLocale);

		/* This object is used by child directives */
		scope.model = {
			current: null,
			currentItemElement: null
		};

		/* High-level methods for manipulating the view state */
		scope.methods = {
			/* Simple navigation */
			prev: prevScreen,
			next: nextScreen,
			changeScreen: changeScreen,
			/* Mousewheel */
			wheel: wheelHandler,
			/* Precise movement */
			scrollBy: scrollBy,
			scrollTo: scrollTo,
			/* User activated a timeline-item */
			openItem: openItem
		};

		/* Helper function to detect if a timeline-item is currently airing */
		scope.isCurrent = isCurrent;

		/* View variables which serve no purpose outside this directive */
		/* (TODO: Move scrollbox logic to separate directive) */
		scope.view = {
			/* Animator for scroll position */
			position: new TimelineAnimator(scrollChanged, scrollEvent),
			/* X-coordinate of first item (the reference position for scrolling) */
			origin: 0,
			/* Reference element */
			reference: null,
			/* Main container for timeline */
			mainContainer: null,
			/* Element to scroll */
			scrollContainer: null,
			/* Date picker */
			datePicker: {
				reset: resetDatePicker,
				isOpen: false,
				value: null,
				select: datePickerSelect,
				toggle: toggleDatePicker
			},
			/* Touch events */
			touch: {
				start: touchStart,
				move: touchMove,
				end: touchEnd,
				cancel: touchCancel,
				memo: null
			}
		};

		/* Number of days still loading */
		var daysLoading = 0;
		/* How far to scroll on wheel notch */
		var screensPerWheelDelta = 0.2;
		/* Used for "currently playing" checker */
		var currentInterval;
		/* Has the user navigated the timeline at all */
		var userHasNavigated = false;

		this.init = initController;
		return;

		/* Initialiser */

		function initController(element) {
			scope.initController = null;
			scope.view.mainContainer = element;
			scope.view.scrollContainer = scope.view.mainContainer.find('.timeline-days');
			scope.$watch('adapter', adapterChanged);
			/* Touch events */
			$swipe.bind(scope.view.mainContainer, scope.view.touch, ['touch']);
			/* Scope observers */
			scope.$on('adapterChanged', function () { resetModel(); });
			scope.$on('dayLoading', dayLoading);
			scope.$on('dayLoaded', dayLoaded);
			scope.$on('endOfDays', endOfDays);
			scope.$on('setCurrentItemElement', setCurrentItemElement);
			/* Validate and load new items (if needed) on resize */
			angular.element($window)
				.bind('resize', scope.methods.revalidateView);
			userHasNavigated = false;
		}

		/* Adapter */
		function adapterChanged() {
			if (scope.adapter) {
				scope.api = timelineService.connect(scope.adapter);
			} else {
				scope.api = null;
			}
			scope.$broadcast('adapterChanged');
		}

		/* Geometry */

		function getPageWidth() {
			return scope.view.mainContainer.innerWidth();
		}

		function getViewWidth() {
			return scope.view.scrollContainer.outerWidth(true);
		}

		/* Model */

		function resetModel(day) {
			day = (day ? day : moment()).local().startOf('day');
			/* Store reference date */
			scope.model.refDate = day;
			/* Array of dates of days to display */
			scope.model.days = [day];
			/* Currently active item */
			scope.model.current = null;
			/* Have we hit the start or end of the series? */
			scope.model.hitStart = false;
			scope.model.hitEnd = false;
			/* Notify children */
			scope.$broadcast('modelReset');
			/* Re-zero the view */
			resetView();
			/* Notify child scopes of changed */
			daysChanged();
			currentChanged();
		}

		function gotoDate(value) {
			if (!value) {
				return;
			}
			/* if (scope.model.refDate && !scope.model.refDate.isSame(value, 'day')) { */
			resetModel(moment(value));
			/* } */
			userHasNavigated = true;
		}

		function dayLoading(event) {
			daysLoading++;
		}
		
		function dayLoaded(event, element) {
			daysLoading--;
			/* Set day as reference if none has been acquired yet */
			if (!scope.view.reference) {
				scope.view.reference = element;
			}
			/* Update currently-airing */
			updateCurrent();
			/* Delayed until reflow */
			$timeout(updateOrigin, 0);
		}

		function updateOrigin() {
			/* Set/update origin x-coordinate */
			setOrigin(scope.view.reference.position().left);
			/* Validation triggers updating of day-title positions */
			scope.view.position.revalidate();
		}

		/* Periodically check which show is currently playing and update view */
		function updateCurrent() {
			if (!currentInterval) {
				currentInterval = $interval(updateCurrent, 15000);
				scope.$on('$destroy', function () {
					$interval.cancel(currentInterval);
					currentInterval = null;
				});
			}
			var oldCurrent = scope.model.current;
			scope.model.current = scope.api.getCurrent();
			scope.model.currentItemElement = null;
			if (!isCurrent(oldCurrent)) {
				currentChanged();
			}
		}

		/* Fuzzy comparison to see if item is currently showing */
		function isCurrent(item) {
			return sameItemFuzzy(item, scope.model.current);
		}

		/* Do not depend on reference equality */
		function sameItemFuzzy(a, b) {
			return a === b || (a && b &&
				a.start.unix() === b.start.unix() &&
				a.id == b.id);
		}

		function scrollToCurrentItem(immediate) {
			var el = scope.model.currentItemElement;
			if (userHasNavigated || !el) {
				return;
			}
			var pageWidth = getPageWidth();
			var el_x = el.offset().left - scope.view.scrollContainer.offset().left;
			var scroll_dx = el_x + (el.outerWidth() - pageWidth) / 2;
			scrollTo(scroll_dx, immediate);
		}

		/* Observers */

		function daysChanged() {
			scope.$broadcast('daysChanged');
		}

		function currentChanged() {
			scope.$broadcast('currentChanged');
		}

		function endOfDays(event, end) {
			if (end < 0) {
				scope.model.hitStart = true;
			} else if (end > 0) {
				scope.model.hitEnd = true;
			}
		}

		function setCurrentItemElement(event, element) {
			var isInitial = !scope.model.currentItemElement;
			/* Let reflow happen first */
			$timeout(function () { scrollToCurrentItem(isInitial); }, 0);
			scope.model.currentItemElement = element;
		}

		/* Load more data */

		function loadPastDay() {
			if (scope.model.hitStart) {
				return;
			}
			var days = scope.model.days;
			days.unshift(days[0].clone().subtract(1, 'day'));
			daysChanged();
		}

		function loadFutureDay() {
			if (scope.model.hitEnd) {
				return;
			}
			var days = scope.model.days;
			days.push(days[days.length - 1].clone().add(1, 'day'));
			daysChanged();
		}

		/* Event handler to open an item when tapped/clicked */
		function openItem(item) {
			scope.onOpenItem({ item: item });
		}

		/* Date picker */

		function datePickerSelect() {
			gotoDate(scope.view.datePicker.value);
		}

		function resetDatePicker() {
			scope.view.datePicker.isOpen = false;
			scope.view.datePicker.value = moment();
			$timeout.cancel(scope.view.datePicker.timer);
		}

		function toggleDatePicker() {
			var dp = scope.view.datePicker;
			if (dp.isOpen) {
				dp.isOpen = false;
			} else {
				/* Should we set the value here? (note: there is a watcher on the value */
				dp.isOpen = true;
			}
		}

		/* Called by the animator: updates view and triggers loading of more days if needed */

		function scrollChanged(current, target) {
			if (!arguments.length) {
				if (!scope.view.position.value) {
					scrollToCurrentItem(true);
					return;
				}
				current = scope.view.position.value.current || 0;
				target = scope.view.position.value.target || 0;
			}
			var pageWidth = getPageWidth();
			var viewWidth = getViewWidth();
			var origin = scope.view.origin;
			/* Bounds checking */
			var min = -origin, max = viewWidth - pageWidth - origin;
			if (target > max) {
				target = max;
			}
			if (target < min) {
				target = min;
			}
			var origin = scope.view.origin;
			var position = {
				current: current + origin,
				target: target + origin
			};
			/* Load more days if needed */
			var loadNextThreshold = pageWidth * 2;
			if (scope.view.reference && daysLoading < 2) {
				/* Force $apply for these */
				$timeout(function () {
					if (position.target < loadNextThreshold) {
						loadPastDay();
					}
					if (position.target > (viewWidth - loadNextThreshold)) {
						loadFutureDay();
					}
				}, 0);
			}
			/* Store position */
			scope.view.position.value = position;
			/*
			 * No longer done via ng-style as it doesn't seem to get updated
			 * during touch events, and as we're also running the animator
			 * outside angular-land now to avoid excessive digests.
			 */
			scope.view.scrollContainer.css({ 
				transform: 'translateX(' + (-position.current) + 'px)',
			});
			/* Notify children ('day': keep a day title visible)
			 * Disabled as we moved this logic into this controller, see
			 * keepAtLeastOneDayTitleInView
			 */
			//scope.$broadcast('scrollChanged', position.current, pageWidth);
			keepAtLeastOneDayTitleInView();
			/* Return valid */
			return target;
		}

		/*
		 * Used to be in day-controller, cound to scrollChanged broadcast, but
		 * this required $apply to work, wrecking animation performance.
		 */
		function keepAtLeastOneDayTitleInView() {
			var offset = scope.view.position.value.current;
			var width = getPageWidth();
			var days = scope.view.mainContainer.find('.timeline-day');
			days.each(function () {
				positionTitle(angular.element(this), offset, width);
			});
			return;

			/* Ripped out of day-controller */
			function positionTitle(element, offset, width) {
				var e_l = element.position().left - offset;
				var e_w = element.innerWidth();
				var e_r = e_l + e_w;
				var title = element.find('.timeline-day-title');
				var t_w = title.find('>*').outerWidth(true);
				if (e_l <= 0 && e_r >= t_w) {
					title.css({ left: -e_l + 'px' });
				} else if (e_l < 0 && e_r > 0) {
					title.css({ left: e_w - t_w + 'px' });
				} else if (e_l > 0) {
					title.css({ left: 0 });
				} else {
					title.css({ left: e_w - t_w + 'px' });
				}
			}
		}

		function scrollEvent(event) {
			/* Run outside angular-land */
		}

		/* High-level scroll methods */

		function resetView() {
			scope.view.origin = 0;
			scope.view.reference = null;
			scope.view.position.reset();
			scope.view.datePicker.reset();
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

		function setOrigin(origin) {
			scope.view.origin = origin;
			keepAtLeastOneDayTitleInView();
			//setTimeout(scrollChanged, 0);
		}

		/* Touch events */

		function touchStart(r) {
			scope.view.touch.memo = {
				start: {
					x: r.x,
					time: seconds()
				},
				last: {
					x: r.x
				}
			};
		}

		function touchMove(r) {
			if (!scope.view.touch.memo) {
				return;
			}
			var dx = scope.view.touch.memo.last.x - r.x;
			scope.view.touch.memo.last = {
				x: r.x
			};
			scope.methods.scrollBy(dx, true);
			userHasNavigated = true;
		}

		function touchEnd(r) {
			touchStop(r, false);
		}

		function touchCancel(r) {
			touchStop(r, true);
		}

		function touchStop(r, cancel) {
			if (!scope.view.touch.memo) {
				return;
			}
			if (!cancel) {
				/* Swipe detection */
				var dx = -(r.x - scope.view.touch.memo.start.x);
				var dt = seconds() - scope.view.touch.memo.start.time;
				var ax = Math.abs(dx);
				var v = ax / dt;
				/* Distance+velocity threshold and time limit for swipe */
				if (dt > 0 && dt < 0.3 && v > 1100 && ax > 50) {
					$timeout(function () {
						scope.methods.changeScreen(dx / ax);
					}, 30);
				} else if (ax > 0) {
					touchMove(r);
				}
			}
			scope.view.touch.memo = null;
		}

		/* Scroll by arbitrary blocks (positive direction = right) */
		function changeScreen(blocks) {
			var pageWidth = getPageWidth();
			var scrollQuantum = pageWidth * 2 / 3;
			scope.view.position.inc(blocks * scrollQuantum, false);
			userHasNavigated = true;
		}

		/* Scroll by pixels (positive direction = right) */
		function scrollBy(delta, immediate) {
			scope.view.position.inc(delta, immediate);
		}

		/* Scroll to the specified offset target */
		function scrollTo(target, immediate) {
			scope.view.position.set(target, immediate);
		}

	}

	/* TODO: Spin out into separate service/module or replace with ngAnimate */
	function TimelineAnimator(onValidate, onEvent) {
		var current = 0;
		var target = 0;
		var animating = false;
		var t_last = 0;
		var t_start, t_start_perf;

		return {
			reset: reset,
			get: get,
			set: set,
			inc: inc,
			revalidate: revalidate
		};

		function reset() {
			set(0, true);
		}

		function get(immediate) {
			return immediate ? current : target;
		}

		function set(value, immediate) {
			value = Math.round(value);
			if (immediate === 'animating') {
				current = value;
				startAnimation();
			} else if (immediate) {
				current = value;
				target = value;
				stopAnimation();
			} else {
				target = value;
				startAnimation();
			}
			revalidate();
			onEvent('changed', current, target);
		}

		function revalidate() {
			var val = onValidate(current, target);
			if (typeof val === 'number' && target !== val) {
				target = val;
				startAnimation();
			}
		}

		function inc(delta, immediate) {
			set(get(immediate) + delta, immediate);
		}

		function requestFrame() {
			if (requestAnimationFrame) {
				requestAnimationFrame(function (t_abs) {
					var t = t_abs - t_start_perf;
					var dt = t - t_last;
					t_last = t;
					animateFrame(dt / 1000);
				});
			} else {
				setTimeout(function () {
					var t_abs = new Date().getTime();
					var t = t_abs - t_start;
					var dt = t - t_last;
					t_last = t;
					animateFrame(dt / 1000);
				}, 1000/60);
			}
		}

		function startAnimation() {
			if (!animating) {
				animating = true;
				onEvent('start');
				t_start = new Date().getTime();
				t_start_perf = window.performance && window.performance.now();
				t_last = 0;
				requestFrame();
			}
		}

		function stopAnimation() {
			if (animating) {
				animating = false;
				onEvent('stop');
			}
		}

		function animateFrame(dt) {
			if (!animating) {
				return;
			}
			/* dx/dt = clamp(Dx * moveRate, minSpeed, maxSpeed), note: moveRate has unit /s */
			var moveRate = 5;
			/* Speed limits (pixels/s) */
			var minSpeed = 100, maxSpeed = 3000;
			/* How close we have to be to the target for scrolling to stop */
			var stopThreshold = 1;
			/* Geometry */
			var direction = target === current ? 0 : target > current ? +1 : -1;
			var delta = (target - current) * moveRate;
			/* Enforce minimum speed */
			var absDelta = Math.abs(delta);
			if (absDelta === 0) {
				stopAnimation();
				return;
			}
			if (absDelta < minSpeed)  {
				delta *= minSpeed / absDelta;
			}
			if (absDelta > maxSpeed) {
				delta *= maxSpeed / absDelta;
			}
			/* Apply change */
			var next = current + dt * delta;
			/* We passed or reached the target */
			var remaining = target - next;
			if (remaining * direction <= 0 || Math.abs(remaining) < stopThreshold) {
				set(target, true);
			} else {
				set(next, 'animating');
				requestFrame();
			}
		}
	}

})(window.angular, window.moment, window.requestAnimationFrame);
