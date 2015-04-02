(function (angular, moment, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineController', timelineController);

	/*
	 * We REALLY need to move the scroll logic out to a completely separate
	 * component (virtual-list).  This controller would be so much cleaner and
	 * the virtual-list component would be handy to have in other places too.
	 */

	function timelineController($scope, $timeout, $interval, $window, $swipe, languageService, timelineLocale, timelineService, timelineAnimatorFactory) {
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
			position: timelineAnimatorFactory.create(scrollChanged, scrollEvent),
			/* X-coordinate of first item (the reference position for scrolling) */
			getOrigin: getOrigin,
			/* When origin is changed, this is updated to provide a delta */
			originOffset: 0,
			/* Reference element */
			reference: null,
			/* Center reference element (for position = zero) */
			referenceCentered: false,
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
			},
			/*  Touch events on nav buttons */
			navTouch: {
				start: navTouchStart,
				end: navTouchEnd,
				cancel: navTouchCancel,
				memo: {
					direction: 0,
					timer: null,
					start: null
				}
			},
			daysLoading: daysLoading,
			daysLoaded: daysLoaded
		};

		/* How far to scroll on wheel notch */
		var screensPerWheelDelta = 0.2;
		/* Used for "currently playing" checker */
		var currentInterval;
		/* Has the user navigated the timeline at all */
		var userHasNavigated = false;

		var earlyFailCount = 0;
		var disableLoading = false;

		this.init = initController;
		return;

		/* Util */

		function $immediate(fn) {
			$timeout(fn, 0);
		}

		/* Initialiser */

		function initController(element) {
			scope.initController = null;
			scope.view.mainContainer = element;
			scope.view.scrollContainer = scope.view.mainContainer.find('.timeline-days');
			scope.$watch('adapter', adapterChanged);
			/* Touch events */
			$swipe.bind(scope.view.mainContainer, scope.view.touch, ['touch', 'mouse']);
			$swipe.bind(element.find('.timeline-nav'), scope.view.navTouch, ['touch', 'mouse']);
			/* Scope observers */
			scope.$on('adapterChanged', function () { resetModel(); });
			scope.$on('dayLoaded', dayLoaded);
			scope.$on('dayLoadFailed', dayLoadFailed);
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

		/* Emergency bailout, prevents us hammering backend with requests if days are not loading */
		function dayLoadFailed() {
			if (scope.model.days.length < 5 && ++earlyFailCount >= 5) {
				disableLoading = true;
				scope.model.days.length = 0;
			}
		}

		/* Geometry */

		function getPageWidth() {
			return scope.view.mainContainer.innerWidth();
		}

		function getViewWidth() {
			return scope.view.scrollContainer.outerWidth(true);
		}

		/* Model */

		function makeDay(date) {
			return {
				date: date,
				loading: false,
				loaded: false,
				failed: false
			};
		}

		function resetModel(day) {
			day = (day ? day : moment()).local().startOf('day');
			/* Store reference date */
			scope.model.refDate = day;
			/* Array of dates of days to display */
			scope.model.days = [makeDay(day)];
			/* Currently active item */
			scope.model.current = null;
			/* Notify children */
			scope.$broadcast('modelReset');
			/* Re-zero the view */
			resetView();
			/* Notify child scopes of changed */
			daysChanged();
			currentChanged();
			/* Reset early fail count for error bailout */
			earlyFailCount = 0;
			disableLoading = false;
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

		/* Number of days that are loading */
		function daysLoading() {
			var days = _(scope.model.days).where({ loading: true });
			return days ? days.length : 0;
		}

		/* Number of days that have loaded */
		function daysLoaded() {
			var days = _(scope.model.days).where({ loaded: true });
			return days ? days.length : 0;
		}

		function dayLoaded(event, element) {
			/* Set day as reference if none has been acquired yet */
			if (!scope.view.reference) {
				setOriginElement(element, false, false);
			}
			/* Update currently-airing */
			updateCurrent();
			/* Update scroll position */
			updateScrollOffset();
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
			setOriginElement(el, true, true);
		}

		/* Observers */

		function daysChanged() {
			scope.$broadcast('daysChanged');
		}

		function currentChanged() {
			scope.$broadcast('currentChanged');
			scrollToCurrentItem(false);
		}

		function setCurrentItemElement(event, element) {
			var isInitial = !scope.model.currentItemElement;
			/* Let reflow happen first */
			$immediate(function () { scrollToCurrentItem(isInitial); });
			scope.model.currentItemElement = element;
		}

		/* Load more data */

		function loadPastDay() {
			var days = scope.model.days;
			if (disableLoading || days.length && days[0].failed) {
				return;
			}
			days.unshift(makeDay(days[0].date.clone().subtract(1, 'day')));
			daysChanged();
		}

		function loadFutureDay() {
			var days = scope.model.days;
			if (disableLoading || days.length && days[days.length - 1].failed) {
				return;
			}
			days.push(makeDay(days[days.length - 1].date.clone().add(1, 'day')));
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
			var origin = scope.view.getOrigin();
			/* Bounds checking */
			var min = -origin, max = viewWidth - pageWidth - origin;
			if (target > max) {
				target = max;
			}
			if (target < min) {
				target = min;
			}
			var position = {
				current: current,
				target: target
			};
			/* Store and update position */
			updateScrollOffset(position);
			/* Return valid */
			return target;
		}

		/* Update scroll offset in view, set and store position if specified */
		function updateScrollOffset(position) {
			/*
			 * We don't use angular binding/interpolation for this as it would
			 * murder animation performance due to $digest loops running in each
			 * frame.  Also, some bindings aren't updated during touch events
			 * (e.g. ngStyle).
			 */
			if (position) {
				/* Store position */
				scope.view.position.value = position;
			}
			var current = scope.view.position.value ? scope.view.position.value.current : 0;
			var offset = current + scope.view.getOrigin() + scope.view.originOffset;
			/* Set position in view */
			scope.view.scrollContainer.css({
				transform: 'translateX(%px)'.replace('%', -offset)
			});
			/* Ensure at least one day title is wholly visible in the view */
			keepAtLeastOneDayTitleInView();
			/* Load more days if needed  */
			ensureViewIsFilled();
		}

		/* Ensures that we have enough data in the view to fill it */
		function ensureViewIsFilled() {
			var pageWidth = getPageWidth();
			var viewWidth = getViewWidth();
			if (!scope.view.position.value) {
				return;
			}
			var offset = scope.view.position.value.target + scope.view.originOffset + scope.view.getOrigin();
			var loadNextThreshold = pageWidth + 300;
			/* Some limits to prevent us from flooding the backend */
			if (scope.view.reference && daysLoading() <= 2 && daysLoaded() > 0) {
				/* Force $apply for these */
				if (offset < loadNextThreshold) {
					trackDeferred(loadPastDay);
				}
				if (offset > (viewWidth - loadNextThreshold)) {
					trackDeferred(loadFutureDay);
				}
			}
			return;

			/* Prevents mass calling of the same function due to the same causes */
			function trackDeferred(fn) {
				if (fn.$deferredPending) {
					return;
				}
				fn.$deferredPending = true;
				$immediate(function () {
					try {
						fn();
					} finally {
						fn.$deferredPending = false;
					}
				});
			}
		}

		/*
		 * Used to be in day-controller, cound to scrollChanged broadcast, but
		 * this required $apply to work, wrecking animation performance.
		 */
		function keepAtLeastOneDayTitleInView() {
			var offset = scope.view.position.value.current;
			var width = getPageWidth();
			var dayElements = scope.view.mainContainer.find('.timeline-day');
			dayElements.each(function () {
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
					title.css({ transform: 'translateX(' + (-e_l ) + 'px)' });
				} else if (e_l < 0 && e_r > 0) {
					title.css({ transform: 'translateX(' + (e_w - t_w ) + 'px)' });
				} else if (e_l > 0) {
					title.css({ transform: 'translateX(0)' });
				} else {
					title.css({ transform: 'translateX(' + (e_w - t_w ) + 'px)' });
				}
			}
		}

		function scrollEvent(event) {
			/* Run outside angular-land */
		}

		/* High-level scroll methods */

		function resetView() {
			scope.view.referenceCentered = 0;
			scope.view.reference = null;
			scope.view.originOffset = 0;
			scope.view.position.reset();
			scope.view.datePicker.reset();
		}

		function prevScreen(event) {
			if (event) {
				event.preventDefault();
			}
			changeScreen(-1);
		}

		function nextScreen(event) {
			if (event) {
				event.preventDefault();
			}
			changeScreen(+1);
		}

		function wheelHandler(event, delta) {
			changeScreen(-delta * screensPerWheelDelta);
			event.stopPropagation();
			event.preventDefault();
		}

		/*
		 * Sets the origin element.  If one was previously set, originOffset is
		 * adjusted so that the scroll offset (calculated in updateScrollOffset)
		 * remains the same.  Hence we can change the origin and anchor without
		 * affecting the final scroll offset.
		 */
		function setOriginElement(element, centered, rezeroOffset) {
			/*
			 * If an origin element is already assigned, then update the delta-
			 * offset (originOffset) with the position difference between the
			 * old origin and the new one.
			 */
			var translate = !!scope.view.reference && !rezeroOffset;
			var oldOrigin, newOrigin;
			if (translate) {
				oldOrigin = getOrigin(true);
			}
			scope.view.reference = element;
			scope.view.referenceCentered = centered;
			if (rezeroOffset) {
				scope.view.originOffset = 0;
			}
			if (!element) {
				return;
			}
			if (translate) {
				newOrigin = getOrigin(true);
				scope.view.originOffset += (oldOrigin - newOrigin);
			}
			updateScrollOffset();
		}

		function getOrigin(absolute) {
			/*
			 * Could use string and el[posFn], but this should be a little
			 * faster
			 */
			var posFn = absolute ? function (el) { return el.offset(); } :
				function (el) { return el.position(); };
			var element = scope.view.reference;
			var centered = scope.view.referenceCentered;
			if (!element) {
				return 0;
			} else {
				var left = posFn(element).left;
				if (!centered) {
					return left;
				} else {
					var pageWidth = getPageWidth();
					var width = element.outerWidth();
					return left - (pageWidth - width) / 2;
				}
			}
		}

		/* Touch-and-hold support for navigation buttons */

		function navTouchStart(r, event) {
			if (scope.view.navTouch.memo) {
				navTouchEnd();
			}
			scope.view.navTouch.memo = {
				direction: angular.element(event.target).hasClass('prev') ? -1 : +1,
				timer: setInterval(navTouchUpdate, 100),
				start: new Date().getTime()
			};
			navTouchUpdate();
			if (event) {
				event.preventDefault();
			}
		}

		function navTouchEnd(r, event) {
			var memo = scope.view.navTouch.memo;
			if (!memo.timer) {
				return;
			}
			clearInterval(memo.timer);
			memo.timer = null;
			var dt = new Date().getTime() - memo.start;
			if (dt > 400) {
				changeScreen(0, true);
			}
			if (event) {
				event.preventDefault();
			}
			scope.view.navTouch.memo = null;
		}

		function navTouchCancel(r, event) {
			navTouchEnd(r, event);
		}

		function navTouchUpdate() {
			changeScreen(scope.view.navTouch.memo.direction, true);
		}

		/* Touch events for swipe/drag in the main area */

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
		function changeScreen(blocks, rel) {
			var pageWidth = getPageWidth();
			var scrollQuantum = pageWidth * 2 / 3;
			scrollBy(blocks * scrollQuantum, false, rel);
			userHasNavigated = true;
		}

		/* Scroll by pixels (positive direction = right) */
		function scrollBy(delta, immediate, rel) {
			if (rel) {
				scope.view.position.increl(delta);
			} else {
				scope.view.position.inc(delta, immediate);
			}
		}

		/* Scroll to the specified offset target */
		function scrollTo(target, immediate) {
			scope.view.position.set(target, immediate);
		}

		function seconds() {
			return new Date().getTime() / 1000;
		}

	}

})(window.angular, window.moment, window._);
