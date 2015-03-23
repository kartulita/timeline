(function (angular, requestAnimationFrame) {
	'use strict';

	angular.module('battlesnake.timeline')
		.factory('timelineAnimatorFactory', timelineAnimatorFactory);

	function timelineAnimatorFactory() {
		return {
			create: function (onValidate, onEvent) {
				return new TimelineAnimator(onValidate, onEvent);
			}
		};
	}

	function TimelineAnimator(onValidate, onEvent) {
		/* Constants */
		/* dx/dt = clamp(Dx * moveRate, minSpeed, maxSpeed), note: moveRate has unit /s */
		var moveRate = 5;
		/* Speed limits (pixels/s) */
		var minSpeed = 150, maxSpeed = 1200;
		/* How close we have to be to the target for scrolling to stop */
		var stopThreshold = 1;

		/* Variables */
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
			increl: increl,
			revalidate: revalidate
		};

		function reset() {
			set(0, true);
		}

		function get(immediate) {
			return immediate ? current : target;
		}

		function set(value, immediate) {
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

		/* Increase relative to view position, not target position */
		function increl(delta) {
			set(get(true) + delta, false);
		}

		function requestFrame() {
			if (requestAnimationFrame) {
				/* Workaround for iPad Safari not supporting window.performance.now() */
				var nextFrame = function (t_abs) {
					var t = t_abs - t_start_perf;
					var dt = t - t_last;
					t_last = t;
					animateFrame(dt / 1000);
				};
				requestAnimationFrame(function (t_start) {
					if (t_start_perf) {
						nextFrame(t_start);
					} else {
						t_start_perf = t_start;
						requestAnimationFrame(nextFrame);
					}
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
				t_start_perf = null;
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

})(window.angular, window.requestAnimationFrame);

