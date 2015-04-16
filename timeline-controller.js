(function (angular, moment, _, $, window) {
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

		var defaultGroupBy = 'day';

		/* l10n */
		scope.strings = languageService(timelineLocale);

		/* Public viewmodel - this object is also used by child directives */
		scope.model = {
			reset: resetModel,
			/* Grouping */
			groupBy: null,
			/* Currently playing item */
			current: null,
			/* Initial date (now / @initial-date / date chosen in date-picker) */
			initialDate: null
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

		/* View stuff */
		/* (TODO: Move scrollbox logic to separate directive) */
		scope.view = {
			reset: resetView,
			/* Animator for scroll position */
			position: timelineAnimatorFactory.create(scrollChanged, scrollEvent),
			/* User has nagivated (either scrolled or used date-picker) */
			userHasNavigated: false,
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
			/* Element corresponding to currently playing item */
			currentItemElement: null,
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
			}
		};

		/* How far to scroll on wheel notch */
		var screensPerWheelDelta = 0.2;
		/* Used for "currently playing" checker */
		var currentInterval;
		/* Current item */
		var current = null;

		/*
		 * Try to detect failed backend connection so we avoid spamming with
		 * doomed requests
		 */
		var earlyFailCount = 0;
		var disableLoading = false;

		this.init = initController;
		return;

		/* Util */

		function $immediate(fn) {
			$timeout(fn, 0);
		}

		function $delay(fn, delay) {
			var timer = null;
			return function() {
				if (timer) {
					return;
				} else {
					timer = $timeout(function () {
						timer = null;
						fn();
					}, delay);
				}
			};
		}

		function $debounce(fn, delay) {
			var timer = null;
			return function() {
				if (timer) {
					return;
				} else {
					fn();
					timer = $timeout(function () {
						timer = null;
					}, delay);
				}
			};
		}

		/* Initialiser */

		function initController(element) {
			scope.initController = null;
			scope.view.mainContainer = element;
			scope.view.scrollContainer = scope.view.mainContainer.find('.timeline-groups');
			scope.$watch('adapter', adapterChanged);
			scope.$watch('groupBy', scope.model.reset);
			/* Touch events */
			$swipe.bind(scope.view.mainContainer, scope.view.touch, ['touch', 'mouse']);
			$swipe.bind(element.find('.timeline-nav'), scope.view.navTouch, ['touch', 'mouse']);
			/* Scope observers */
			scope.$on('groupLoaded', groupLoaded);
			scope.$on('groupLoadFailed', groupLoadFailed);
			scope.$on('setCurrentItemElement', setCurrentItemElement);
			$(window).bind('resize', $debounce(windowResized, /WebKit/i.test(window.navigator.userAgent) ? 1000/60 : 1000/10));
		}

		function windowResized() {
			/* Update scroll (in case reference element is centered) */
			updateScrollOffset();
		}

		/* Adapter */
		function adapterChanged() {
			if (scope.adapter) {
				scope.api = timelineService.connect(scope.adapter);
			} else {
				scope.api = null;
			}
			scope.model.reset();
			scope.$broadcast('adapterChanged');
		}

		/*
		 * Emergency bailout, prevents us spamming requests if backend is broken
		 */
		function groupLoadFailed() {
			if (scope.model.groups.length < 5 && ++earlyFailCount >= 5) {
				disableLoading = true;
				scope.model.groups.length = 0;
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

		function ItemGroup(date) {
			this.date = date;
			this.loading = false;
			this.loaded = false;
			this.failed = false;
			if (Object.seal) {
				Object.seal(this);
			}
		}

		function resetModel(initialDate) {
			/* Grouping */
			scope.model.groupBy = scope.groupBy || defaultGroupBy;
			/* Notify children */
			scope.$broadcast('modelReset');
			/* Re-zero the view */
			scope.view.reset();
			/* Set initial date */
			scope.model.initialDate = initialDate || null;
			setInitialGroup();
		}

		/*
		 * Resets view to just show the initial group, which will trigger the
		 * loading of adjacent groups as needed to fill the view
		 */
		function setInitialGroup() {
			/*
			 * Stylesheet load check:
			 * Shouldn't be needed, but the shitty .NET system occasionally
			 * fails to provide stylesheets, preventing the groups from stacking
			 * horizontally, and thus resulting in the backend being spammed
			 * with requests for more group data
			 */
			if (scope.view.scrollContainer.outerWidth() === 0) {
				$timeout(setInitialGroup, 50);
				return;
			}
			/* Get initial group to show */
			var date = moment(scope.model.initialDate || scope.initialDate || moment())
				.clone().local().startOf(scope.model.groupBy);
			scope.model.initialDate = date;
			/* Store reference date */
			scope.model.refDate = date;
			/* Array of dates of groups to display */
			scope.model.groups = [new ItemGroup(date)];
			/* Reset current item */
			setCurrent(null);
			/* Notify child scopes of changes */
			groupsChanged();
			/* Reset early fail count for error bailout */
			earlyFailCount = 0;
			disableLoading = false;
		}

		function gotoDate(value) {
			if (!value) {
				return;
			}
			scope.model.reset(moment(value));
			scope.view.userHasNavigated = true;
		}

		/* Number of groups that are loading */
		function groupsLoading() {
			var groups = _(scope.model.groups).where({ loading: true });
			return groups ? groups.length : 0;
		}

		/* Number of groups that have loaded */
		function groupsLoaded() {
			var groups = _(scope.model.groups).where({ loaded: true });
			return groups ? groups.length : 0;
		}

		function groupLoaded(event, element) {
			/* Set group as reference if none has been acquired yet */
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
				currentInterval = $interval(updateCurrent, 5000);
				scope.$on('$destroy', function () {
					$interval.cancel(currentInterval);
					currentInterval = null;
				});
			}
			setCurrent(scope.api.getCurrent());
		}

		function setCurrent(value) {
			var old = current;
			if (old === value) {
				return;
			}
			current = value;
			scope.view.currentItemElement = null;
			if (isCurrent(old)) {
				return;
			}
			scope.$broadcast('currentChanged');
			if (!scope.view.userHasNavigated) {
				scrollToCurrentItem(false);
			}
		}

		/* Fuzzy comparison to see if item is currently showing */
		function isCurrent(item) {
			return sameItemFuzzy(item, current);
		}

		/* Do not depend on reference equality */
		function sameItemFuzzy(a, b) {
			return a === b || (a && b &&
				a.start.unix() === b.start.unix() &&
				a.id == b.id);
		}

		function scrollToCurrentItem(immediate) {
			var el = scope.view.currentItemElement;
			if (!el) {
				$timeout(function () { scrollToCurrentItem(immediate); }, 50);
				return;
			}
			setOriginElement(el, true, true);
		}

		/* Observers */

		function groupsChanged() {
			scope.$broadcast('groupsChanged');
		}

		function setCurrentItemElement(event, element) {
			var isInitial = !scope.view.currentItemElement;
			scope.view.currentItemElement = element;
			/* Let reflow happen first */
			$immediate(function () {
				if (!scope.view.userHasNavigated) {
					scrollToCurrentItem(isInitial);
				}
			});
		}

		/* Load more data */

		function loadPastGroup() {
			var groups = scope.model.groups;
			if (disableLoading || groups.length && groups[0].failed) {
				return;
			}
			groups.unshift(new ItemGroup(groups[0].date.clone().subtract(1, scope.model.groupBy)));
			groupsChanged();
		}

		function loadFutureGroup() {
			var groups = scope.model.groups;
			if (disableLoading || groups.length && groups[groups.length - 1].failed) {
				return;
			}
			groups.push(new ItemGroup(groups[groups.length - 1].date.clone().add(1, scope.model.groupBy)));
			groupsChanged();
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

		/* Called by the animator: updates view and triggers loading of more groups if needed */

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

		/* Gets the absolute scroll offset */
		function getScrollOffset() {
			var current = scope.view.position.value ? scope.view.position.value.current : 0;
			var offset = current + scope.view.getOrigin() + scope.view.originOffset;
			return offset;
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
			var offset = getScrollOffset();
			/* Ensure at least one group title is wholly visible in the view */
			keepAtLeastOneGroupTitleInView();
			/* Set position in view */
			scope.view.scrollContainer.css({
				transform: 'translateX(%px)'.replace('%', -offset)
			});
			/* Load more groups if needed  */
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
			if (scope.view.reference && groupsLoading() <= 2 && groupsLoaded() > 0) {
				/* Force $apply for these */
				if (offset < loadNextThreshold) {
					trackDeferred(loadPastGroup);
				}
				if (offset > (viewWidth - loadNextThreshold)) {
					trackDeferred(loadFutureGroup);
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

		function keepAtLeastOneGroupTitleInView() {
			var offset = getScrollOffset();
			var width = getPageWidth();
			var groupElements = scope.view.mainContainer.find('.timeline-group');
			groupElements.each(function () {
				updateTitlePosition(angular.element(this), offset, width);
			});
			return;

			function updateTitlePosition(element, offset, width) {
				var e_l = element.position().left - offset;
				var e_w = element.innerWidth();
				var e_r = e_l + e_w;
				var title = element.find('.timeline-group-title');
				var t_w = title.find(':first-child').outerWidth(true);
					
				/*     OFF-LEFT | IN VIEW | OFF-RIGHT */
				/* 1.        <--|title--> |           */
				/* 2.    <-----t|tle>     |           */
				/* 3.           | <title--|-->        */
				/* 3.           |     <tit|e----->    */
				/* 3.           |         | <title... */
				/* 4. ...title> |         |           */
				if (e_l <= 0 && e_r >= t_w) {
					/* Case 1 */
					title.css({ transform: 'translateX(' + (-e_l ) + 'px)' });
				} else if (e_l < 0 && e_r > 0) {
					/* Case 2 */
					title.css({ transform: 'translateX(' + (e_w - t_w) + 'px)' });
				} else if (e_l > 0) {
					/* Case 3 */
					title.css({ transform: 'translateX(0)' });
				} else {
					/* Case 4 */
					title.css({ transform: 'translateX(' + (e_w - t_w ) + 'px)' });
				}
			}
		}

		function scrollEvent(event) {
			/* Run outside angular-land */
		}

		/* High-level scroll methods */

		function resetView() {
			scope.view.referenceCentered = false;
			scope.view.reference = null;
			scope.view.originOffset = 0;
			scope.view.userHasNavigated = false;
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
			scope.view.userHasNavigated = true;
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
			scope.view.userHasNavigated = true;
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

})(window.angular, window.moment, window._, window.$, window);
