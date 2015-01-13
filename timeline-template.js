(function (angular) {
	'use strict';

	var timelineTemplate = [
		'<div class="widget timeline-widget"',
		'	ondragstart="return false;" ondrop="return false;"',
		'	msd-wheel="methods.wheel($event, $deltaX || $deltaY)"',
		'	ng-swipe-left="methods.next()" ng-swipe-right="methods.prev()">',
		'	<a href="#" class="timeline-nav prev" ng-click="methods.prev()"></a>',
		'	<a href="#" class="timeline-nav next" ng-click="methods.next()"></a>',
		'	<div class="timeline-days" ng-style="{ transform: \'translateX(\' + -(view.offset + view.origin) + \'px)\' }" timeline-days="day in model.days">',
		'		<div class="timeline-day" timeline-day="items in day">',
		'			<div class="timeline-day-title" ng-bind="day | timelineDate"></div>',
		'				<div class="timeline-items" timeline-items="item in items" items-per-row="2" current="model.current">',
		'					<div class="timeline-item-container" ng-class="{ current: isCurrent(item) }"',
		'						ng-swipe-left="methods.prev()" ng-swipe-right="methods.next()">',
		'						<a class="timeline-item" href="#" ng-click="methods.openItem(item)">',
		'							<img ng-src="{{item.thumbnail}}" alt="{{item.title}}" class="timeline-item-thumbnail">',
		'							<div class="timeline-item-header">',
		'								<div class="timeline-item-time"',
		'									ng-bind="item.start | timelineTime"></div>',
		'								<div class="timeline-item-title"',
		'									ng-bind="item.title"></div>',
		'							</div>',
		'						</a>',
		'					</div>',
		'				</div>',
		'			</div>',
		'		</div>',
		'	</div>',
		'</div>'
	].join('\n');

	angular.module('battlesnake.timeline')
		.constant('timelineTemplate', timelineTemplate);

})(window.angular);
